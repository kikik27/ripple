import { createHash } from "node:crypto";
import { type DatabaseSync } from "node:sqlite";

export interface AuroraSourceInput {
  url: string;
  retrieval_timestamp: number;
  excerpt: string;
  is_historical: boolean;
  is_demo: boolean;
}

export interface AuroraDraftContent {
  title: string;
  summary: string;
  template_id: string;
  map_id: string;
  objectives: string[];
  fiction_notice: string;
}

export interface CampaignDraft {
  draft_id: string;
  version: number;
  status: "draft" | "needs_review" | "approved" | "published" | "archived";
  content: AuroraDraftContent;
  source: AuroraSourceInput;
  config_hash: string;
  created_at: number;
  approved_at?: number;
  published_at?: number;
  rejection_reason?: string;
}

const ALLOWED_TEMPLATES = ["clean_water_v1"];
const ALLOWED_MAPS = ["komodo_v1"];

const INJECTION_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /you are now/i,
  /system prompt/i,
  /transfer (all )?funds/i,
  /send (crypto|sui|eth|btc|tokens)/i,
  /wallet private key/i,
  /0x[a-fA-F0-9]{40,64}/, // injected wallet addresses
  /<script>/i,
  /drop table/i,
];

export function computeConfigHash(content: AuroraDraftContent): string {
  const canonical = JSON.stringify({
    fiction_notice: content.fiction_notice,
    map_id: content.map_id,
    objectives: content.objectives,
    summary: content.summary,
    template_id: content.template_id,
    title: content.title,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export class AuroraPipeline {
  private db?: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db;
    if (this.db) {
      this.initTable();
    }
  }

  private initTable() {
    this.db?.exec(`
      CREATE TABLE IF NOT EXISTS campaign_drafts (
        draft_id TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        status TEXT NOT NULL,
        content_json TEXT NOT NULL,
        source_json TEXT NOT NULL,
        config_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        approved_at INTEGER,
        published_at INTEGER,
        rejection_reason TEXT
      );
    `);
  }

  /**
   * Process source excerpt, sanitize against injection, and generate validated draft.
   */
  public generateDraft(input: AuroraSourceInput): CampaignDraft {
    const draftId = "draft_" + Math.random().toString(36).slice(2, 10);
    const now = Date.now();

    // Check for prompt injection or malicious text in excerpt
    const injection = INJECTION_PATTERNS.find(pattern => pattern.test(input.excerpt));
    if (injection) {
      const draft: CampaignDraft = {
        draft_id: draftId,
        version: 1,
        status: "needs_review",
        content: {
          title: "Flagged Campaign Excerpt",
          summary: "Input excerpt contained disallowed phrases or potential prompt injection.",
          template_id: "clean_water_v1",
          map_id: "komodo_v1",
          objectives: [],
          fiction_notice: "FLAGGED: Source failed safety checks. Requires manual review.",
        },
        source: input,
        config_hash: "",
        created_at: now,
        rejection_reason: "SOURCE_INJECTION_DETECTED",
      };
      draft.config_hash = computeConfigHash(draft.content);
      this.saveDraft(draft);
      return draft;
    }

    // Generate compliant draft from allowlisted templates
    const content: AuroraDraftContent = {
      title: "Operation Komodo: Island Well Restoration",
      summary: "Restore fresh drinking water access to island households cut off by flood damage.",
      template_id: "clean_water_v1",
      map_id: "komodo_v1",
      objectives: [
        "Gather raw materials: 2 wood, 2 stone, 1 metal",
        "Craft well kit at the depot workshop",
        "Repair the river crossing bridge",
        "Build the community well and connect pipe network",
      ],
      fiction_notice: "Fictional campaign based on historical community water initiatives. DEMO_CREDIT has no monetary value.",
    };

    // Strict schema and allowlist validation
    const isValidTemplate = ALLOWED_TEMPLATES.includes(content.template_id);
    const isValidMap = ALLOWED_MAPS.includes(content.map_id);
    const hasRequiredFields =
      content.title &&
      content.summary &&
      content.objectives.length > 0 &&
      content.fiction_notice;

    const status = (isValidTemplate && isValidMap && hasRequiredFields)
      ? "draft"
      : "needs_review";

    const configHash = computeConfigHash(content);

    const draft: CampaignDraft = {
      draft_id: draftId,
      version: 1,
      status,
      content,
      source: input,
      config_hash: configHash,
      created_at: now,
    };

    this.saveDraft(draft);
    return draft;
  }

  /**
   * Operator reviews and approves campaign draft for publication.
   * Approval strictly locks the exact SHA-256 config hash.
   */
  public approveDraft(draftId: string, expectedHash: string): { ok: boolean; draft?: CampaignDraft; error?: string } {
    const draft = this.getDraft(draftId);
    if (!draft) {
      return { ok: false, error: "DRAFT_NOT_FOUND" };
    }

    if (draft.status === "needs_review" && draft.rejection_reason === "SOURCE_INJECTION_DETECTED") {
      return { ok: false, error: "CANNOT_APPROVE_INJECTION" };
    }

    if (draft.config_hash !== expectedHash) {
      return { ok: false, error: "CONFIG_HASH_MISMATCH" };
    }

    draft.status = "approved";
    draft.approved_at = Date.now();
    this.saveDraft(draft);

    return { ok: true, draft };
  }

  /**
   * Publish approved campaign to the registry.
   */
  public publishCampaign(draftId: string): { ok: boolean; draft?: CampaignDraft; error?: string } {
    const draft = this.getDraft(draftId);
    if (!draft) {
      return { ok: false, error: "DRAFT_NOT_FOUND" };
    }

    if (draft.status !== "approved") {
      return { ok: false, error: "DRAFT_NOT_APPROVED" };
    }

    draft.status = "published";
    draft.published_at = Date.now();
    this.saveDraft(draft);

    return { ok: true, draft };
  }

  private saveDraft(draft: CampaignDraft) {
    if (!this.db) return;
    this.db.prepare(`
      INSERT OR REPLACE INTO campaign_drafts (
        draft_id, version, status, content_json, source_json, config_hash, created_at, approved_at, published_at, rejection_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      draft.draft_id,
      draft.version,
      draft.status,
      JSON.stringify(draft.content),
      JSON.stringify(draft.source),
      draft.config_hash,
      draft.created_at,
      draft.approved_at ?? null,
      draft.published_at ?? null,
      draft.rejection_reason ?? null
    );
  }

  public getDraft(draftId: string): CampaignDraft | null {
    if (!this.db) return null;
    const row = this.db.prepare("SELECT * FROM campaign_drafts WHERE draft_id = ?").get(draftId) as any;
    if (!row) return null;

    return {
      draft_id: row.draft_id,
      version: row.version,
      status: row.status,
      content: JSON.parse(row.content_json),
      source: JSON.parse(row.source_json),
      config_hash: row.config_hash,
      created_at: row.created_at,
      approved_at: row.approved_at ?? undefined,
      published_at: row.published_at ?? undefined,
      rejection_reason: row.rejection_reason ?? undefined,
    };
  }
}
