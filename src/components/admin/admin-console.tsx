"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { STATUS_LABELS } from "@/lib/admin-api";
import {
  AdminApiError,
  adminClient,
  adminErrorMessage,
  isUnauthorized,
  type AdminBookingView,
  type SessionAdmin,
} from "@/lib/admin-client";
import { isBookingStatus, type BookingStatus } from "@/lib/booking";
import { resolveMaster } from "@/lib/studio";
import { cn } from "@/components/ui/cn";
import { AdminsSection } from "./admins/admins-section";
import { AdminBootScreen } from "./admin-boot-screen";
import { AdminButton, Skeleton, Toast, type ToastMessage } from "./admin-ui";
import { BookingPanel } from "./booking-panel";
import { ConsoleHeader, type AdminSection, type AdminView } from "./console-header";
import { DayTimeline } from "./day-timeline";
import { ManualBookingDialog } from "./manual-booking-dialog";
import { MonthCalendar } from "./month-calendar";
import { StudioSection } from "./studio/studio-section";
import { SummaryTiles } from "./summary-tiles";
import { useAdminData } from "./use-admin-data";
import { useMediaQuery } from "./use-media-query";
import { isIsoDate, isMonthKey, monthOf, shiftDate, shiftMonth, todayKey } from "./dates";

interface InitialState {
  section: AdminSection;
  month: string;
  view: AdminView;
  date: string;
  masterId: string;
  status: string;
}

function parseInitial(search: URLSearchParams): InitialState {
  const today = todayKey();
  const monthParam = search.get("month") ?? "";
  const dateParam = search.get("date") ?? "";
  const sectionParam = search.get("section");
  const section: AdminSection =
    sectionParam === "studio" || sectionParam === "admins" ? sectionParam : "calendar";
  const view: AdminView = search.get("view") === "day" ? "day" : "month";
  const date = isIsoDate(dateParam) ? dateParam : today;

  const masterParam = search.get("masterId") ?? "all";
  const resolved = resolveMaster(masterParam);
  const masterId = masterParam === "all" || !resolved ? "all" : resolved.id;

  const statusParam = search.get("status") ?? "all";
  const status = statusParam === "all" || isBookingStatus(statusParam) ? statusParam : "all";

  const month =
    view === "day"
      ? monthOf(date)
      : isMonthKey(monthParam)
        ? monthParam
        : monthOf(today);

  return { section, month, view, date, masterId, status };
}

function CalendarSkeleton() {
  return (
    <div aria-hidden="true" className="border border-line">
      <div className="grid grid-cols-7 border-b border-line">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-9" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-line">
        {Array.from({ length: 35 }, (_, index) => (
          <Skeleton key={index} className="min-h-[72px] bg-bg sm:min-h-[92px]" />
        ))}
      </div>
    </div>
  );
}

