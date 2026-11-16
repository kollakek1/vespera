"use client";

import { useState } from "react";

import { STUDIO_HOURS, type StudioMaster } from "@/lib/studio";
import { cn } from "@/components/ui/cn";
import {
  dayNumber,
  daysInMonth,
  formatDateLong,
  formatMonthTitle,
  formatWeekdayShort,
  keyOf,
  monthOf,
  monthStartOffset,
  shiftDate,
  todayKey,
  weekdayOf,
} from "./dates";
import type { AvailabilityState } from "./use-availability";

const WEEK_HEADER = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const STRIP_DAYS = 14;

const SLOT_GROUPS = [
  { id: "day", title: "День", from: 12 * 60, to: 15 * 60 },
  { id: "evening", title: "Вечер", from: 15 * 60, to: 18 * 60 },
  { id: "late", title: "Поздний вечер", from: 18 * 60, to: 24 * 60 },
];

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function reasonMessage(reason?: string): string | null {
  switch (reason) {
    case "day_off":
      return "Мастер не работает в этот день.";
    case "date_in_past":
      return "Эта дата уже прошла.";
    case "date_out_of_range":
      return `Запись открыта на ${STUDIO_HOURS.bookingHorizonDays} дней вперёд.`;
    case "master_not_assigned":
      return "Мастер не выполняет эту услугу.";
    default:
      return null;
  }
}

interface StepDateTimeProps {
  /** Мастер из каталога: рабочие дни нужны для календаря. */
  master: StudioMaster | null;
  date: string | null;
  time: string | null;
  onDate: (key: string) => void;
  onTime: (time: string) => void;
  availability: AvailabilityState;
  onRefresh: () => void;
}

