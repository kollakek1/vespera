"use client";

import { useCallback, useEffect, useState } from "react";

import {
  OWNER_ONLY_MESSAGE,
  adminClient,
  isForbidden,
  isUnauthorized,
  type StudioMaster,
  type StudioService,
} from "@/lib/admin-client";

export type StudioDataStatus = "loading" | "ready" | "error";

interface Params {
  enabled: boolean;
  onUnauthorized: () => void;
}

/** Каталог услуг и мастеров: только живые записи. */
export function useStudioData({ enabled, onUnauthorized }: Params) {
  const [services, setServices] = useState<StudioService[]>([]);
  const [masters, setMasters] = useState<StudioMaster[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<StudioDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    const load = async () => {
      setStatus((current) => (current === "ready" ? "ready" : "loading"));
      try {
        const response = await adminClient.studio();
        if (!alive) return;
        setServices(response.services);
        setMasters(response.masters);
        setUpdatedAt(response.updatedAt);
        setStatus("ready");
        setError(null);
      } catch (caught: unknown) {
        if (!alive) return;
        if (isUnauthorized(caught)) {
          onUnauthorized();
          return;
        }
        setStatus("error");
        setError(isForbidden(caught) ? OWNER_ONLY_MESSAGE : "Не удалось загрузить каталог студии");
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [enabled, nonce, onUnauthorized]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  return { services, masters, updatedAt, status, error, refresh };
}
