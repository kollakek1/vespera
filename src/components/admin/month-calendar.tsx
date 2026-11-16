"use client";

import { useEffect, useId, useMemo, useRef, type KeyboardEvent } from "react";

import type { CalendarDay } from "@/lib/admin-api";
import { cn } from "@/components/ui/cn";
import {
  dayNumber,
  daysInMonth,
  formatDayLong,
  formatMoneyShort,
  formatMonthTitle,
  monthOf,
  monthStartOffset,
  plural,
  shiftDate,
  shiftMonth,
  weekdayOf,
} from "@/components/admin/dates";

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

interface MonthCalendarProps {
  month: string;
  days: CalendarDay[];
  focusDate: string;
  today: string;
  onFocusDate: (date: string) => void;
  onSelectDate: (date: string) => void;
  onMonthShift: (delta: number) => void;
}

interface Cell {
  key: string;
  inMonth: boolean;
}

function buildCells(month: string): Cell[][] {
  const offset = monthStartOffset(month);
  const total = daysInMonth(month);
  const first = `${month}-01`;

  const cells: Cell[] = [];
  for (let index = offset; index > 0; index -= 1) {
    cells.push({ key: shiftDate(first, -index), inMonth: false });
  }
  for (let day = 1; day <= total; day += 1) {
    cells.push({ key: `${month}-${String(day).padStart(2, "0")}`, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    if (!last) break;
    cells.push({ key: shiftDate(last.key, 1), inMonth: false });
  }

  const weeks: Cell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function MonthCalendar({
  month,
  days,
  focusDate,
  today,
  onFocusDate,
  onSelectDate,
  onMonthShift,
}: MonthCalendarProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const hintId = useId();

  const weeks = useMemo(() => buildCells(month), [month]);
  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const activeDate = monthOf(focusDate) === month ? focusDate : `${month}-01`;

  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    const cell = gridRef.current?.querySelector<HTMLElement>(`[data-date="${key}"]`);
    if (!cell) return;
    cell.focus({ preventScroll: true });
    pendingFocus.current = null;
  }, [days, focusDate]);

  const moveFocus = (key: string) => {
    pendingFocus.current = key;
    onFocusDate(key);
  };

  /**
   * PageUp/PageDown: фокус не должен проваливаться в `<body>`.
   * Переходим в новый месяц и ставим фокус на тот же день (или последний в месяце).
   */
  const shiftMonthWithFocus = (delta: number, fromKey: string) => {
    const targetMonth = shiftMonth(month, delta);
    const day = Math.min(Number(fromKey.slice(8, 10)) || 1, daysInMonth(targetMonth));
    const target = `${targetMonth}-${String(day).padStart(2, "0")}`;
    onMonthShift(delta);
    moveFocus(target);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const key = target.dataset.date;
    if (!key) return;

    let next: string | null = null;
    const weekday = (weekdayOf(key) + 6) % 7;

    switch (event.key) {
      case "ArrowLeft":
        next = shiftDate(key, -1);
        break;
      case "ArrowRight":
        next = shiftDate(key, 1);
        break;
      case "ArrowUp":
        next = shiftDate(key, -7);
        break;
      case "ArrowDown":
        next = shiftDate(key, 7);
        break;
      case "Home":
        next = shiftDate(key, -weekday);
        break;
      case "End":
        next = shiftDate(key, 6 - weekday);
        break;
      case "PageUp":
        event.preventDefault();
        shiftMonthWithFocus(-1, key);
        return;
      case "PageDown":
        event.preventDefault();
        shiftMonthWithFocus(1, key);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        onSelectDate(key);
        return;
      default:
        return;
    }

    event.preventDefault();

    if (monthOf(next) !== month) {
      onMonthShift(next < `${month}-01` ? -1 : 1);
      moveFocus(next);
      return;
    }
    moveFocus(next);
  };

  const labelFor = (key: string, day: CalendarDay | undefined): string => {
    const base = formatDayLong(key);
    if (!day) return base;
    if (!day.isWorkingDay) return `${base}. Выходной`;
    const load = `${day.loadPercent} ${plural(day.loadPercent, ["процент", "процента", "процентов"])}`;
    return `${base}. ${day.bookingsCount} ${plural(day.bookingsCount, ["запись", "записи", "записей"])}, загрузка ${load}`;
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-h3 font-light text-text first-letter:uppercase">{formatMonthTitle(month)}</h2>
        <p id={hintId} className="hidden text-[12px] text-text-muted sm:block">
          Стрелки — по дням, Enter — открыть день
        </p>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label={`Календарь, ${formatMonthTitle(month)}`}
        aria-describedby={hintId}
        onKeyDown={onKeyDown}
        className="border border-line"
      >
        <div role="row" className="grid grid-cols-7 border-b border-line">
          {WEEK_DAYS.map((weekday) => (
            <div
              key={weekday}
              role="columnheader"
              className="px-2 py-2 text-micro font-medium uppercase text-text-muted"
            >
              {weekday}
            </div>
          ))}
        </div>

        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            role="row"
            className="grid grid-cols-7 border-b border-line last:border-b-0"
          >
            {week.map((cell, cellIndex) => {
              const day = cell.inMonth ? dayMap.get(cell.key) : undefined;
              const isToday = cell.key === today;
              const isWorking = day?.isWorkingDay ?? false;
              const load = day?.loadPercent ?? 0;

              return (
                <div
                  key={cell.key}
                  role="gridcell"
                  className={cn(
                    "min-h-[72px] min-w-0 sm:min-h-[92px] lg:min-h-[104px]",
                    cellIndex > 0 && "border-l border-line",
                    cell.inMonth && "bg-bg",
                    cell.inMonth && isWorking && "hover:bg-surface-hover",
                    cell.inMonth && !isWorking && "bg-surface",
                  )}
                >
                  {cell.inMonth ? (
                    <button
                      type="button"
                      data-date={cell.key}
                      tabIndex={cell.key === activeDate ? 0 : -1}
                      aria-label={labelFor(cell.key, day)}
                      onClick={() => onSelectDate(cell.key)}
                      className={cn(
                        "relative flex h-full w-full flex-col justify-between gap-2 p-2 text-left transition-colors duration-[180ms] ease-brand focus-visible:z-10",
                        isToday && "after:pointer-events-none after:absolute after:inset-0 after:border after:border-accent",
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-1">
                        <span
                          className={cn(
                            "text-[13px] tabular-nums",
                            isToday ? "text-accent-text" : "text-text",
                          )}
                        >
                          {dayNumber(cell.key)}
                        </span>
                        {day && day.bookingsCount > 0 ? (
                          <span className="text-[11px] tabular-nums text-text-muted">
                            {day.bookingsCount}
                          </span>
                        ) : null}
                      </span>

                      <span className="block w-full">
                        <span className="flex items-baseline justify-between gap-1">
                          {day && day.revenueRub > 0 ? (
                            <span className="hidden truncate text-[11px] tabular-nums text-text-muted sm:block">
                              {formatMoneyShort(day.revenueRub)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-text-muted">
                              {day && !day.isWorkingDay ? "выходной" : ""}
                            </span>
                          )}
                          {day && day.cancelledCount > 0 ? (
                            <span className="text-[11px] tabular-nums text-text-muted">
                              −{day.cancelledCount}
                            </span>
                          ) : null}
                        </span>

                        {day && (day.bookingsCount > 0 || day.cancelledCount > 0) ? (
                          <span aria-hidden="true" className="mt-1.5 block h-[3px] w-full bg-line">
                            <span
                              className={cn("block h-full", load > 80 ? "bg-accent" : "bg-text/30")}
                              style={{ width: `${Math.min(100, Math.max(0, load))}%` }}
                            />
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ) : (
                    <div className="flex h-full flex-col p-2 text-[13px] tabular-nums text-text-muted">
                      {dayNumber(cell.key)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
