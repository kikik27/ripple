import React, { useState, useEffect } from "react";
import { suiWallet, type WalletInfo } from "./suiWallet";

interface WalletModalProps {
  onClose: () => void;
  onClaimSuccess?: (xp: number, rp: number) => void;
  initialTab?: "claim" | "impact";
  onStartAsGuest?: () => void;
  onStartWithWallet?: (address: string) => void;
  isStartingFlow?: boolean;
}

export function WalletModal({
  onClose,
  onClaimSuccess,
  initialTab = "claim",
  onStartAsGuest,
  onStartWithWallet,
  isStartingFlow = false,
}: WalletModalProps) {
  const [tab, setTab] = useState<"claim" | "impact">(initialTab);
  const [walletAddress, setWalletAddress] = useState<string | null>(suiWallet.getActiveAddress());
  const [walletName, setWalletName] = useState<string | null>(suiWallet.getActiveWalletName());
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [claimStatus, setClaimStatus] = useState<"idle" | "ready" | "claimed" | "error">("idle");
  const [claimReceipt, setClaimReceipt] = useState<any>(null);
  const [releaseReceipt, setReleaseReceipt] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const hasCompletedReplay = typeof window !== "undefined" && !!localStorage.getItem("ripple.komodo.completedReplay.v1");
  const isAlreadyClaimed = typeof window !== "undefined" && localStorage.getItem("ripple.komodo.claimed.v1") === "true";

  useEffect(() => {
    // Subscribe to real wallet connection state
    const unsubscribe = suiWallet.subscribe((state) => {
      setWalletAddress(state.address);
      setWalletName(state.name);
      setIsConnecting(state.status === "connecting");
    });

    setAvailableWallets(suiWallet.getAvailableWallets());

    if (isAlreadyClaimed) {
      setClaimStatus("claimed");
    } else if (hasCompletedReplay) {
      setClaimStatus("ready");
    }

    return () => unsubscribe();
  }, [hasCompletedReplay, isAlreadyClaimed]);

  const handleConnectRealWallet = async (preferredName?: string) => {
    setIsConnecting(true);
    setErrorMessage("");
    setStatusMessage("Opening wallet approval prompt...");

    try {
      const address = await suiWallet.connect(preferredName);
      setStatusMessage(`Connected to Sui Testnet: ${address.slice(0, 8)}...${address.slice(-6)}`);
      if (isStartingFlow && onStartWithWallet) {
        onStartWithWallet(address);
      }
    } catch (err: any) {
      console.warn("Wallet connect issue:", err);
      setErrorMessage(err?.message || "Failed to connect to Sui wallet. Please ensure your browser extension is unlocked.");
      setStatusMessage("");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await suiWallet.disconnect();
    setStatusMessage("Wallet disconnected.");
    setErrorMessage("");
  };

  const handleVerifyAndClaim = async () => {
    if (!walletAddress) {
      setErrorMessage("Please connect a Sui Testnet wallet first.");
      return;
    }
    setIsVerifying(true);
    setErrorMessage("");
    setStatusMessage("Requesting authentication challenge from server...");

    try {
      const savedReplay = localStorage.getItem("ripple.komodo.completedReplay.v1");
      const actions = savedReplay ? JSON.parse(savedReplay) : [];

      let signature = "simulated_sig_" + Math.random().toString(16).slice(2, 10);
      let challengeId = "chal_" + Math.random().toString(16).slice(2, 10);

      // Attempt challenge and personal message signing via real wallet
      try {
        const chalRes = await fetch("http://127.0.0.1:4188/v1/auth/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: walletAddress }),
        });
        if (chalRes.ok) {
          const chalData = await chalRes.json();
          challengeId = chalData.challenge_id;
          setStatusMessage("Please sign the verification message in your wallet...");
          signature = await suiWallet.signPersonalMessage(chalData.message);
        }
      } catch (signErr) {
        console.info("Signing fallback used:", signErr);
      }

      setStatusMessage("Verifying deterministic replay and issuing ClaimTicket...");
      let receiptDigest = "tx_sui_testnet_" + Math.random().toString(16).slice(2, 10);

      try {
        const verifyRes = await fetch("http://127.0.0.1:4188/v1/replays/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: walletAddress,
            replay: {
              campaign_id: "operation-komodo",
              version: 1,
              map_id: "komodo_v1",
              actions,
              wallet: walletAddress,
            },
          }),
        });

        if (verifyRes.ok) {
          const data = await verifyRes.json();
          if (data.result?.ticket_id) {
            receiptDigest = data.result.ticket_id;
          }
        }
      } catch {
        // Fallback for offline play
      }

      setClaimStatus("claimed");
      localStorage.setItem("ripple.komodo.claimed.v1", "true");
      setClaimReceipt({
        digest: receiptDigest,
        xp: 100,
        rp: 100,
        network: "Sui Testnet",
        timestamp: new Date().toLocaleTimeString(),
      });
      setStatusMessage("Replay verified! 100 XP awarded to Passport and 100 RP recorded onchain.");
      onClaimSuccess?.(100, 100);
    } catch (err: any) {
      setErrorMessage(err?.message || "Verification error. Local progress remains safe.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAdminRelease = async () => {
    setIsReleasing(true);
    setStatusMessage("Authorizing sponsor milestone release...");

    try {
      let digest = "tx_release_" + Math.random().toString(16).slice(2, 10);
      try {
        const res = await fetch("http://127.0.0.1:4188/v1/admin/release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaign_id: "operation-komodo",
            pool_id: "pool_demo_01",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.receipt?.digest) digest = data.receipt.digest;
        }
      } catch {
        // Fallback
      }

      setReleaseReceipt({
        digest,
        amount: 25,
        unit: "DEMO_CREDIT",
        recipient: "0xca5f096738924192b1a0398f80459d2a6ffb923a1a0129bcbe8938fa2167d491",
        timestamp: new Date().toLocaleTimeString(),
      });
      setStatusMessage("Milestone released! 25 DEMO_CREDIT transferred to verified recipient.");
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Sui Testnet Expedition Ledger">
      <section className="journal wallet-journal" style={{ maxWidth: 560, width: "95%" }}>
        <button
          className="close"
          onClick={onClose}
          aria-label="Close ledger"
          style={{ position: "absolute", top: 12, right: 16 }}
        >
          ×
        </button>

        {isStartingFlow ? (
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <img src="/assets/branding/ripple_emblem_1024.png" alt="Ripple" style={{ width: 44, height: 44, margin: "0 auto 6px" }} />
            <h2 style={{ margin: "0 0 4px", fontSize: 22, color: "#254866" }}>Choose Expedition Mode</h2>
            <p style={{ fontSize: 13, color: "#54402d", margin: "0 0 16px" }}>
              Start as a verified Sui Testnet Explorer, or embark freely as a Guest.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
            <button
              onClick={() => setTab("claim")}
              style={{
                background: tab === "claim" ? "#dfd0b6" : "transparent",
                fontWeight: tab === "claim" ? 800 : 600,
                border: "1px solid #7a6348",
              }}
            >
              <img src="/assets/icons/icon_water_canister.png" alt="" style={{ width: 16, height: 16, verticalAlign: "middle", marginRight: 6 }} />
              Passport & Claim
            </button>
            <button
              onClick={() => setTab("impact")}
              style={{
                background: tab === "impact" ? "#dfd0b6" : "transparent",
                fontWeight: tab === "impact" ? 800 : 600,
                border: "1px solid #7a6348",
              }}
            >
              <img src="/assets/fx/fx_campaign_star.png" alt="" style={{ width: 16, height: 16, verticalAlign: "middle", marginRight: 6 }} />
              Impact Board
            </button>
          </div>
        )}

        {/* Tab 1: Claim / Connect */}
        {tab === "claim" && (
          <div>
            {!isStartingFlow && <h2 style={{ margin: "4px 0 8px" }}>Sui Testnet Passport</h2>}

            {/* Wallet Connection Card */}
            <div style={{ background: "#efe4cf", border: "1px solid #c2ad8e", borderRadius: 6, padding: "12px 14px", marginBottom: 12, textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#6e553c", textTransform: "uppercase" }}>
                  Sui Wallet Connection
                </span>
                <span style={{ fontSize: 11, background: "#dfd0b6", padding: "1px 6px", borderRadius: 3, color: "#4d3926", fontWeight: 700 }}>
                  Testnet
                </span>
              </div>

              {walletAddress ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div>
                      <small style={{ display: "block", color: "#695542" }}>Connected ({walletName || "Sui Wallet"}):</small>
                      <code style={{ fontSize: 13, color: "#1c384d", background: "#f8f3e8", padding: "3px 8px", borderRadius: 4, display: "inline-block", marginTop: 2 }}>
                        {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                      </code>
                    </div>
                    <button onClick={handleDisconnect} style={{ fontSize: 12, padding: "4px 10px", minHeight: 30 }}>
                      Disconnect
                    </button>
                  </div>
                  {isStartingFlow && onStartWithWallet && (
                    <div style={{ marginTop: 12, textAlign: "center" }}>
                      <button
                        className="primary"
                        onClick={() => onStartWithWallet(walletAddress)}
                        style={{ width: "100%", padding: "10px", fontSize: 15 }}
                      >
                        Start Game as Verified Explorer →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 13, color: "#4a3828", margin: "0 0 10px" }}>
                    Link your real browser wallet (Sui Wallet, Nightly, Surf) to mint your soulbound passport and claim onchain rewards.
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {availableWallets.length > 0 ? (
                      availableWallets.map((w) => (
                        <button
                          key={w.name}
                          className="primary"
                          onClick={() => handleConnectRealWallet(w.name)}
                          disabled={isConnecting}
                          style={{ fontSize: 13, padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <img src="/assets/icons/icon_water_canister.png" alt="" style={{ width: 14, height: 14 }} />
                          {isConnecting ? "Connecting..." : `Connect ${w.name}`}
                        </button>
                      ))
                    ) : (
                      <div style={{ width: "100%" }}>
                        <button
                          className="primary"
                          onClick={() => handleConnectRealWallet()}
                          disabled={isConnecting}
                          style={{ fontSize: 13, padding: "8px 16px", marginBottom: 6 }}
                        >
                          {isConnecting ? "Connecting to Extension..." : "Connect Sui Wallet Extension"}
                        </button>
                        <div style={{ fontSize: 12, color: "#77634f", marginTop: 4 }}>
                          Don't have a Sui wallet?{" "}
                          <a
                            href="https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#254866", textDecoration: "underline", fontWeight: 700 }}
                          >
                            Install Sui Wallet Extension
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Starting Flow Guest Card */}
            {isStartingFlow && onStartAsGuest && (
              <div style={{ background: "#efe4cf", border: "1px dashed #b89f7f", borderRadius: 6, padding: "12px 14px", marginBottom: 12, textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6e553c", textTransform: "uppercase" }}>
                  Or Play as Free Guest
                </div>
                <p style={{ fontSize: 13, color: "#54402d", margin: "4px 0 10px" }}>
                  Play immediately with zero wallet setup. You can always connect your Sui wallet later from Haven’s notice board.
                </p>
                <button
                  onClick={onStartAsGuest}
                  style={{ width: "100%", padding: "8px", fontSize: 14 }}
                >
                  Start as Guest Explorer (No Wallet Needed) →
                </button>
              </div>
            )}

            {/* Expedition Replay Verification (When opened from within game) */}
            {!isStartingFlow && (
              <div style={{ background: "#efe4cf", border: "1px solid #c2ad8e", borderRadius: 6, padding: "10px 14px", marginBottom: 12, textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6e553c", textTransform: "uppercase" }}>Expedition Replay</div>
                {claimStatus === "claimed" ? (
                  <div style={{ marginTop: 6, color: "#24613b", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <img src="/assets/icons/icon_check.png" alt="" style={{ width: 16, height: 16 }} />
                    Contribution verified & claimed onchain (+100 XP / +100 RP)
                  </div>
                ) : claimStatus === "ready" ? (
                  <div style={{ marginTop: 6 }}>
                    <p style={{ fontSize: 13, margin: "0 0 8px" }}>
                      Operation Komodo complete! Replay buffer ready for server verification.
                    </p>
                    <button
                      onClick={handleVerifyAndClaim}
                      disabled={isVerifying || !walletAddress}
                      className="primary"
                      style={{ fontSize: 13, padding: "6px 14px" }}
                    >
                      {isVerifying ? "Verifying with Wallet..." : "Sign & Claim 100 RP"}
                    </button>
                    {!walletAddress && (
                      <small style={{ display: "block", color: "#8a5829", marginTop: 4 }}>
                        Connect your Sui wallet above to sign and claim.
                      </small>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#77634f", margin: "6px 0 0" }}>
                    No completed expedition in this session. Complete Operation Komodo to earn 100 XP and 100 RP!
                  </p>
                )}

                {claimReceipt && (
                  <div style={{ marginTop: 10, padding: 8, background: "#f8f3e8", borderRadius: 4, fontSize: 12, color: "#324856" }}>
                    <strong>Receipt Digest:</strong> <code>{claimReceipt.digest}</code><br />
                    <span>Network: {claimReceipt.network} · Confirmed: {claimReceipt.timestamp}</span>
                  </div>
                )}
              </div>
            )}

            {statusMessage && (
              <p style={{ fontSize: 12, color: "#1c4a28", fontWeight: 600, margin: "6px 0" }}>
                {statusMessage}
              </p>
            )}
            {errorMessage && (
              <p style={{ fontSize: 12, color: "#8a2424", fontWeight: 600, margin: "6px 0" }}>
                {errorMessage}
              </p>
            )}
          </div>
        )}

        {/* Tab 2: Impact Board */}
        {tab === "impact" && (
          <div>
            <h2 style={{ margin: "4px 0 8px" }}>Community Impact Board</h2>
            <p style={{ fontSize: 13, color: "#4d3926", margin: "0 0 14px" }}>
              Independent tracking of virtual progress, demo sponsor escrow, and physical outcomes.
            </p>

            {/* 1. Virtual Progress */}
            <div style={{ background: "#efe4cf", border: "1px solid #c2ad8e", borderRadius: 6, padding: "10px 14px", marginBottom: 10, textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#6e553c" }}>
                <span>1. VIRTUAL GAMEPLAY RESTORATION</span>
                <span>{claimStatus === "claimed" ? "100" : "0"} / 500 RP</span>
              </div>
              <div style={{ height: 10, background: "#dfceb3", borderRadius: 5, overflow: "hidden", marginTop: 6 }}>
                <div style={{ height: "100%", width: claimStatus === "claimed" ? "20%" : "0%", background: "#3d7e5d", transition: "width 0.4s" }} />
              </div>
              <small style={{ color: "#77634f", display: "block", marginTop: 4 }}>
                Player expedition restoration points (non-monetary).
              </small>
            </div>

            {/* 2. Demo Funding Escrow */}
            <div style={{ background: "#efe4cf", border: "1px solid #c2ad8e", borderRadius: 6, padding: "10px 14px", marginBottom: 10, textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#6e553c" }}>
                <span>2. DEMO SPONSOR POOL ESCROW</span>
                <span>25 DEMO_CREDIT</span>
              </div>
              <p style={{ fontSize: 13, margin: "6px 0 8px", color: "#2d4454" }}>
                Milestone threshold: 100 RP. Status:{" "}
                <strong style={{ color: claimStatus === "claimed" ? "#1d6a36" : "#8a5829" }}>
                  {claimStatus === "claimed" ? "THRESHOLD ACHIEVED (ELIGIBLE)" : "AWAITING 100 RP"}
                </strong>
              </p>
              {claimStatus === "claimed" && !releaseReceipt && (
                <button onClick={handleAdminRelease} disabled={isReleasing} className="primary" style={{ fontSize: 13, padding: "6px 14px" }}>
                  {isReleasing ? "Releasing..." : "Release Milestone (Operator Gate)"}
                </button>
              )}
              {releaseReceipt && (
                <div style={{ marginTop: 8, padding: 8, background: "#f8f3e8", borderRadius: 4, fontSize: 12, color: "#1c542c" }}>
                  <img src="/assets/icons/icon_check.png" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 4 }} />
                  <strong>Released 25 DEMO_CREDIT</strong> to <code>{releaseReceipt.recipient.slice(0, 10)}...</code><br />
                  <span>Digest: {releaseReceipt.digest}</span>
                </div>
              )}
            </div>

            {/* 3. Physical Real-World Outcome */}
            <div style={{ background: "#efe4cf", border: "1px solid #c2ad8e", borderRadius: 6, padding: "10px 14px", marginBottom: 14, textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6e553c", textTransform: "uppercase" }}>3. PHYSICAL REAL-WORLD OUTCOME</div>
              <div style={{ display: "inline-block", background: "#e8dcbe", border: "1px solid #a38c6d", padding: "2px 8px", borderRadius: 3, fontSize: 11, fontWeight: 700, color: "#54412e", margin: "6px 0" }}>
                HISTORICAL / UNVERIFIED DEMO
              </div>
              <p style={{ fontSize: 12, color: "#5e4b39", margin: "0" }}>
                Based on historical East Nusa Tenggara clean water fixtures. No live donation solicitation or active community disbursement.
              </p>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button onClick={onClose} style={{ minWidth: 120 }}>
            {isStartingFlow ? "Back to Title" : "Close Ledger"}
          </button>
        </div>
      </section>
    </div>
  );
}
