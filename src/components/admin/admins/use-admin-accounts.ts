"use client";

import { useCallback, useEffect, useState } from "react";

import {
  OWNER_ONLY_MESSAGE,
  adminClient,
  isForbidden,
  isUnauthorized,
  type AdminAccount,
} from "@/lib/admin-client";

export type AdminsStatus = "loading" | "ready" | "error";

interface Params {
  enabled: boolean;
  onUnauthorized: () => void;
}

/**
 * Список администраторов. Раздел owner-only: 403 показываем текстом,
 * сессию не трогаем — владелец мог просто открыть чужую вкладку.
 */
export function useAdminAccounts({ enabled, onUnauthorized }: Params) {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [status, setStatus] = useState<AdminsStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    const load = async () => {
      setStatus((current) => (current === "ready" ? "ready" : "loading"));
      try {
        const response = await adminClient.listAdmins();
        if (!alive) return;
        setAdmins(response.admins);
        setStatus("ready");
        setError(null);
      } catch (caught: unknown) {
        if (!alive) return;
        if (isUnauthorized(caught)) {
          onUnauthorized();
          return;
        }
        setStatus("error");
        setError(
          isForbidden(caught) ? OWNER_ONLY_MESSAGE : "Не удалось загрузить список администраторов",
        );
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [enabled, nonce, onUnauthorized]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  return { admins, status, error, refresh };
}
