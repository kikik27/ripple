import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { cardinalFromAnalog, type Cardinal } from "./input";

export function TouchJoystick({ onMove, disabled = false }: { onMove: (direction: Cardinal) => void; disabled?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [offset, setOffset] = useState<[number, number]>([0, 0]);
  const pointer = useRef<number | null>(null);
  const direction = useRef<Cardinal | null>(null);
  const repeat = useRef<number | null>(null);
  const callback = useRef(onMove);
  callback.current = onMove;

  const clear = () => {
    pointer.current = null;
    direction.current = null;
    setOffset([0, 0]);
    if (repeat.current !== null) window.clearInterval(repeat.current);
    repeat.current = null;
  };
  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setVisible(media.matches);
    const pointerMode = (event: PointerEvent) => { if (event.pointerType === "touch") setVisible(true); else if (event.pointerType === "mouse" && !media.matches) setVisible(false); };
    update(); media.addEventListener("change", update);
    const cancel = () => clear();
    const hidden = () => { if (document.hidden) clear(); };
    window.addEventListener("blur", cancel);
    window.addEventListener("pointerdown", pointerMode, true);
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("fullscreenchange", cancel);
    return () => { media.removeEventListener("change", update); window.removeEventListener("blur", cancel); window.removeEventListener("pointerdown", pointerMode, true); document.removeEventListener("visibilitychange", hidden); document.removeEventListener("fullscreenchange", cancel); clear(); };
  }, []);
  useEffect(() => { if (disabled) clear(); }, [disabled]);

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== pointer.current || disabled) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left - box.width / 2;
    const y = event.clientY - box.top - box.height / 2;
    const radius = Math.min(box.width, box.height) * 0.35;
    const length = Math.hypot(x, y);
    const scale = length > radius ? radius / length : 1;
    setOffset([x * scale, y * scale]);
    const next = cardinalFromAnalog(x, y, radius);
    if (next === direction.current) return;
    direction.current = next;
    if (repeat.current !== null) window.clearInterval(repeat.current);
    repeat.current = null;
    if (next) {
      callback.current(next);
      repeat.current = window.setInterval(() => { if (direction.current) callback.current(direction.current); }, 150);
    }
  };
  return <div className="touch-joystick" aria-label="Drag to move" role="group" hidden={!visible}
    onPointerDown={event => {
      if (disabled || pointer.current !== null) return;
      event.preventDefault(); pointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId); drag(event);
    }}
    onPointerMove={drag}
    onPointerUp={event => { if (event.pointerId === pointer.current) clear(); }}
    onPointerCancel={event => { if (event.pointerId === pointer.current) clear(); }}
    onLostPointerCapture={event => { if (event.pointerId === pointer.current) clear(); }}>
    <span className="touch-joystick-knob" style={{ transform: `translate(${offset[0]}px, ${offset[1]}px)` }} />
  </div>;
}
