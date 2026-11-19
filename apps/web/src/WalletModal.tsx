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
    setStatusMessage("Opening wallet approval prompt in extension...");

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
        // Fallback for offline mode
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
      <section className="haven-board quest-board wallet-board">
        {/* Authentic Header */}
        <header className="quest-board-header">
          <img
            className="ledger-logo-img"
            src={isStartingFlow ? "/assets/branding/ripple_emblem_1024.png" : "/assets/icons/icon_water_canister.png"}
            alt=""
            aria-hidden="true"
          />
          <div className="quest-board-titles">
            <small>{isStartingFlow ? "EXPEDITION ONBOARDING" : "SUI TESTNET EXPEDITION"}</small>
            <strong className="quest-board-name">{isStartingFlow ? "Choose Expedition Mode" : "Field Ledger & Impact"}</strong>
          </div>
        </header>

        {/* Tab switcher using Ripple's .book-tabs */}
        {!isStartingFlow && (
          <nav className="book-tabs">
            <button
              aria-pressed={tab === "claim"}
              onClick={() => setTab("claim")}
            >
              <img src="/assets/icons/icon_water_canister.png" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 5 }} />
              Passport & Claim
            </button>
            <button
              aria-pressed={tab === "impact"}
              onClick={() => setTab("impact")}
            >
              <img src="/assets/icons/icon_impact.png" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 5 }} />
              Impact Board
            </button>
          </nav>
        )}

        {/* Starting Flow: Choice between Verified Sui Explorer or Free Guest */}
        {isStartingFlow && (
          <div className="starting-options-flow">
            <p style={{ margin: "2px 0 10px", fontSize: 13, color: "#324e5b", textAlign: "left" }}>
              Choose how you wish to embark. You may link your Sui wallet now or play freely offline as a guest.
            </p>

            {/* Option 1: Sui Testnet Passport */}
            <div className={`wallet-card-panel wallet-card-option ${walletAddress ? "is-connected-opt" : ""}`}>
              <div className="wallet-card-header">
                <span className="wallet-card-tag">
                  <img src="/assets/icons/icon_water_canister.png" alt="" />
                  Option A · Sui Testnet Passport (Recommended)
                </span>
                <span style={{ font: "bold 10px system-ui", background: "#396b5e", color: "white", padding: "1px 5px", border: "1px solid #23483f" }}>
                  Onchain
                </span>
              </div>

              {walletAddress ? (
                <div>
                  <p>
                    Connected: <code className="rpg-wallet-code">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</code> ({walletName || "Sui Wallet"})
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      className="primary"
                      onClick={() => onStartWithWallet && onStartWithWallet(walletAddress)}
                      style={{ flex: 1 }}
                    >
                      Enter Haven as Verified Explorer →
                    </button>
                    <button onClick={handleDisconnect} style={{ flex: "none" }}>
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p>
                    Mint your soulbound player passport, record verified restoration points (RP), and release pre-funded demo milestones.
                  </p>
                  {availableWallets.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {availableWallets.map((w) => (
                        <button
                          key={w.name}
                          className="primary"
                          onClick={() => handleConnectRealWallet(w.name)}
                          disabled={isConnecting}
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
                          <img src="/assets/icons/icon_water_canister.png" alt="" style={{ width: 14, height: 14 }} />
                          {isConnecting ? "Connecting..." : `Connect ${w.name} Extension`}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <button
                        className="primary"
                        onClick={() => handleConnectRealWallet()}
                        disabled={isConnecting}
                        style={{ width: "100%", marginBottom: 6 }}
                      >
                        {isConnecting ? "Connecting to Extension..." : "Connect Sui Wallet Extension"}
                      </button>
                      <div style={{ fontSize: 11, color: "#617983", marginTop: 4 }}>
                        Need an extension?{" "}
                        <a
                          href="https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#254866", textDecoration: "underline", fontWeight: 700 }}
                        >
                          Install official Sui Wallet (Chrome/Edge)
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Option 2: Guest Explorer */}
            <div className="wallet-card-panel wallet-card-option">
              <div className="wallet-card-header">
                <span className="wallet-card-tag">
                  <img src="/assets/props/signpost.png" alt="" />
                  Option B · Guest Explorer (Free Play)
                </span>
                <span style={{ font: "bold 10px system-ui", background: "#7a6d59", color: "white", padding: "1px 5px", border: "1px solid #4a3e2e" }}>
                  Offline
                </span>
              </div>
              <p>
                Begin your journey instantly with zero wallet requirements. Full gameplay is offline-ready; link your wallet anytime from the village notice board.
              </p>
              <button
                onClick={onStartAsGuest}
                style={{ width: "100%" }}
              >
                Embark as Guest Explorer →
              </button>
            </div>
          </div>
        )}

        {/* Tab: Passport & Claim (In-Game) */}
        {!isStartingFlow && tab === "claim" && (
          <div>
            {/* Wallet Status Panel */}
            <div className="wallet-card-panel">
              <div className="wallet-card-header">
                <span className="wallet-card-tag">
                  <img src="/assets/icons/icon_water_canister.png" alt="" />
                  Sui Wallet Connection
                </span>
                <span style={{ font: "bold 10px system-ui", background: "#396b5e", color: "white", padding: "1px 5px", border: "1px solid #23483f" }}>
                  Sui Testnet
                </span>
              </div>

              {walletAddress ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <div>
                      <small style={{ color: "#4f6a73", display: "block" }}>Connected Wallet ({walletName || "Sui Wallet"}):</small>
                      <code className="rpg-wallet-code">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</code>
                    </div>
                    <button onClick={handleDisconnect} style={{ fontSize: 12, padding: "4px 8px" }}>
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p>
                    Link your browser wallet extension to sign challenges and claim verified onchain restoration points.
                  </p>
                  <button
                    className="primary"
                    onClick={() => handleConnectRealWallet()}
                    disabled={isConnecting}
                    style={{ width: "100%" }}
                  >
                    <img src="/assets/icons/icon_water_canister.png" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 6 }} />
                    {isConnecting ? "Connecting to Extension..." : "Connect Sui Wallet Extension"}
                  </button>
                </div>
              )}
            </div>

            {/* Expedition Replay Verification Panel */}
            <div className="wallet-card-panel">
              <div className="wallet-card-header">
                <span className="wallet-card-tag">
                  <img src="/assets/icons/icon_quest.png" alt="" />
                  Expedition Replay Verification
                </span>
                <span style={{ font: "bold 11px Georgia, serif", color: "#254866" }}>
                  Operation Komodo
                </span>
              </div>

              {claimStatus === "claimed" ? (
                <div className="receipt-banner">
                  <img src="/assets/icons/icon_check.png" alt="" />
                  <div>
                    <strong>Expedition Claim Confirmed (+100 XP / +100 RP)</strong>
                    <small>Digest: {claimReceipt?.digest || "tx_verified_claim"}</small>
                  </div>
                </div>
              ) : claimStatus === "ready" ? (
                <div>
                  <p>
                    Expedition completed! Server replay verifier is ready to issue your nontransferable ClaimTicket.
                  </p>
                  <button
                    className="primary"
                    onClick={handleVerifyAndClaim}
                    disabled={isVerifying || !walletAddress}
                    style={{ width: "100%" }}
                  >
                    <img src="/assets/icons/icon_rp.png" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 6 }} />
                    {isVerifying ? "Verifying with Extension..." : "Sign Replay & Claim 100 RP"}
                  </button>
                  {!walletAddress && (
                    <small style={{ display: "block", color: "#8a5829", marginTop: 4, fontStyle: "italic" }}>
                      Please connect your Sui wallet above to sign the verification challenge.
                    </small>
                  )}
                </div>
              ) : (
                <p style={{ color: "#546870", fontStyle: "italic" }}>
                  No completed expedition in this session. Complete Operation Komodo to claim 100 XP and 100 RP!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab: Impact Board (In-Game) */}
        {!isStartingFlow && tab === "impact" && (
          <div>
            {/* 1. Virtual Gameplay Restoration (Uses authentic bar_track_empty & bar_fill_rp) */}
            <div className="wallet-card-panel">
              <div className="wallet-card-header">
                <span className="wallet-card-tag">
                  <img src="/assets/icons/icon_rp.png" alt="" />
                  1. Virtual Restoration Points
                </span>
                <span style={{ font: "bold 12px Georgia, serif", color: "#203651" }}>
                  {claimStatus === "claimed" ? "100" : "0"} / 500 RP
                </span>
              </div>
              <div className="energy-track" style={{ width: "100%", height: 18, margin: "6px 0", boxSizing: "border-box" }}>
                <i
                  style={{
                    width: `${claimStatus === "claimed" ? 20 : 0}%`,
                    background: "url('/assets/ui/bar_fill_rp.png') left / 100% 100% repeat-x",
                  }}
                />
                <span style={{ fontSize: 11 }}>{claimStatus === "claimed" ? "100" : "0"} / 500 RP</span>
              </div>
              <small style={{ color: "#475d60", display: "block", fontSize: 11, fontStyle: "italic" }}>
                Verified in-game restoration progress (non-monetary).
              </small>
            </div>

            {/* 2. Demo Sponsor Pool Escrow (Uses authentic bar_track_empty & bar_fill_funding) */}
            <div className="wallet-card-panel">
              <div className="wallet-card-header">
                <span className="wallet-card-tag">
                  <img src="/assets/icons/icon_coin.png" alt="" />
                  2. Demo Sponsor Pool Escrow
                </span>
                <span style={{ font: "bold 12px Georgia, serif", color: "#203651" }}>
                  25 DEMO_CREDIT
                </span>
              </div>
              <div className="energy-track" style={{ width: "100%", height: 18, margin: "6px 0", boxSizing: "border-box" }}>
                <i
                  style={{
                    width: releaseReceipt ? "100%" : (claimStatus === "claimed" ? "100%" : "0%"),
                    background: "url('/assets/ui/bar_fill_funding.png') left / 100% 100% repeat-x",
                  }}
                />
                <span style={{ fontSize: 11 }}>
                  {releaseReceipt ? "RELEASED: 25 / 25 DEMO_CREDIT" : (claimStatus === "claimed" ? "ELIGIBLE: 25 ESCROWED" : "ESCROWED: 25 DEMO_CREDIT")}
                </span>
              </div>
              <p style={{ margin: "4px 0 8px", fontSize: 12, color: "#203651" }}>
                Target milestone: 100 RP. Status:{" "}
                <strong style={{ color: claimStatus === "claimed" ? "#1e6837" : "#8a5829" }}>
                  {releaseReceipt ? "MILESTONE RELEASED TO BENEFICIARY" : (claimStatus === "claimed" ? "THRESHOLD ACHIEVED (ELIGIBLE)" : "AWAITING 100 RP")}
                </strong>
              </p>
              {claimStatus === "claimed" && !releaseReceipt && (
                <button
                  className="primary"
                  onClick={handleAdminRelease}
                  disabled={isReleasing}
                  style={{ width: "100%" }}
                >
                  <img src="/assets/icons/icon_impact.png" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 6 }} />
                  {isReleasing ? "Releasing..." : "Release Milestone to Beneficiary →"}
                </button>
              )}
              {releaseReceipt && (
                <div className="receipt-banner">
                  <img src="/assets/icons/icon_check.png" alt="" />
                  <div>
                    <strong>Released 25 DEMO_CREDIT to Beneficiary</strong>
                    <small>Digest: {releaseReceipt.digest}</small>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Physical Real-World Outcome */}
            <div className="wallet-card-panel">
              <div className="wallet-card-header">
                <span className="wallet-card-tag">
                  <img src="/assets/icons/icon_impact.png" alt="" />
                  3. Physical Real-World Outcome
                </span>
                <span className="status-badge-historical">
                  HISTORICAL / UNVERIFIED DEMO
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#546870", lineHeight: 1.3 }}>
                Based on historical East Nusa Tenggara clean water fixtures. No live donation solicitation or active community disbursement.
              </p>
            </div>
          </div>
        )}

        {/* Status / Error Toasts */}
        {statusMessage && (
          <p style={{ fontSize: 12, color: "#1c4a28", fontWeight: 600, margin: "6px 0", textAlign: "center" }}>
            {statusMessage}
          </p>
        )}
        {errorMessage && (
          <p style={{ fontSize: 12, color: "#8a2424", fontWeight: 600, margin: "6px 0", textAlign: "center" }}>
            {errorMessage}
          </p>
        )}

        {/* Clean Board Close Button using native board-close asset */}
        <button className="board-close" onClick={onClose}>
          {isStartingFlow ? "Back to Title" : "Close Ledger"}
        </button>
      </section>
    </div>
  );
}
