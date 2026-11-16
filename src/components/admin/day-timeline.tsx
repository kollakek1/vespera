"use client";

import { useEffect, useMemo, useRef, type PointerEvent } from "react";

import type { AdminBookingView } from "@/lib/admin-client";
import { cn } from "@/components/ui/cn";
import { AdminButton } from "@/components/admin/admin-ui";
import {
  formatDayLong,
  formatMinutes,
  formatMoney,
  minutesOf,
  plural,
} from "@/components/admin/dates";

const START_MINUTES = 12 * 60;
const END_MINUTES = 22 * 60;
const STEP_MINUTES = 30;
const PX_PER_MINUTE = 1.1;
const TRACK_HEIGHT = (END_MINUTES - START_MINUTES) * PX_PER_MINUTE;

interface DayTimelineProps {
  date: string;
  bookings: AdminBookingView[];
  /** Счётчик переходов из месячного вида: каждый новый требует фокус на заголовке дня. */
  focusRequest?: number;
  onSelect: (code: string) => void;
  onManual: () => void;
  onShift: (delta: number) => void;
}

interface LanedBooking {
  booking: AdminBookingView;
  lane: number;
  laneCount: number;
  top: number;
  height: number;
}

function assignLanes(bookings: AdminBookingView[]): LanedBooking[] {
  const sorted = [...bookings].sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  const laneEnds: number[] = [];
  const placed: { booking: AdminBookingView; lane: number }[] = [];

  for (const booking of sorted) {
    const start = minutesOf(booking.time);
    const end = start + booking.durationMin;
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    placed.push({ booking, lane });
  }

  const laneCount = Math.max(1, laneEnds.length);

  return placed.map(({ booking, lane }) => {
    const start = minutesOf(booking.time);
    return {
      booking,
      lane,
      laneCount,
      top: Math.max(0, (start - START_MINUTES) * PX_PER_MINUTE),
      height: Math.max(34, booking.durationMin * PX_PER_MINUTE - 3),
    };
  });
}

export function DayTimeline({
  date,
  bookings,
  focusRequest = 0,
  onSelect,
  onManual,
  onShift,
}: DayTimelineProps) {
  const dragRef = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const laned = useMemo(() => assignLanes(bookings), [bookings]);

  useEffect(() => {
    if (focusRequest > 0) headingRef.current?.focus({ preventScroll: true });
  }, [focusRequest]);

  const slots = useMemo(() => {
    const result: number[] = [];
    for (let minute = START_MINUTES; minute < END_MINUTES; minute += STEP_MINUTES) {
      result.push(minute);
    }
    return result;
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") return;
    dragRef.current = { x: event.clientX, y: event.clientY, active: true };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || !drag.active || event.pointerType !== "touch") return;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      onShift(dx < 0 ? 1 : -1);
    }
  };

  return (
    <section aria-label={`Расписание на ${formatDayLong(date)}`}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-h3 font-light text-text first-letter:uppercase"
        >
          {formatDayLong(date)}
        </h2>
        <p className="text-[12px] text-text-muted tabular-nums">
          12:00–22:00 · {bookings.length} {plural(bookings.length, ["запись", "записи", "записей"])}
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border border-line bg-surface px-4 py-3">
          <p className="text-[13px] text-text">На этот день записей нет.</p>
          <AdminButton size="sm" variant="ghost" onClick={onManual}>
            Записать вручную
          </AdminButton>
        </div>
      ) : null}

      <div
        className="touch-pan-y select-none border border-line pb-3 pt-3"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        <div className="relative" style={{ height: TRACK_HEIGHT }}>
          {slots.map((minute) => (
            <div
              key={minute}
              aria-hidden="true"
              className="absolute inset-x-0 flex items-start"
              style={{ top: (minute - START_MINUTES) * PX_PER_MINUTE }}
            >
              <span className="w-14 shrink-0 -translate-y-1/2 pr-2 text-right text-micro tabular-nums text-text-muted">
                {formatMinutes(minute)}
              </span>
              <span className="mt-0 h-px flex-1 bg-line" />
            </div>
          ))}

          <div
            aria-hidden="true"
            className="absolute inset-x-0 flex items-start"
            style={{ top: TRACK_HEIGHT }}
          >
            <span className="w-14 shrink-0 -translate-y-1/2 pr-2 text-right text-micro tabular-nums text-text-muted">
              {formatMinutes(END_MINUTES)}
            </span>
            <span className="mt-0 h-px flex-1 bg-line-strong" />
          </div>

          <div className="absolute inset-y-0 left-14 right-0">
            {laned.map(({ booking, lane, laneCount, top, height }) => {
              const cancelled = booking.status === "cancelled";
              const muted = cancelled || booking.status === "no_show";

              return (
                <button
                  key={booking.code}
                  type="button"
                  onClick={() => onSelect(booking.code)}
                  aria-label={`${booking.time}, ${booking.name}, ${booking.service?.name ?? "услуга"}, ${booking.durationMin} минут, ${formatMoney(booking.priceRub)}`}
                  style={{
                    top,
                    height,
                    left: `calc(${(lane * 100) / laneCount}% + 2px)`,
                    width: `calc(${100 / laneCount}% - 6px)`,
                  }}
                  className={cn(
                    "admin-timeline-card absolute flex flex-col justify-start rounded-field border px-2 py-1 text-left transition-colors duration-[180ms] ease-brand",
                    muted
                      ? "border-line bg-bg text-text-muted hover:border-line-strong"
                      : "border-line-strong bg-surface text-text hover:border-control-border hover:bg-surface-hover",
                    cancelled && "border-dashed",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2 text-[12px] tabular-nums">
                    <span>{booking.time}</span>
                    <span className={cn("truncate", muted ? "text-text-muted" : "text-text-muted")}>
                      {booking.master?.name.split(" ")[0]}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] leading-tight">{booking.name}</span>
                  {height > 60 ? (
                    <span className="mt-1 block truncate text-[12px] text-text-muted">
                      {booking.service?.name}
                      {booking.status !== "confirmed" ? " · слот свободен" : ""}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-2 text-[12px] text-text-muted">
        Свайп влево или вправо переключает день. Карточки вне статуса «подтверждена» слот не занимают.
      </p>
    </section>
  );
}
