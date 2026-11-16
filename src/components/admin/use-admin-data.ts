"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AdminApiError,
  adminClient,
  isForbidden,
  isUnauthorized,
  OWNER_ONLY_MESSAGE,
  type AdminBookingView,
  type AdminMasterOption,
  type CalendarResponse,
} from "@/lib/admin-client";
import { monthRange } from "@/components/admin/dates";

export type AdminDataStatus = "loading" | "ready" | "error";

interface Params {
  month: string;
  masterId: string;
  status: string;
  enabled: boolean;
  onUnauthorized: () => void;
}

interface Snapshot {
  calendar: CalendarResponse | null;
  bookings: AdminBookingView[];
  masters: AdminMasterOption[];
}

const EMPTY: Snapshot = { calendar: null, bookings: [], masters: [] };

/** Календарь месяца + список броней за тот же месяц: одна загрузка на фильтры. */
export function useAdminData({ month, masterId, status, enabled, onUnauthorized }: Params) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [statusState, setStatusState] = useState<AdminDataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    let alive = true;
    const range = monthRange(month);

    const load = async () => {
      setStatusState((current) => (current === "ready" ? "ready" : "loading"));
      try {
        const [calendar, list] = await Promise.all([
          adminClient.calendar(month, masterId),
          adminClient.bookings({ from: range.from, to: range.to, masterId, status }),
        ]);
        if (!alive || controller.signal.aborted) return;
        setSnapshot({ calendar, bookings: list.bookings, masters: list.masters });
        setStatusState("ready");
        setError(null);
      } catch (caught: unknown) {
        if (!alive || controller.signal.aborted) return;
        if (isUnauthorized(caught)) {
          onUnauthorized();
          return;
        }
        setStatusState("error");
        setError(
          isForbidden(caught)
            ? OWNER_ONLY_MESSAGE
            : caught instanceof AdminApiError
              ? caught.message
              : "Не удалось загрузить данные консоли. Проверьте соединение",
        );
      }
    };

    void load();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [month, masterId, status, enabled, nonce, onUnauthorized]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  const patchBooking = useCallback((code: string, patch: Partial<AdminBookingView>) => {
    setSnapshot((current) => ({
      ...current,
      bookings: current.bookings.map((booking) =>
        booking.code === code ? { ...booking, ...patch } : booking,
      ),
    }));
  }, []);

  const replaceBookings = useCallback((bookings: AdminBookingView[]) => {
    setSnapshot((current) => ({ ...current, bookings }));
  }, []);

  return {
    calendar: snapshot.calendar,
    bookings: snapshot.bookings,
    masters: snapshot.masters,
    status: statusState,
    error,
    refresh,
    patchBooking,
    replaceBookings,
  };
}
