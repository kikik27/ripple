import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { initDb } from "./db.ts";
import { createChallenge, verifyChallenge } from "./auth.ts";
import { verifyReplay, type ReplayInput } from "./verifier.ts";
import { sha256, map } from "../../../packages/game-core/src/content.ts";

// Load golden fixtures
const bridgeReplay = JSON.parse(
  readFileSync("fixtures/replay-example.json", "utf8"),
) as ReplayInput;
const detourReplay = JSON.parse(
  readFileSync("fixtures/replay-detour.json", "utf8"),
) as ReplayInput;

test("T08: Server replay verification - valid, tampered, unfinished and expired", () => {
  const db = initDb(":memory:");
  const wallet = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const mapHash = sha256(map);

  // 1. Create a valid session
  const sessionId = bridgeReplay.session_id; // "fixture-bridge"
  const now = Date.now();
  db.prepare(`
    INSERT INTO sessions (session_id, map_id, map_hash, campaign_id, campaign_version, wallet, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(sessionId, "komodo_v1", mapHash, "operation-komodo", 1, wallet, now, now + 86400000);

  // 2. Valid replay must succeed and issue a claim ticket with 100 XP / 100 RP
  const validResult = verifyReplay(db, bridgeReplay, wallet);
  assert.equal(validResult.ok, true, "Valid replay must succeed");
  if (validResult.ok) {
    assert.equal(validResult.idempotent, false);
    assert.equal(validResult.result.xp, 100);
    assert.equal(validResult.result.rp, 100);
    assert.equal(validResult.result.status, "issued");
    assert.match(validResult.result.ticket_id, /^ticket_/);
    assert.equal(validResult.result.wallet, wallet);
  }

  // 3. Tampered replay (illegal move through river without bridge) must reject with 422
  const tamperedSession = "sess_tampered_1";
  db.prepare(`
    INSERT INTO sessions (session_id, map_id, map_hash, campaign_id, campaign_version, wallet, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(tamperedSession, "komodo_v1", mapHash, "operation-komodo", 1, wallet, now, now + 86400000);

  const tamperedActions = [...bridgeReplay.actions];
  // Change action 5 from gather to illegal bridge cross
  tamperedActions[4] = { type: "REPAIR_BRIDGE" }; // without wood, fails
  const tamperedReplay: ReplayInput = {
    ...bridgeReplay,
    session_id: tamperedSession,
    actions: tamperedActions,
  };

  const tamperedResult = verifyReplay(db, tamperedReplay, "0xbeef");
  assert.equal(tamperedResult.ok, false);
  if (!tamperedResult.ok) {
    assert.equal(tamperedResult.status, 422);
    assert.equal(tamperedResult.code, "INVALID_ACTION");
  }

  // 4. Unfinished replay (stopped before extraction) must reject with 422
  const unfinishedSession = "sess_unfinished_1";
  db.prepare(`
    INSERT INTO sessions (session_id, map_id, map_hash, campaign_id, campaign_version, wallet, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(unfinishedSession, "komodo_v1", mapHash, "operation-komodo", 1, wallet, now, now + 86400000);

  const unfinishedReplay: ReplayInput = {
    ...bridgeReplay,
    session_id: unfinishedSession,
    actions: bridgeReplay.actions.slice(0, 30), // cut off halfway
  };

  const unfinishedResult = verifyReplay(db, unfinishedReplay, "0xcafe");
  assert.equal(unfinishedResult.ok, false);
  if (!unfinishedResult.ok) {
    assert.equal(unfinishedResult.status, 422);
    assert.equal(unfinishedResult.code, "UNFINISHED_REPLAY");
  }

  // 5. Expired session must reject with 409
  const expiredSession = "sess_expired_1";
  db.prepare(`
    INSERT INTO sessions (session_id, map_id, map_hash, campaign_id, campaign_version, wallet, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(expiredSession, "komodo_v1", mapHash, "operation-komodo", 1, wallet, now - 100000, now - 1000);

  const expiredReplay: ReplayInput = {
    ...bridgeReplay,
    session_id: expiredSession,
  };

  const expiredResult = verifyReplay(db, expiredReplay, "0xdead");
  assert.equal(expiredResult.ok, false);
  if (!expiredResult.ok) {
    assert.equal(expiredResult.status, 409);
    assert.equal(expiredResult.code, "SESSION_EXPIRED");
  }

  // 6. Unknown session must reject with 404
  const unknownReplay: ReplayInput = {
    ...bridgeReplay,
    session_id: "nonexistent_session",
  };
  const unknownResult = verifyReplay(db, unknownReplay, "0xabcd");
  assert.equal(unknownResult.ok, false);
  if (!unknownResult.ok) {
    assert.equal(unknownResult.status, 404);
    assert.equal(unknownResult.code, "SESSION_NOT_FOUND");
  }
});

test("T09: Idempotency, duplicate replay/wallet and consumed session guard", () => {
  const db = initDb(":memory:");
  const wallet = "0x1111222233334444555566667777888899990000111122223333444455556666";
  const mapHash = sha256(map);
  const now = Date.now();

  // Create session for detour route
  const sessionId = detourReplay.session_id; // "fixture-detour"
  db.prepare(`
    INSERT INTO sessions (session_id, map_id, map_hash, campaign_id, campaign_version, wallet, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(sessionId, "komodo_v1", mapHash, "operation-komodo", 1, wallet, now, now + 86400000);

  // First submission: should succeed and issue ticket
  const first = verifyReplay(db, detourReplay, wallet);
  assert.equal(first.ok, true);
  if (!first.ok) return;

  assert.equal(first.idempotent, false);
  const ticketId = first.result.ticket_id;

  // Second submission: same replay and same wallet -> must return exact same ticket and result (idempotent, no double reward)
  const second = verifyReplay(db, detourReplay, wallet);
  assert.equal(second.ok, true);
  if (!second.ok) return;

  assert.equal(second.idempotent, true, "Second submission must be marked idempotent");
  assert.equal(second.result.ticket_id, ticketId, "Must return the same ticket_id");
  assert.equal(second.result.xp, 100);
  assert.equal(second.result.rp, 100);

  // Attempt to submit a new replay with a consumed session -> must reject with 409
  const anotherWallet = "0x9999888877776666555544443333222211110000999988887777666655554444";
  const reuseResult = verifyReplay(db, detourReplay, anotherWallet);
  assert.equal(reuseResult.ok, false);
  if (!reuseResult.ok) {
    assert.equal(reuseResult.status, 409);
    assert.equal(reuseResult.code, "SESSION_ALREADY_CONSUMED");
  }
});

test("Auth: Nonce challenge and verification", () => {
  const db = initDb(":memory:");
  const wallet = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";

  const challenge = createChallenge(db, wallet);
  assert.equal(challenge.wallet, wallet);
  assert.ok(challenge.nonce.length >= 32);
  assert.ok(challenge.challenge_id.startsWith("chal_"));

  // Verify valid challenge
  const valid = verifyChallenge(db, challenge.challenge_id, "mock_signature_from_sui_wallet_123456");
  assert.equal(valid.ok, true);
  assert.equal(valid.wallet, wallet);

  // Attempting to reuse the same challenge must fail
  const reuse = verifyChallenge(db, challenge.challenge_id, "mock_signature_from_sui_wallet_123456");
  assert.equal(reuse.ok, false);
  assert.equal(reuse.error, "Challenge already used");
});

test("HTTP Server: End-to-end API endpoints", async () => {
  const { createApiServer } = await import("./server.ts");
  const server = createApiServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET /v1/campaigns
    const campRes = await fetch(`${baseUrl}/v1/campaigns`);
    assert.equal(campRes.status, 200);
    const campData = (await campRes.json()) as any;
    assert.equal(campData.campaigns[0].id, "operation-komodo");

    // 2. POST /v1/sessions
    const sessRes = await fetch(`${baseUrl}/v1/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id: "operation-komodo", version: 1 }),
    });
    assert.equal(sessRes.status, 200);
    const sessData = (await sessRes.json()) as any;
    assert.ok(sessData.session_id.startsWith("sess_"));

    // 3. POST /v1/auth/challenge
    const chalRes = await fetch(`${baseUrl}/v1/auth/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: "0x1234" }),
    });
    assert.equal(chalRes.status, 200);
    const chalData = (await chalRes.json()) as any;
    assert.ok(chalData.nonce);

    // 4. POST /v1/auth/verify
    const verRes = await fetch(`${baseUrl}/v1/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge_id: chalData.challenge_id, signature: "mock_signature_for_test" }),
    });
    assert.equal(verRes.status, 200);

    // 5. POST /v1/replays/verify with bridge replay using the new session
    const replayToSubmit = {
      ...bridgeReplay,
      session_id: sessData.session_id,
    };
    const repRes = await fetch(`${baseUrl}/v1/replays/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replay: replayToSubmit, wallet: "0x1234" }),
    });
    assert.equal(repRes.status, 200);
    const repData = (await repRes.json()) as any;
    assert.equal(repData.result.xp, 100);
    assert.equal(repData.result.rp, 100);

    // 6. GET /v1/claims/:ticketId
    const claimRes = await fetch(`${baseUrl}/v1/claims/${repData.result.ticket_id}`);
    assert.equal(claimRes.status, 200);

    // 7. GET /v1/impact/:id
    const impactRes = await fetch(`${baseUrl}/v1/impact/operation-komodo`);
    assert.equal(impactRes.status, 200);
    const impactData = (await impactRes.json()) as any;
    assert.equal(impactData.released_amount, 25);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
