/**
 * Pure TypeScript Sui Wallet Standard & Injected Provider Manager.
 * Complies with the official Wallet Standard (wallet-standard:register-wallet)
 * and direct browser extension interfaces (window.suiWallet, Nightly, Surf, etc.)
 * with zero external npm dependencies.
 */

export interface WalletAccount {
  address: string;
  publicKey?: Uint8Array;
  chains?: string[];
  features?: string[];
}

export interface StandardWallet {
  name: string;
  icon?: string;
  version?: string;
  accounts: readonly WalletAccount[];
  chains?: readonly string[];
  features: {
    "standard:connect"?: {
      connect: () => Promise<{ accounts: readonly WalletAccount[] }>;
    };
    "standard:disconnect"?: {
      disconnect: () => Promise<void>;
    };
    "standard:events"?: {
      on: (event: string, listener: (...args: any[]) => void) => () => void;
    };
    "sui:signPersonalMessage"?: {
      signPersonalMessage: (input: { message: Uint8Array; account: WalletAccount }) => Promise<{ bytes: string; signature: string }>;
    };
    "sui:signAndExecuteTransactionBlock"?: {
      signAndExecuteTransactionBlock: (input: any) => Promise<any>;
    };
    [key: string]: any;
  };
}

export interface WalletInfo {
  name: string;
  icon?: string;
  isStandard: boolean;
  rawWallet?: StandardWallet;
}

type WalletListener = (wallet: { address: string | null; name: string | null; status: "connected" | "disconnected" | "connecting" }) => void;

class SuiWalletManager {
  private standardWallets: Map<string, StandardWallet> = new Map();
  private activeWalletName: string | null = null;
  private activeAddress: string | null = null;
  private status: "connected" | "disconnected" | "connecting" = "disconnected";
  private listeners: Set<WalletListener> = new Set();
  private initialized = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.initDiscovery();
    }
  }

  private initDiscovery() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Listen for standard wallet registrations
    window.addEventListener("wallet-standard:register-wallet", (event: any) => {
      const register = event?.detail;
      if (typeof register === "function") {
        register((wallet: StandardWallet) => {
          if (wallet && wallet.name) {
            this.standardWallets.set(wallet.name, wallet);
            this.notify();
          }
        });
      }
    });

    // 2. Announce app ready to prompt installed wallet extensions to register
    window.dispatchEvent(new CustomEvent("wallet-standard:app-ready"));

    // 3. Restore cached connection if permitted
    const saved = localStorage.getItem("ripple.sui.wallet.address");
    const savedName = localStorage.getItem("ripple.sui.wallet.name");
    if (saved) {
      this.activeAddress = saved;
      this.activeWalletName = savedName || "Sui Wallet";
      this.status = "connected";
    }
  }

  public getAvailableWallets(): WalletInfo[] {
    const list: WalletInfo[] = [];

    // From Wallet Standard
    for (const [name, raw] of this.standardWallets.entries()) {
      list.push({
        name,
        icon: raw.icon,
        isStandard: true,
        rawWallet: raw,
      });
    }

    // Direct injected check (e.g. window.suiWallet)
    if (typeof window !== "undefined") {
      const win = window as any;
      if (win.suiWallet && !this.standardWallets.has("Sui Wallet")) {
        list.push({
          name: "Sui Wallet",
          icon: "/assets/branding/ripple_emblem_1024.png",
          isStandard: false,
        });
      }
      if (win.nightly?.sui && !this.standardWallets.has("Nightly")) {
        list.push({
          name: "Nightly",
          isStandard: false,
        });
      }
    }

    return list;
  }

  public hasInstalledWallet(): boolean {
    return this.getAvailableWallets().length > 0;
  }

  public async connect(preferredName?: string): Promise<string> {
    this.status = "connecting";
    this.notify();

    try {
      // 1. Try Wallet Standard first
      const wallets = this.getAvailableWallets();
      let target = preferredName ? wallets.find(w => w.name.toLowerCase() === preferredName.toLowerCase()) : wallets[0];

      if (target?.isStandard && target.rawWallet) {
        const connectFeature = target.rawWallet.features["standard:connect"];
        if (connectFeature) {
          const res = await connectFeature.connect();
          if (res?.accounts?.[0]?.address) {
            const address = res.accounts[0].address;
            this.setConnected(address, target.name);
            return address;
          }
        }
      }

      // 2. Injected window.suiWallet fallback
      if (typeof window !== "undefined") {
        const win = window as any;
        if (win.suiWallet) {
          // Request permissions from user's extension
          const hasPerm = await win.suiWallet.hasPermissions?.(["viewAccount"]);
          if (!hasPerm) {
            await win.suiWallet.requestPermissions?.(["viewAccount"]);
          }
          const accounts = await win.suiWallet.getAccounts?.();
          if (accounts && accounts.length > 0) {
            const address = accounts[0];
            this.setConnected(address, "Sui Wallet");
            return address;
          }
        }
      }

      throw new Error("No compatible Sui wallet connected. Please authorize the connection in your extension.");
    } catch (err: any) {
      this.status = "disconnected";
      this.notify();
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    const active = this.activeWalletName ? this.standardWallets.get(this.activeWalletName) : null;
    if (active?.features["standard:disconnect"]) {
      try {
        await active.features["standard:disconnect"].disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
    this.activeAddress = null;
    this.activeWalletName = null;
    this.status = "disconnected";
    localStorage.removeItem("ripple.sui.wallet.address");
    localStorage.removeItem("ripple.sui.wallet.name");
    this.notify();
  }

  public async signPersonalMessage(messageText: string): Promise<string> {
    if (!this.activeAddress) throw new Error("Wallet not connected");

    const messageBytes = new TextEncoder().encode(messageText);

    // 1. Standard wallet sign
    const active = this.activeWalletName ? this.standardWallets.get(this.activeWalletName) : null;
    if (active?.features["sui:signPersonalMessage"]) {
      const account = active.accounts.find(a => a.address === this.activeAddress) || active.accounts[0];
      const res = await active.features["sui:signPersonalMessage"].signPersonalMessage({
        message: messageBytes,
        account,
      });
      return res.signature;
    }

    // 2. Injected window.suiWallet sign
    if (typeof window !== "undefined") {
      const win = window as any;
      if (win.suiWallet?.signPersonalMessage) {
        const res = await win.suiWallet.signPersonalMessage({
          message: messageBytes,
        });
        return res.signature || res;
      }
    }

    throw new Error("Wallet does not support message signing");
  }

  private setConnected(address: string, name: string) {
    this.activeAddress = address;
    this.activeWalletName = name;
    this.status = "connected";
    localStorage.setItem("ripple.sui.wallet.address", address);
    localStorage.setItem("ripple.sui.wallet.name", name);
    this.notify();
  }

  public getActiveAddress(): string | null {
    return this.activeAddress;
  }

  public getActiveWalletName(): string | null {
    return this.activeWalletName;
  }

  public getStatus(): "connected" | "disconnected" | "connecting" {
    return this.status;
  }

  public subscribe(listener: WalletListener): () => void {
    this.listeners.add(listener);
    listener({
      address: this.activeAddress,
      name: this.activeWalletName,
      status: this.status,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({
        address: this.activeAddress,
        name: this.activeWalletName,
        status: this.status,
      });
    }
  }
}

export const suiWallet = new SuiWalletManager();
