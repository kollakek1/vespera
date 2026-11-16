"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

const ReducedMotionContext = createContext(false);

/**
 * Единственный источник правды про `prefers-reduced-motion`: читается через
 * `useSyncExternalStore`, поэтому не мигает при гидратации и переживает
 * переключение настройки в системе без перезагрузки.
 */
export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <ReducedMotionContext.Provider value={reduced}>{children}</ReducedMotionContext.Provider>;
}

export function useReducedMotionPreference(): boolean {
  return useContext(ReducedMotionContext);
}
