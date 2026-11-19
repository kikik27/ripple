import React, { useState } from "react";
import { TaskTitle } from "./GameUI";

export interface QuestItem {
  id: string;
  title: string;
  objective: string;
  current?: number;
  total?: number;
  ready?: boolean;
  done?: boolean;
}

export function QuestHUD({
  title = "Active Quests",
  quests,
  onOpenJournal,
  disabled = false,
}: {
  title?: string;
  quests: QuestItem[];
  onOpenJournal?: () => void;
  disabled?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (quests.length === 0) return null;

  return (
    <aside className="grove-quest-hud rpg-quest-hud rpg-board-style" role="region" aria-label="Active quests">
      <header className="quest-board-header">
        <img className="quest-board-icon" src="/assets/props/notice_board.png" alt="" aria-hidden="true" />
        <div className="quest-board-titles">
          <small>COMMUNITY LOG</small>
          <strong className="quest-board-name">{title}</strong>
        </div>
        <button
          className="quest-hud-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand quest list" : "Collapse quest list"}
        >
          {collapsed ? "＋" : "－"}
        </button>
      </header>

      {/* Button for test and mobile accessibility */}
      <button
        className="quest-open-btn"
        disabled={disabled}
        onClick={onOpenJournal}
      >
        Quests ({quests.filter((q) => !q.done).length})
      </button>

      {!collapsed && (
        <ul className="quest-board-list">
          {quests.map((q) => (
            <li
              key={q.id}
              className={`quest-board-item ${q.ready ? "is-ready" : ""} ${q.done ? "is-done" : ""}`}
              onClick={onOpenJournal}
            >
              <TaskTitle done={!!q.ready || !!q.done} title={q.title} />
              <small className="quest-task-detail">
                {q.objective} {q.total !== undefined ? `· ${q.current ?? 0}/${q.total}` : ""}
              </small>
              {q.ready && !q.done && (
                <span className="quest-ready-badge">★ Ready to turn in!</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