export function AdminConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wide = useMediaQuery("(min-width: 1280px)");

  const [initial] = useState(() => parseInitial(new URLSearchParams(searchParams.toString())));

  const [month, setMonth] = useState(initial.month);
  const [view, setView] = useState<AdminView>(initial.view);
  const [section, setSection] = useState<AdminSection>(initial.section);
  const [date, setDate] = useState(initial.date);
  const [masterId, setMasterId] = useState(initial.masterId);
  const [status, setStatus] = useState(initial.status);
  const [focusDate, setFocusDate] = useState(initial.view === "day" ? initial.date : initial.date);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [dayFocusRequest, setDayFocusRequest] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [auth, setAuth] = useState<"checking" | "ready">("checking");
  const [sessionAdmin, setSessionAdmin] = useState<SessionAdmin | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [mutating, setMutating] = useState<string | null>(null);

  const goToLogin = useCallback(() => {
    router.replace("/admin/login");
  }, [router]);

  useEffect(() => {
    let alive = true;
    adminClient
      .checkSession()
      .then((session) => {
        if (!alive) return;
        if (!session.authenticated) {
          goToLogin();
          return;
        }
        setSessionAdmin(session.admin ?? null);
        setAuth("ready");
      })
      .catch(() => {
        if (alive) goToLogin();
      });
    return () => {
      alive = false;
    };
  }, [goToLogin]);

  const data = useAdminData({
    month,
    masterId,
    status,
    enabled: auth === "ready" && section === "calendar",
    onUnauthorized: goToLogin,
  });

  const { patchBooking, refresh } = data;

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("month", month);
    params.set("view", view);
    if (view === "day") params.set("date", date);
    if (masterId !== "all") params.set("masterId", masterId);
    if (status !== "all") params.set("status", status);
    if (section !== "calendar") params.set("section", section);
    window.history.replaceState(null, "", `/admin?${params.toString()}`);
  }, [month, view, date, masterId, status, section]);

  const showToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    setToast({ id: Date.now(), tone, text });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const stats = useMemo(() => {
    const list = view === "day" ? data.bookings.filter((booking) => booking.date === date) : data.bookings;
    let revenue = 0;
    let cancelled = 0;
    let noShow = 0;

    for (const booking of list) {
      if (booking.status === "confirmed" || booking.status === "completed") revenue += booking.priceRub;
      if (booking.status === "cancelled") cancelled += 1;
      if (booking.status === "no_show") noShow += 1;
    }

    return { list, total: list.length, revenue, cancelled, noShow };
  }, [data.bookings, view, date]);

  const loadPercent =
    view === "day"
      ? (data.calendar?.days.find((day) => day.date === date)?.loadPercent ?? 0)
      : (data.calendar?.summary.loadPercent ?? 0);

  const selected = useMemo(
    () => data.bookings.find((booking) => booking.code === selectedCode) ?? null,
    [data.bookings, selectedCode],
  );

  const onShift = useCallback(
    (delta: number) => {
      setSelectedCode(null);
      if (view === "month") {
        const next = shiftMonth(month, delta);
        setMonth(next);
        setFocusDate(`${next}-01`);
        return;
      }
      const next = shiftDate(date, delta);
      setDate(next);
      setMonth(monthOf(next));
      setFocusDate(next);
    },
    [view, month, date],
  );

  const onToday = useCallback(() => {
    const today = todayKey();
    setMonth(monthOf(today));
    setDate(today);
    setFocusDate(today);
    setSelectedCode(null);
  }, []);

  const onView = useCallback(
    (next: AdminView) => {
      setView(next);
      setSelectedCode(null);
      if (next === "day") {
        const candidate = monthOf(focusDate) === month ? focusDate : `${month}-01`;
        setDate(candidate);
      }
    },
    [focusDate, month],
  );

  const onSelectDate = useCallback((key: string) => {
    setDate(key);
    setMonth(monthOf(key));
    setFocusDate(key);
    setView("day");
    setSelectedCode(null);
    // После смены вида фокусируем заголовок дня: иначе фокус уходит в <body>.
    setDayFocusRequest((value) => value + 1);
  }, []);

  const onMaster = useCallback((nextId: string) => {
    setMasterId(nextId);
    setSelectedCode(null);
  }, []);

  const onStatus = useCallback((nextStatus: string) => {
    setStatus(nextStatus);
    setSelectedCode(null);
  }, []);

  const onSection = useCallback((next: AdminSection) => {
    setSection(next);
    setSelectedCode(null);
    setManualOpen(false);
  }, []);

  const onChangeStatus = useCallback(
    async (booking: AdminBookingView, next: BookingStatus) => {
      setMutating(booking.code);
      patchBooking(booking.code, { status: next });
      try {
        const response = await adminClient.updateBooking(booking.code, { status: next });
        patchBooking(booking.code, response.booking);
        showToast("success", `${booking.code}: ${STATUS_LABELS[next]}`);
        refresh();
      } catch (error: unknown) {
        patchBooking(booking.code, { status: booking.status });
        if (isUnauthorized(error)) {
          goToLogin();
          return;
        }
        const message =
          error instanceof AdminApiError
            ? error.code === "slot_taken"
              ? "Это время уже занято другой записью — сначала отмените её"
              : adminErrorMessage(error, "Не удалось изменить статус")
            : "Не удалось изменить статус";
        showToast("error", message);
      } finally {
        setMutating(null);
      }
    },
    [patchBooking, refresh, showToast, goToLogin],
  );

  const onSaveNote = useCallback(
    async (booking: AdminBookingView, note: string) => {
      try {
        const response = await adminClient.updateBooking(booking.code, {
          status: booking.status,
          note: note.length > 0 ? note : null,
        });
        patchBooking(booking.code, response.booking);
        showToast("success", "Заметка сохранена");
        refresh();
      } catch (error: unknown) {
        if (isUnauthorized(error)) {
          goToLogin();
          throw error;
        }
        showToast("error", adminErrorMessage(error, "Не удалось сохранить заметку"));
        throw error;
      }
    },
    [patchBooking, refresh, showToast, goToLogin],
  );

  const onCreated = useCallback(
    (booking: AdminBookingView) => {
      setManualOpen(false);
      setMonth(monthOf(booking.date));
      setDate(booking.date);
      setFocusDate(booking.date);
      setView("day");
      setStatus("all");
      setSelectedCode(booking.code);
      showToast("success", `Запись ${booking.code} создана`);
      refresh();
    },
    [refresh, showToast],
  );

  const onLogout = useCallback(async () => {
    try {
      await adminClient.logout();
    } catch {
      // Даже если сеть отвалилась, уводим на логин: cookie могла уже истечь.
    }
    router.replace("/admin/login");
  }, [router]);

  if (auth === "checking") return <AdminBootScreen />;

  const loading = data.status === "loading" && !data.calendar;

  return (
    <div className="flex min-h-svh flex-col">
      <h1 className="sr-only">Консоль студии VESPERA</h1>
      <ConsoleHeader
        section={section}
        view={view}
        month={month}
        date={date}
        masterId={masterId}
        status={status}
        masters={data.masters}
        canManageAdmins={sessionAdmin?.role === "owner"}
        onSection={onSection}
        onView={onView}
        onShift={onShift}
        onToday={onToday}
        onMaster={onMaster}
        onStatus={onStatus}
        onManual={() => setManualOpen(true)}
        onLogout={onLogout}
      />

      <main className="mx-auto w-full max-w-[1560px] flex-1 px-4 pb-16 pt-4 md:px-6">
        {section === "studio" ? (
          <StudioSection onToast={showToast} onUnauthorized={goToLogin} />
        ) : section === "admins" ? (
          <AdminsSection
            currentAdminId={sessionAdmin?.id ?? null}
            onToast={showToast}
            onUnauthorized={goToLogin}
          />
        ) : (
          <>
            <SummaryTiles
              view={view}
              month={month}
              date={date}
              total={stats.total}
              revenueRub={stats.revenue}
              loadPercent={loadPercent}
              cancelled={stats.cancelled}
              noShow={stats.noShow}
            />

        <div
          className={cn(
            "mt-4 grid items-start gap-4",
            selected && wide && "xl:grid-cols-[minmax(0,1fr)_400px]",
          )}
        >
          <div className="min-w-0">
            {data.status === "error" ? (
              <div className="mb-3 border border-line bg-surface px-4 py-3">
                <p role="alert" className="text-[13px] text-text">
                  {data.error ?? "Не удалось загрузить данные"}
                </p>
                <AdminButton size="sm" className="mt-3" onClick={data.refresh}>
                  Повторить
                </AdminButton>
              </div>
            ) : null}

            {loading ? (
              <CalendarSkeleton />
            ) : view === "month" ? (
              <MonthCalendar
                month={month}
                days={data.calendar?.days ?? []}
                focusDate={focusDate}
                today={todayKey()}
                onFocusDate={setFocusDate}
                onSelectDate={onSelectDate}
                onMonthShift={(delta) => onShift(delta)}
              />
            ) : (
              <DayTimeline
                date={date}
                bookings={stats.list}
                focusRequest={dayFocusRequest}
                onSelect={setSelectedCode}
                onManual={() => setManualOpen(true)}
                onShift={onShift}
              />
            )}
          </div>

          {selected && wide ? (
            <div className="min-w-0">
              <BookingPanel
                key={`aside-${selected.code}`}
                booking={selected}
                variant="aside"
                busy={mutating === selected.code}
                onClose={() => setSelectedCode(null)}
                onChangeStatus={(next) => onChangeStatus(selected, next)}
                onSaveNote={(note) => onSaveNote(selected, note)}
              />
            </div>
          ) : null}
        </div>
          </>
        )}
      </main>

      {section === "calendar" && selected && !wide ? (
        <BookingPanel
          key={`sheet-${selected.code}`}
          booking={selected}
          variant="sheet"
          busy={mutating === selected.code}
          onClose={() => setSelectedCode(null)}
          onChangeStatus={(next) => onChangeStatus(selected, next)}
          onSaveNote={(note) => onSaveNote(selected, note)}
        />
      ) : null}

      {section === "calendar" && manualOpen ? (
        <ManualBookingDialog
          initialDate={date}
          onClose={() => setManualOpen(false)}
          onCreated={onCreated}
          onUnauthorized={goToLogin}
        />
      ) : null}

      <Toast message={toast} onDismiss={dismissToast} />
    </div>
  );
}
