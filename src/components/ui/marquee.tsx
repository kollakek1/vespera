"use client";

import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { useReducedMotionPreference } from "@/providers/reduced-motion-provider";

interface MarqueeProps {
  /** Одна копия ленты: <ul> или <div> с собственной раскладкой. */
  children: ReactNode;
  className?: string;
  paused?: boolean;
  label?: string;
  durationSec?: number;
}

/**
 * Лента с CSS-анимацией. Копия контента скрыта от скринридеров; при
 * reduce-motion анимации нет, вместо неё — горизонтальный скролл со snap.
 * Пауза по hover/focus-within — в globals.css, кнопка паузы — у вызывающего.
 */
export function Marquee({ children, className, paused = false, label, durationSec }: MarqueeProps) {
  const reduced = useReducedMotionPreference();

  return (
    <div
      className={cn("marquee", className)}
      role={label ? "region" : undefined}
      aria-label={label}
      data-marquee={reduced ? "static" : "animated"}
    >
      <div
        className="marquee-track"
        data-paused={paused ? "true" : "false"}
        style={durationSec ? { animationDuration: `${durationSec}s` } : undefined}
      >
        {children}
        {reduced ? null : (
          <div aria-hidden="true" className="contents">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
