"use client";

import { ReactLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { LanternCursor } from "@/components/site/lantern-cursor";
import { ReducedMotionProvider, useReducedMotionPreference } from "@/providers/reduced-motion-provider";

/**
 * Админка — рабочий инструмент: внутри неё есть свои скролл-контейнеры
 * (панель брони, bottom-sheet, выпадающие списки). Lenis перехватывает колесо
 * на документе и не даёт им прокручиваться, поэтому на `/admin/**` он не создаётся.
 */
function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionPreference();
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || (pathname?.startsWith("/admin/") ?? false);

  // Без reduced-motion Lenis живёт на нативном скролле: sticky и якоря работают,
  // но колесо получает инерцию. При reduce он не инициализируется вообще.
  if (reduced || isAdmin) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        duration: 1.05,
        easing: (time: number) => 1 - Math.pow(1 - time, 3),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.4,
        anchors: false,
      }}
    >
      {children}
    </ReactLenis>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ReducedMotionProvider>
      <SmoothScroll>{children}</SmoothScroll>
      <LanternCursor />
      <div className="grain-overlay" aria-hidden="true" />
    </ReducedMotionProvider>
  );
}
