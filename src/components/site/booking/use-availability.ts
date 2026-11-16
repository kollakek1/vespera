"use client";

import { useCallback, useEffect, useState } from "react";

import type { AvailabilityData } from "./types";

export type AvailabilityState =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: AvailabilityData; error: null }
  | { status: "error"; data: null; error: string };

const IDLE: AvailabilityState = { status: "idle", data: null, error: null };
const LOADING: AvailabilityState = { status: "loading", data: null, error: null };

function readMessage(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return null;
}

interface AvailabilityParams {
  serviceId: string | null;
  masterId: string | null;
  date: string | null;
  enabled: boolean;
}

interface Entry {
  /** Ключ запроса, к которому относится ответ. */
  key: string;
  state: AvailabilityState;
}

/**
 * Слоты на выбранный день.
 *
 * Ответ хранится вместе с ключом запроса, а состояние читается по текущему ключу:
 * при смене даты/мастера/услуги компонент сразу видит `loading`, а не слоты
 * предыдущего дня. Это дешевле и надёжнее, чем сбрасывать состояние эффектом —
 * между рендером и эффектом не остаётся кадра со старыми данными.
 */
export function useAvailability({ serviceId, masterId, date, enabled }: AvailabilityParams) {
  const [nonce, setNonce] = useState(0);
  const [entry, setEntry] = useState<Entry | null>(null);

  const active = enabled && Boolean(serviceId && masterId && date);
  const key = active ? `${serviceId}|${masterId}|${date}|${nonce}` : null;

  useEffect(() => {
    if (!active || !key || !serviceId || !masterId || !date) return;

    const controller = new AbortController();
    const query = new URLSearchParams({ serviceId, masterId, date });

    const load = async () => {
      try {
        const response = await fetch(`/api/booking/availability?${query.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(readMessage(body) ?? "Не удалось загрузить окна");
        if (controller.signal.aborted) return;
        setEntry({ key, state: { status: "success", data: body as AvailabilityData, error: null } });
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEntry({
          key,
          state: {
            status: "error",
            data: null,
            error: error instanceof Error ? error.message : "Не удалось загрузить окна",
          },
        });
      }
    };

    void load();

    return () => controller.abort();
  }, [active, key, serviceId, masterId, date]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  // Ключ не совпал с ответом → данных для текущего запроса ещё нет.
  const state: AvailabilityState = !active ? IDLE : entry?.key === key ? entry.state : LOADING;

  return { state, refresh };
}
