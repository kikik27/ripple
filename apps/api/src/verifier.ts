import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  initialState,
  reduce,
  InvalidAction,
  type Action,
  type State,
} from "../../../packages/game-core/src/game.ts";
import {
  validateReplay,
  sha256,
  map,
} from "../../../packages/game-core/src/content.ts";
import type { SessionRecord, ClaimRecord } from "./db.ts";
import { normalizeAddress } from "./auth.ts";

export interface ReplayInput {
  session_id: string;
  campaign_id: string;
  version: number;
  map_id: string;
  actions: Action[];
}

export interface VerificationSuccess {
  ok: true;
  idempotent: boolean;
  result: {
    ticket_id: string;
    wallet: string;
    campaign_id: string;
    version: number;
    replay_hash: string;
    xp: number;
    rp: number;
    status: string;
    expires_at: number;
  };
}

export interface VerificationFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
}

export type VerificationResponse = VerificationSuccess | VerificationFailure;

export function verifyReplay(
  db: DatabaseSync,
  replay: unknown,
  walletInput: string,
): VerificationResponse {
  const wallet = normalizeAddress(walletInput);
  if (!wallet) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_WALLET",
      message: "Valid wallet address is required for verification",
    };
  }

  // 1. Schema check
  const schemaErrors = validateReplay(replay);
  if (schemaErrors.length > 0) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_SCHEMA",
      message: `Replay schema violation: ${schemaErrors.join(", ")}`,
    };
  }

  const typedReplay = replay as ReplayInput;

  // 2. Map & Campaign validation
  if (typedReplay.map_id !== "komodo_v1" || typedReplay.version !== 1) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_MAP_OR_VERSION",
      message: "Unsupported map or version",
    };
  }

  // 3. Session validation
  const session = db
    .prepare("SELECT * FROM sessions WHERE session_id = ?")
    .get(typedReplay.session_id) as (SessionRecord | undefined);

  if (!session) {
    return {
      ok: false,
      status: 404,
      code: "SESSION_NOT_FOUND",
      message: "Expedition session not found",
    };
  }

  // 4. Idempotency check: Has this wallet already claimed this campaign version? (T09)
  const existingClaim = db
    .prepare(
      "SELECT * FROM claims WHERE wallet = ? AND campaign_id = ? AND version = ?",
    )
    .get(wallet, typedReplay.campaign_id, typedReplay.version) as (
    | ClaimRecord
    | undefined
  );

  if (existingClaim) {
    return {
      ok: true,
      idempotent: true,
      result: {
        ticket_id: existingClaim.ticket_id,
        wallet: existingClaim.wallet,
        campaign_id: existingClaim.campaign_id,
        version: existingClaim.version,
        replay_hash: existingClaim.replay_hash,
        xp: existingClaim.xp,
        rp: existingClaim.rp,
        status: existingClaim.status,
        expires_at: existingClaim.expires_at,
      },
    };
  }

  if (session.status === "consumed") {
    return {
      ok: false,
      status: 409,
      code: "SESSION_ALREADY_CONSUMED",
      message: "Session has already been consumed by a replay",
    };
  }

  if (Date.now() > session.expires_at) {
    return {
      ok: false,
      status: 409,
      code: "SESSION_EXPIRED",
      message: "Expedition session has expired",
    };
  }

  if (
    session.map_id !== typedReplay.map_id ||
    session.campaign_id !== typedReplay.campaign_id ||
    session.campaign_version !== typedReplay.version
  ) {
    return {
      ok: false,
      status: 400,
      code: "SESSION_MISMATCH",
      message: "Session map or campaign does not match replay",
    };
  }

  // 5. Deterministic simulation using pure reducer
  let state: State = initialState();
  for (let i = 0; i < typedReplay.actions.length; i++) {
    const action = typedReplay.actions[i];
    try {
      state = reduce(state, action);
    } catch (err: unknown) {
      const errMsg = err instanceof InvalidAction ? err.message : "Invalid action";
      return {
        ok: false,
        status: 422,
        code: "INVALID_ACTION",
        message: `Action ${i} (${action.type}) failed: ${errMsg}`,
      };
    }
  }

  // 6. Verify expedition completion criteria
  if (!state.finished) {
    return {
      ok: false,
      status: 422,
      code: "UNFINISHED_REPLAY",
      message: "Replay actions did not complete the expedition goals",
    };
  }

  if (!state.waterConnected) {
    return {
      ok: false,
      status: 422,
      code: "WATER_NOT_CONNECTED",
      message: "Water was not successfully connected to homes",
    };
  }

  // 7. Success: calculate canonical hash and issue ticket
  const replayHash = sha256(typedReplay);
  const ticketId = "ticket_" + randomBytes(16).toString("hex");
  const now = Date.now();
  const ticketExpiry = now + 24 * 60 * 60 * 1000; // 24 hours ticket validity

  // Mark session consumed and record claim atomically
  db.exec("BEGIN TRANSACTION;");
  try {
    db.prepare("UPDATE sessions SET status = 'consumed' WHERE session_id = ?").run(
      typedReplay.session_id,
    );

    db.prepare(`
      INSERT INTO replays (replay_hash, session_id, campaign_id, version, wallet, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      replayHash,
      typedReplay.session_id,
      typedReplay.campaign_id,
      typedReplay.version,
      wallet,
      now,
    );

    db.prepare(`
      INSERT INTO claims (ticket_id, wallet, campaign_id, version, replay_hash, xp, rp, status, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?)
    `).run(
      ticketId,
      wallet,
      typedReplay.campaign_id,
      typedReplay.version,
      replayHash,
      100, // 100 XP fixed
      100, // 100 RP fixed
      now,
      ticketExpiry,
    );

    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }

  return {
    ok: true,
    idempotent: false,
    result: {
      ticket_id: ticketId,
      wallet,
      campaign_id: typedReplay.campaign_id,
      version: typedReplay.version,
      replay_hash: replayHash,
      xp: 100,
      rp: 100,
      status: "issued",
      expires_at: ticketExpiry,
    },
  };
}
