"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Soft follower cursor (fine pointers only). Hides system cursor via globals when active.
 */
export function SmoothCursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const scaleTarget = useRef(1);
  const scaleCurrent = useRef(1);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) {
      return;
    }
    queueMicrotask(() => setEnabled(true));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const el = dotRef.current;
    if (!el) return;

    document.body.classList.add("dal-cursor-none");

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };

      const t = e.target as HTMLElement | null;
      const interactive = t?.closest(
        "button, a, input, textarea, select, label, [role='button'], [data-cursor-hover]"
      );

      // 🔧 reduced hover scale (was 1.28)
      scaleTarget.current = interactive ? 1.12 : 1;
    };

    const tick = () => {
      // 🔧 slightly smoother follow
      const k = 0.22;

      pos.current.x += (target.current.x - pos.current.x) * k;
      pos.current.y += (target.current.y - pos.current.y) * k;

      scaleCurrent.current += (scaleTarget.current - scaleCurrent.current) * 0.18;

      el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) translate(-50%, -50%) scale(${scaleCurrent.current})`;

      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    raf.current = requestAnimationFrame(tick);

    return () => {
      document.body.classList.remove("dal-cursor-none");
      window.removeEventListener("mousemove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={dotRef}
      className="pointer-events-none fixed left-0 top-0 z-[100] h-6 w-6 rounded-full border border-white/30 bg-white/[0.08] shadow-[0_0_10px_rgba(255,255,255,0.08)] backdrop-blur-md will-change-transform"
      style={{ transform: "translate3d(0,0,0) translate(-50%, -50%) scale(1)" }}
      aria-hidden
    />
  );
}