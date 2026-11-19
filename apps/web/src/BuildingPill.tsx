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
    info.name.includes("Well") || info.name.includes("Pump") || info.name.includes("Water") ? "/assets/icons/icon_water_canister.png"
    : info.name.includes("Market") || info.name.includes("Trade") ? "/assets/icons/icon_bag.png"
    : info.name.includes("Gate") || info.name.includes("Waygate") || info.name.includes("Portal") ? "/assets/fx/fx_interaction_ring.png"
    : info.name.includes("Camp") || info.name.includes("Hearth") ? "/assets/props/campfire.png"
    : info.name.includes("Fish") || info.name.includes("Dock") ? "/assets/living/icons/lw_icon_fish.png"
    : info.name.includes("Garden") || info.name.includes("Crop") || info.name.includes("Plot") ? "/assets/living/icons/lw_icon_produce.png"
    : info.name.includes("Workshop") || info.name.includes("Bench") ? "/assets/icons/icon_hammer.png"
    : info.name.includes("Store") || info.name.includes("Depot") ? "/assets/living/icons/lw_icon_seed_bag.png"
    : info.name.includes("Board") ? "/assets/icons/icon_quest.png"
    : info.name.includes("Trail") || info.name.includes("Post") || info.name.includes("Lookout") ? "/assets/icons/icon_pin.png"
    : info.func.includes("Talk") ? "/assets/ui/speech_bubble.png"
    : info.func.includes("Care") || info.func.includes("Favorite") ? "/assets/icons/icon_heart.png"
    : "/assets/icons/icon_pin.png"
  );

  return (
    <aside
      className="building-hover-pill rpg-signpost-pill"
      style={{ left: `${info.x}px`, top: `${info.y}px` }}
      role="status"
      aria-label={`${info.name}: ${info.func}`}
    >
      <div className="pill-sign-badge">
        <img className="pill-asset-icon" src={icon} alt="" aria-hidden="true" />
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
