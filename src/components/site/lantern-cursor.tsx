"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotionPreference } from "@/providers/reduced-motion-provider";

const QUERY = "(hover: hover) and (pointer: fine) and (min-width: 1024px)";
const SIZE = 520;
const LERP = 0.12;
/** Ниже этого расстояния фонарь догнал курсор — цикл можно остановить. */
const EPSILON = 0.4;

/** Курсор-фонарь: только desktop с точным указателем и без reduced-motion. */
export function LanternCursor() {
  const reduced = useReducedMotionPreference();
  const [enabled, setEnabled] = useState(false);
  const lanternRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const sync = () => setEnabled(media.matches && !reduced);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [reduced]);

  useEffect(() => {
    const element = lanternRef.current;
    if (!enabled || !element) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const paint = () => {
      element.style.transform = `translate3d(${currentX - SIZE / 2}px, ${currentY - SIZE / 2}px, 0)`;
    };

    const stop = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const tick = () => {
      const deltaX = targetX - currentX;
      const deltaY = targetY - currentY;

      // Догнали курсор — пишем финальную позицию и выходим из цикла.
      // Дальше кадры не нужны: указатель не двигался, transform не меняется.
      if (Math.abs(deltaX) < EPSILON && Math.abs(deltaY) < EPSILON) {
        currentX = targetX;
        currentY = targetY;
        paint();
        frame = 0;
        return;
      }

      currentX += deltaX * LERP;
      currentY += deltaY * LERP;
      paint();
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame === 0) frame = window.requestAnimationFrame(tick);
    };

    const handleMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;

      if (element.style.opacity !== "1") {
        // Первое появление: без рывка из левого верхнего угла.
        currentX = targetX;
        currentY = targetY;
        paint();
        element.style.opacity = "1";
        return;
      }

      start();
    };

    const handleLeave = () => {
      element.style.opacity = "0";
      stop();
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    document.addEventListener("pointerleave", handleLeave);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      window.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerleave", handleLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled]);

  if (!enabled) return null;

  return <div ref={lanternRef} className="lantern" aria-hidden="true" />;
}
