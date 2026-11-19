import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface SessionRecord {
  session_id: string;
  map_id: string;
  map_hash: string;
  campaign_id: string;
  campaign_version: number;
  wallet: string | null;
  status: "active" | "expired" | "consumed";
  created_at: number;
  expires_at: number;
}

export interface ChallengeRecord {
  challenge_id: string;
  wallet: string;
  nonce: string;
  message: string;
  created_at: number;
  expires_at: number;
  used: number; // 0 or 1
}

export interface ClaimRecord {
  ticket_id: string;
  wallet: string;
  campaign_id: string;
  version: number;
  replay_hash: string;
  xp: number;
  rp: number;
  status: "issued" | "confirmed";
  created_at: number;
  expires_at: number;
}

export function initDb(path: string = ":memory:"): DatabaseSync {
  if (path !== ":memory:") {
    try {
      mkdirSync(dirname(path), { recursive: true });
    } catch {}
  }
  const db = new DatabaseSync(path);
  
  // Set journal mode and pragmas
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      map_id TEXT NOT NULL,
      map_hash TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      campaign_version INTEGER NOT NULL,
      wallet TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenges (
      challenge_id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      nonce TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS replays (
      replay_hash TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      wallet TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS claims (
      ticket_id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      replay_hash TEXT NOT NULL,
      xp INTEGER NOT NULL,
      rp INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'issued',
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      UNIQUE(wallet, campaign_id, version)
    );
  `);

  return db;
}
