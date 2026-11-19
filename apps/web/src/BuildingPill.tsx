import React from "react";

export interface BuildingInfo {
  name: string;
  func: string;
  x: number;
  y: number;
}

export function BuildingPill({ info }: { info: BuildingInfo | null }) {
  if (!info) return null;
  return (
    <aside
      className="building-hover-pill rpg-signpost-pill"
      style={{ left: `${info.x}px`, top: `${info.y}px` }}
      role="status"
      aria-label={`${info.name}: ${info.func}`}
    >
      <div className="pill-sign-badge">
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
