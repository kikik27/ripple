import React from "react";

export interface BuildingInfo {
  name: string;
  func: string;
  x: number;
  y: number;
  icon?: string;
  category?: string;
}

export function BuildingPill({ info }: { info: BuildingInfo | null }) {
  if (!info) return null;
  const icon = info.icon ?? (
    info.name.includes("Well") || info.name.includes("Pump") || info.name.includes("Water") ? "💧"
    : info.name.includes("Market") || info.name.includes("Trade") ? "🧺"
    : info.name.includes("Gate") || info.name.includes("Waygate") || info.name.includes("Portal") ? "🌀"
    : info.name.includes("Camp") || info.name.includes("Hearth") ? "🔥"
    : info.name.includes("Fish") || info.name.includes("Dock") ? "🎣"
    : info.name.includes("Garden") || info.name.includes("Crop") || info.name.includes("Plot") ? "🌱"
    : info.name.includes("Workshop") || info.name.includes("Bench") ? "🔨"
    : info.name.includes("Store") || info.name.includes("Depot") ? "📦"
    : info.name.includes("Board") ? "📜"
    : info.name.includes("Trail") || info.name.includes("Post") || info.name.includes("Lookout") ? "🚩"
    : info.func.includes("Talk") ? "💬"
    : info.func.includes("Care") || info.func.includes("Favorite") ? "🐾"
    : "✨"
  );

  return (
    <aside
      className="building-hover-pill rpg-signpost-pill"
      style={{ left: `${info.x}px`, top: `${info.y}px` }}
      role="status"
      aria-label={`${info.name}: ${info.func}`}
    >
      <div className="pill-sign-badge">
        <span className="pill-emoji-badge" aria-hidden="true">{icon}</span>
        <span className="pill-key" aria-hidden="true">E</span>
      </div>
      <div className="pill-text">
        <strong className="pill-name">{info.name}</strong>
        <span className="pill-func">{info.func}</span>
      </div>
      <div className="pill-arrow" aria-hidden="true" />
    </aside>
  );
}