export function StepDateTime({
  master,
  date,
  time,
  onDate,
  onTime,
  availability,
  onRefresh,
}: StepDateTimeProps) {
  const today = todayKey();
  const horizon = shiftDate(today, STUDIO_HOURS.bookingHorizonDays);

  const [view, setView] = useState(() => monthOf(date ?? today));
  const [syncedDate, setSyncedDate] = useState(date);

  // Дата может прийти снаружи (CTA мастера, первый рабочий день): календарь
  // обязан показать её месяц. Правим состояние во время рендера, а не эффектом:
  // так нет лишнего кадра, в котором виден чужой месяц.
  if (date !== syncedDate) {
    setSyncedDate(date);
    if (date) {
      const next = monthOf(date);
      if (next.year !== view.year || next.month !== view.month) setView(next);
    }
  }

  const chooseDate = (key: string) => {
    setView(monthOf(key));
    onDate(key);
  };

  const isDisabled = (key: string): boolean => {
    if (key < today || key > horizon) return true;
    if (!master) return false;
    const weekday = weekdayOf(key);
    return !master.workingDays.some((day) => day === weekday);
  };

  const todayMonth = monthOf(today);
  const atFirstMonth = view.year === todayMonth.year && view.month === todayMonth.month;
  const atLastMonth = keyOf(view.year, view.month, 1) >= horizon;

  const offset = monthStartOffset(view.year, view.month);
  const total = daysInMonth(view.year, view.month);
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, index) => keyOf(view.year, view.month, index + 1)),
  ];

  const strip = Array.from({ length: STRIP_DAYS }, (_, index) => shiftDate(today, index));

  const availableSlots =
    availability.status === "success" ? availability.data.slots.filter((slot) => slot.available) : [];

  const groups = SLOT_GROUPS.map((group) => {
    const items = availableSlots.filter((slot) => {
      const minutes = minutesOf(slot.time);
      return minutes >= group.from && minutes < group.to;
    });
    const first = items[0]?.time;
    const last = items[items.length - 1]?.time;
    return {
      ...group,
      items,
      label: first && last ? `${group.title} ${first}–${last}` : group.title,
    };
  }).filter((group) => group.items.length > 0);

  const neighborDates: string[] = [];
  if (date) {
    let cursor = shiftDate(date, 1);
    for (let index = 0; index < 21 && neighborDates.length < 2; index += 1) {
      if (!isDisabled(cursor)) neighborDates.push(cursor);
      cursor = shiftDate(cursor, 1);
    }
  }

  return (
    <fieldset className="min-w-0">
      <legend className="text-micro font-medium uppercase text-text-muted">
        03 · Дата и время
      </legend>

      <div className="mt-4">
        <div className="hidden w-full max-w-[332px] md:block">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              aria-label="Предыдущий месяц"
              disabled={atFirstMonth}
              onClick={() => {
                const date0 = new Date(Date.UTC(view.year, view.month - 1, 1));
                setView({ year: date0.getUTCFullYear(), month: date0.getUTCMonth() });
              }}
              className="inline-flex size-11 items-center justify-center rounded-field border border-control-border text-text transition-colors duration-[240ms] ease-brand hover:border-sand/60 hover:bg-surface disabled:cursor-not-allowed disabled:border-line disabled:text-text-disabled"
            >
              <span aria-hidden="true">←</span>
            </button>
            <p className="text-small font-medium capitalize text-text">
              {formatMonthTitle(view.year, view.month)}
            </p>
            <button
              type="button"
              aria-label="Следующий месяц"
              disabled={atLastMonth}
              onClick={() => {
                const next = new Date(Date.UTC(view.year, view.month + 1, 1));
                setView({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
              }}
              className="inline-flex size-11 items-center justify-center rounded-field border border-control-border text-text transition-colors duration-[240ms] ease-brand hover:border-sand/60 hover:bg-surface disabled:cursor-not-allowed disabled:border-line disabled:text-text-disabled"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <div className="mt-4 grid w-full max-w-[332px] grid-cols-7 gap-1">
            {WEEK_HEADER.map((day) => (
              <span
                key={day}
                aria-hidden="true"
                className="flex h-8 items-center justify-center text-micro font-medium uppercase text-text-muted"
              >
                {day}
              </span>
            ))}

            {cells.map((key, index) =>
              key ? (
                <button
                  key={key}
                  type="button"
                  aria-pressed={key === date}
                  aria-label={formatDateLong(key)}
                  disabled={isDisabled(key)}
                  onClick={() => chooseDate(key)}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-field text-small tabular-nums transition-colors duration-[240ms] ease-brand",
                    key === date
                      ? "bg-text text-bg"
                      : "text-text hover:bg-surface-hover",
                    isDisabled(key) && "cursor-not-allowed text-text-disabled hover:bg-transparent",
                  )}
                >
                  {dayNumber(key)}
                </button>
              ) : (
                <span key={`empty-${index}`} aria-hidden="true" />
              ),
            )}
          </div>
        </div>

        <div className="md:hidden">
          <div className="no-scrollbar -mx-gutter flex snap-x snap-mandatory gap-2 overflow-x-auto px-gutter pb-1">
            {strip.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={key === date}
                aria-label={formatDateLong(key)}
                disabled={isDisabled(key)}
                onClick={() => chooseDate(key)}
                className={cn(
                  "flex h-20 w-16 shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-field border transition-colors duration-[240ms] ease-brand",
                  key === date ? "border-transparent bg-text text-bg" : "border-line-strong text-text",
                  isDisabled(key) && "cursor-not-allowed border-line text-text-disabled",
                )}
              >
                <span className="text-micro font-medium uppercase">{formatWeekdayShort(key)}</span>
                <span className="text-[20px] leading-none tabular-nums">{dayNumber(key)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-block">
        {date ? (
          <p className="text-small text-text-muted">{formatDateLong(date)}</p>
        ) : (
          <p className="text-small text-text-muted">Выберите дату.</p>
        )}

        {availability.status === "loading" ? (
          <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} className="h-12 rounded-field bg-surface-hover" />
            ))}
          </div>
        ) : null}

        {availability.status === "error" ? (
          <p className="mt-3 text-small text-text-muted">
            Не удалось загрузить окна.{" "}
            <button
              type="button"
              onClick={onRefresh}
              className="min-h-[44px] text-accent-text underline decoration-line-strong underline-offset-4 transition-colors duration-[240ms] ease-brand hover:decoration-accent-text"
            >
              Повторить
            </button>
          </p>
        ) : null}

        {availability.status === "success" && groups.length === 0 ? (
          <div className="mt-3">
            <p className="text-small text-text-muted">
              {reasonMessage(availability.data.reason) ??
                "На этот день окон нет. Посмотрите соседние даты."}
            </p>
            {neighborDates.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {neighborDates.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => chooseDate(key)}
                    className="inline-flex min-h-11 items-center rounded-field border border-line-strong px-4 text-small tabular-nums text-text transition-colors duration-[240ms] ease-brand hover:border-control-border hover:bg-surface"
                  >
                    {formatDateLong(key)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {availability.status === "success" && groups.length > 0 ? (
          <div className="mt-4 flex flex-col gap-5">
            {groups.map((group) => (
              <div key={group.id} role="group" aria-labelledby={`slot-${group.id}`}>
                <p
                  id={`slot-${group.id}`}
                  className="text-micro font-medium uppercase text-text-muted"
                >
                  {group.label}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-4">
                  {group.items.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      aria-pressed={time === slot.time}
                      onClick={() => onTime(slot.time)}
                      className={cn(
                        "flex min-h-12 items-center justify-center rounded-field border text-small tabular-nums transition-colors duration-[240ms] ease-brand",
                        time === slot.time
                          ? "border-text bg-text text-bg"
                          : "border-line-strong text-text hover:border-control-border hover:bg-surface",
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}
