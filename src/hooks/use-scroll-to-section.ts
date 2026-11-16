"use client";

import { useLenis } from "lenis/react";
import { useCallback } from "react";

import { useReducedMotionPreference } from "@/providers/reduced-motion-provider";

export const BOOKING_EVENT = "vespera:book";

export interface BookingIntent {
  serviceId?: string;
  masterId?: string;
}

/** Открыть запись с предвыбранной услугой/мастером. Слушает секция Booking. */
export function requestBooking(intent: BookingIntent = {}): void {
  window.dispatchEvent(new CustomEvent<BookingIntent>(BOOKING_EVENT, { detail: intent }));
}

export function useScrollToSection() {
  const lenis = useLenis();
  const reduced = useReducedMotionPreference();

  return useCallback(
    (id: string, options: { focus?: HTMLElement | null } = {}) => {
      const target = document.getElementById(id);
      if (!target) return;

      // Фокус переводим сразу и без нативного доводки: иначе браузер
      // перебивает плавный скролл и позиция прыгает.
      options.focus?.focus({ preventScroll: true });

      if (lenis) {
        lenis.scrollTo(target, { duration: 1.2 });
        return;
      }

      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    },
    [lenis, reduced],
  );
}
