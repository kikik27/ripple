import React from "react";
import { ACHIEVEMENTS, getUnlockedAchievements } from "./achievements";

export function AchievementsList() {
  const unlocked = new Set(getUnlockedAchievements());
  return (
    <div className="grove-achievements">
      <header className="achievements-header">
        <h2>Trophies & Feats</h2>
        <span className="achievements-counter">{unlocked.size} of {ACHIEVEMENTS.length} Completed</span>
      </header>
      <ul className="achievements-list">
        {ACHIEVEMENTS.map((a) => {
          const isDone = unlocked.has(a.id);
          return (
            <li key={a.id} className={`achievement-card ${isDone ? "is-unlocked" : "is-locked"}`}>
              <img className="achievement-icon" src={a.icon} alt="" aria-hidden="true" />
              <div className="achievement-body">
                <div className="achievement-title-row">
                  <strong className="achievement-title">{a.title}</strong>
                  <span className="achievement-status">
                    {isDone ? (
                      <>
                        <img className="status-badge-icon" src="/assets/icons/icon_check.png" alt="" aria-hidden="true" />
                        <span>Complete</span>
                      </>
                    ) : (
                      <>
                        <img className="status-badge-icon" src="/assets/icons/icon_lock.png" alt="" aria-hidden="true" />
                        <span>Locked</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="achievement-desc">{a.desc}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
