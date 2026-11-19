import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { initDb } from "./db.ts";
import { createChallenge, verifyChallenge } from "./auth.ts";
import { verifyReplay } from "./verifier.ts";
import { map, sha256 } from "../../../packages/game-core/src/content.ts";

export function createApiServer(db = initDb()) {
  const mapHash = sha256(map);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const requestId = "req_" + randomBytes(8).toString("hex");

    // Standard JSON sender with CORS headers
    const sendJson = (status: number, data: unknown) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "X-Request-Id": requestId,
      });
      res.end(JSON.stringify(data));
    };

    const sendError = (status: number, code: string, message: string) => {
      sendJson(status, {
        error: {
          code,
          message,
          request_id: requestId,
        },
      });
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
    const pathname = url.pathname;

    // Helper to read JSON body
    const readBody = async (): Promise<any> => {
      return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => {
          body += chunk;
          if (body.length > 512 * 1024) {
            reject(new Error("Body too large"));
          }
        });
        req.on("end", () => {
          if (!body) return resolve({});
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("Invalid JSON"));
          }
        });
        req.on("error", reject);
      });
    };

    try {
      // 1. GET /v1/campaigns
      if (req.method === "GET" && pathname === "/v1/campaigns") {
        return sendJson(200, {
          campaigns: [
            {
              id: "operation-komodo",
              version: 1,
              title: "Operation Komodo",
              map_id: "komodo_v1",
              map_hash: mapHash,
              target_rp: 100,
              sponsor_policy: { amount: 25, unit: "DEMO_CREDIT" },
            },
          ],
        });
      }

      // 2. GET /v1/campaigns/:id/:version
      const campaignMatch = pathname.match(/^\/v1\/campaigns\/([^/]+)\/(\d+)$/);
      if (req.method === "GET" && campaignMatch) {
        const [, id, ver] = campaignMatch;
        if (id === "operation-komodo" && ver === "1") {
          return sendJson(200, {
            id: "operation-komodo",
            version: 1,
            title: "Operation Komodo",
            map_id: "komodo_v1",
            map_hash: mapHash,
            target_rp: 100,
            sponsor_policy: { amount: 25, unit: "DEMO_CREDIT" },
          });
        }
        return sendError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found");
      }

      // 3. POST /v1/sessions
      if (req.method === "POST" && pathname === "/v1/sessions") {
        const body = await readBody();
        const campaignId = body.campaign_id || "operation-komodo";
        const version = Number(body.version || 1);

        if (campaignId !== "operation-komodo" || version !== 1) {
          return sendError(400, "INVALID_CAMPAIGN", "Unsupported campaign version");
        }

        const sessionId = "sess_" + randomBytes(16).toString("hex");
        const now = Date.now();
        const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

        db.prepare(`
          INSERT INTO sessions (session_id, map_id, map_hash, campaign_id, campaign_version, wallet, status, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
        `).run(sessionId, "komodo_v1", mapHash, campaignId, version, body.wallet ?? null, now, expiresAt);

        return sendJson(200, {
          session_id: sessionId,
          map_id: "komodo_v1",
          map_hash: mapHash,
          expires_at: expiresAt,
        });
      }

      // 4. POST /v1/auth/challenge
      if (req.method === "POST" && pathname === "/v1/auth/challenge") {
        const body = await readBody();
        if (!body.wallet) {
          return sendError(400, "MISSING_WALLET", "Wallet address required");
        }
        const challenge = createChallenge(db, body.wallet);
        return sendJson(200, challenge);
      }

      // 5. POST /v1/auth/verify
      if (req.method === "POST" && pathname === "/v1/auth/verify") {
        const body = await readBody();
        if (!body.challenge_id || !body.signature) {
          return sendError(400, "INVALID_AUTH_PAYLOAD", "challenge_id and signature required");
        }
        const verification = verifyChallenge(db, body.challenge_id, body.signature);
        if (!verification.ok) {
          return sendError(401, "AUTH_FAILED", verification.error || "Authentication failed");
        }
        return sendJson(200, { ok: true, wallet: verification.wallet });
      }

      // 6. POST /v1/replays/verify
      if (req.method === "POST" && pathname === "/v1/replays/verify") {
        const body = await readBody();
        const replay = body.replay || body;
        const wallet = body.wallet || replay.wallet;

        const outcome = verifyReplay(db, replay, wallet);
        if (!outcome.ok) {
          return sendError(outcome.status, outcome.code, outcome.message);
        }

        return sendJson(200, {
          result: outcome.result,
          idempotent: outcome.idempotent,
        });
      }

      // 7. GET /v1/claims/:id
      const claimMatch = pathname.match(/^\/v1\/claims\/([^/]+)$/);
      if (req.method === "GET" && claimMatch) {
        const [, ticketId] = claimMatch;
        const claim = db.prepare("SELECT * FROM claims WHERE ticket_id = ?").get(ticketId);
        if (!claim) {
          return sendError(404, "CLAIM_NOT_FOUND", "Claim ticket not found");
        }
        return sendJson(200, claim);
      }

      // 8. GET /v1/impact/:id
      const impactMatch = pathname.match(/^\/v1\/impact\/([^/]+)$/);
      if (req.method === "GET" && impactMatch) {
        const [, campaignId] = impactMatch;
        return sendJson(200, {
          campaign_id: campaignId,
          released_amount: 25,
          unit: "DEMO_CREDIT",
          physical_outcome: "unverified_demo",
          verified_completions: 1,
        });
      }

      return sendError(404, "NOT_FOUND", `Endpoint ${pathname} not found`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Internal server error";
      return sendError(500, "INTERNAL_ERROR", errMsg);
    }
  });

  return server;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  const port = Number(process.env.PORT || 4188);
  const server = createApiServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`Ripple API service running on http://127.0.0.1:${port}`);
  });
}
