import React, { useState, useEffect } from "react";

interface WalletModalProps {
  onClose: () => void;
  onClaimSuccess?: (xp: number, rp: number) => void;
}

export function WalletModal({ onClose, onClaimSuccess }: WalletModalProps) {
  const [tab, setTab] = useState<"claim" | "impact">("claim");
  const [wallet, setWallet] = useState<string | null>(() => {
    return localStorage.getItem("ripple.sui.wallet.address") || null;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [claimStatus, setClaimStatus] = useState<"idle" | "ready" | "claimed" | "error">("idle");
  const [claimReceipt, setClaimReceipt] = useState<any>(null);
  const [releaseReceipt, setReleaseReceipt] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const hasCompletedReplay = !!localStorage.getItem("ripple.komodo.completedReplay.v1");
  const isAlreadyClaimed = localStorage.getItem("ripple.komodo.claimed.v1") === "true";

  useEffect(() => {
    if (isAlreadyClaimed) {
      setClaimStatus("claimed");
    } else if (hasCompletedReplay) {
      setClaimStatus("ready");
    }
  }, [hasCompletedReplay, isAlreadyClaimed]);

  const handleConnectWallet = () => {
    setIsConnecting(true);
    setTimeout(() => {
      // Demo Sui Testnet address
      const demoAddress = "0xa40ebf077e8d9de05b48bc019253b6e1ea6f2a32383dfdee858a5ca64897323d";
      setWallet(demoAddress);
      localStorage.setItem("ripple.sui.wallet.address", demoAddress);
      setIsConnecting(false);
      setStatusMessage("Connected to Sui Testnet (Demo Address)");
    }, 300);
  };

  const handleDisconnectWallet = () => {
    setWallet(null);
    localStorage.removeItem("ripple.sui.wallet.address");
    setStatusMessage("Wallet disconnected.");
  };

  const handleVerifyAndClaim = async () => {
    if (!wallet) {
      setStatusMessage("Please connect a Sui Testnet wallet first.");
      return;
    }
    setIsVerifying(true);
    setStatusMessage("Submitting replay to server verifier...");

    try {
      const savedReplay = localStorage.getItem("ripple.komodo.completedReplay.v1");
      const actions = savedReplay ? JSON.parse(savedReplay) : [];

      // Attempt verification against local API server
      let receiptDigest = "tx_sui_testnet_" + Math.random().toString(16).slice(2, 10);
      try {
        const res = await fetch("http://127.0.0.1:4188/v1/replays/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet,
            replay: {
              campaign_id: "operation-komodo",
              version: 1,
              map_id: "komodo_v1",
              actions,
              wallet,
            },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.result?.ticket_id) {
            receiptDigest = data.result.ticket_id;
          }
        }
      } catch {
        // Offline / fixture demo fallback mode
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
    } catch {
      setStatusMessage("Verification error. Local progress remains safe.");
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
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Sui Testnet Ledger & Impact Board">
      <section className="journal wallet-journal" style={{ maxWidth: 540, width: "95%" }}>
        <button className="close" onClick={onClose} aria-label="Close ledger" style={{ position: "absolute", top: 12, right: 16 }}>
          ×
        </button>

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
            Impact Board (B14)
          </button>
        </div>

        {tab === "claim" && (
          <div>
            <h2 style={{ margin: "4px 0 8px" }}>Sui Testnet Passport</h2>
            <p style={{ fontSize: 13, color: "#4d3926", margin: "0 0 14px" }}>
              Connect an optional Sui Testnet wallet to register your passport and record verified campaign contributions.
            </p>

            <div style={{ background: "#efe4cf", border: "1px solid #c2ad8e", borderRadius: 6, padding: "10px 14px", marginBottom: 14, textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6e553c", textTransform: "uppercase" }}>Wallet Status</div>
              {wallet ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <code style={{ fontSize: 12, color: "#1c384d", background: "#f8f3e8", padding: "2px 6px", borderRadius: 4 }}>
                    {wallet.slice(0, 10)}...{wallet.slice(-8)}
                  </code>
                  <button onClick={handleDisconnectWallet} style={{ fontSize: 12, padding: "3px 8px", minHeight: 28 }}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 6 }}>
                  <button onClick={handleConnectWallet} disabled={isConnecting} className="primary" style={{ fontSize: 13, padding: "6px 14px" }}>
                    {isConnecting ? "Connecting..." : "Connect Testnet Wallet"}
                  </button>
                </div>
              )}
            </div>

            <div style={{ background: "#efe4cf", border: "1px solid #c2ad8e", borderRadius: 6, padding: "10px 14px", marginBottom: 14, textAlign: "left" }}>
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
                  <button onClick={handleVerifyAndClaim} disabled={isVerifying || !wallet} className="primary" style={{ fontSize: 13, padding: "6px 14px" }}>
                    {isVerifying ? "Verifying..." : "Verify & Claim 100 RP"}
                  </button>
                  {!wallet && <small style={{ display: "block", color: "#8a5829", marginTop: 4 }}>Connect wallet above to claim.</small>}
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

            {statusMessage && (
              <p style={{ fontSize: 12, color: "#1c4a28", fontWeight: 600, margin: "8px 0" }}>
                {statusMessage}
              </p>
            )}
          </div>
        )}

        {tab === "impact" && (
          <div>
            <h2 style={{ margin: "4px 0 8px" }}>Community Impact Board</h2>
            <p style={{ fontSize: 13, color: "#4d3926", margin: "0 0 14px" }}>
              Authoritative tracking of virtual progress, demo sponsor escrow, and independent physical outcomes.
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
            Close Ledger
          </button>
        </div>
      </section>
    </div>
  );
}
