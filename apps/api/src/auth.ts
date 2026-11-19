import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { ChallengeRecord } from "./db.ts";

export function normalizeAddress(addr: string): string {
  if (!addr) return "";
  let clean = addr.trim().toLowerCase();
  if (!clean.startsWith("0x")) clean = "0x" + clean;
  return clean;
}

export function createChallenge(db: DatabaseSync, wallet: string): ChallengeRecord {
  const normalized = normalizeAddress(wallet);
  const challengeId = "chal_" + randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity
  const message = `Ripple Expedition Verification\nWallet: ${normalized}\nNonce: ${nonce}\nIssued: ${new Date(now).toISOString()}\nExpires: ${new Date(expiresAt).toISOString()}`;

  db.prepare(`
    INSERT INTO challenges (challenge_id, wallet, nonce, message, created_at, expires_at, used)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(challengeId, normalized, nonce, message, now, expiresAt);

  return {
    challenge_id: challengeId,
    wallet: normalized,
    nonce,
    message,
    created_at: now,
    expires_at: expiresAt,
    used: 0,
  };
}

export function verifyChallenge(
  db: DatabaseSync,
  challengeId: string,
  signature: string,
): { ok: boolean; wallet?: string; error?: string } {
  const row = db.prepare("SELECT * FROM challenges WHERE challenge_id = ?").get(challengeId) as (ChallengeRecord | undefined);
  if (!row) {
    return { ok: false, error: "Challenge not found" };
  }
  if (row.used) {
    return { ok: false, error: "Challenge already used" };
  }
  if (Date.now() > row.expires_at) {
    return { ok: false, error: "Challenge expired" };
  }
  if (!signature || typeof signature !== "string" || signature.length < 10) {
    return { ok: false, error: "Invalid signature format" };
  }

  // Mark challenge as used
  db.prepare("UPDATE challenges SET used = 1 WHERE challenge_id = ?").run(challengeId);

  return { ok: true, wallet: row.wallet };
}
