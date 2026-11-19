import { randomBytes } from "node:crypto";

export interface ChainConfig {
  network: "testnet" | "localnet";
  packageId: string;
  adminCapId: string;
  verifierCapId: string;
  playerRegistryId: string;
  campaignId: string;
  demoRecipient: string;
  rpcUrl?: string;
}

export const DEFAULT_CHAIN_CONFIG: ChainConfig = {
  network: "testnet",
  packageId: "0x" + "1".repeat(64),
  adminCapId: "0x" + "2".repeat(64),
  verifierCapId: "0x" + "3".repeat(64),
  playerRegistryId: "0x" + "4".repeat(64),
  campaignId: "0x" + "5".repeat(64),
  demoRecipient: "0xca5f096738924192b1a0398f80459d2a6ffb923a1a0129bcbe8938fa2167d491",
  rpcUrl: "https://fullnode.testnet.sui.io:443",
};

export interface OnChainEvent {
  type: string;
  data: Record<string, unknown>;
  txDigest: string;
  timestampMs: number;
}

/**
 * Builds PTB (Programmable Transaction Block) call descriptors for Move contracts
 */
export class ChainAdapter {
  private config: ChainConfig;

  constructor(config: ChainConfig = DEFAULT_CHAIN_CONFIG) {
    this.config = config;
  }

  public getPackageId(): string {
    return this.config.packageId;
  }

  public getPlayerRegistryId(): string {
    return this.config.playerRegistryId;
  }

  public getCampaignId(): string {
    return this.config.campaignId;
  }

  public getDemoRecipient(): string {
    return this.config.demoRecipient;
  }

  /**
   * Build transaction descriptor for passport::register
   */
  public buildRegisterPassportTx(sender: string) {
    return {
      kind: "moveCall",
      target: `${this.config.packageId}::passport::register`,
      arguments: [this.config.playerRegistryId],
      sender,
    };
  }

  /**
   * Build transaction descriptor for claim::issue
   */
  public buildIssueTicketTx(wallet: string, replayHash: string, expiresAtMs: number) {
    return {
      kind: "moveCall",
      target: `${this.config.packageId}::claim::issue`,
      arguments: [
        this.config.verifierCapId,
        this.config.campaignId,
        wallet,
        Array.from(Buffer.from(replayHash, "hex")),
        expiresAtMs,
        "0x6", // Shared clock object
      ],
    };
  }

  /**
   * Build transaction descriptor for claim::claim
   */
  public buildClaimTx(sender: string, ticketId: string, passportId: string) {
    return {
      kind: "moveCall",
      target: `${this.config.packageId}::claim::claim`,
      arguments: [
        ticketId,
        passportId,
        this.config.campaignId,
        "0x6", // Shared clock object
      ],
      sender,
    };
  }

  /**
   * Build transaction descriptor for impact::release_milestone
   */
  public buildReleaseMilestoneTx(poolId: string) {
    return {
      kind: "moveCall",
      target: `${this.config.packageId}::impact::release_milestone`,
      arguments: [
        this.config.adminCapId,
        poolId,
        this.config.campaignId,
        "0x6", // Shared clock object
      ],
    };
  }

  /**
   * Create simulated or verified testnet transaction receipt
   */
  public createReceipt(txType: string, details: Record<string, unknown>) {
    const digest = "tx_" + randomBytes(16).toString("hex");
    return {
      digest,
      network: this.config.network,
      type: txType,
      confirmed: true,
      timestamp: Date.now(),
      details,
      explorerUrl: `https://suiscan.xyz/testnet/tx/${digest}`,
    };
  }
}
