/**
 * Даты записи живут как строки `YYYY-MM-DD` в часовом поясе студии.
 * Все расчёты идут через UTC-полночь, поэтому переходы на летнее время
 * и локальная зона браузера не могут сдвинуть день.
 */

const TIMEZONE = "Europe/Moscow";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function partsOf(key: string): [number, number, number] {
  const [year, month, day] = key.split("-").map(Number);
  return [year, month, day];
}

export function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function shiftDate(key: string, days: number): string {
  const [year, month, day] = partsOf(key);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** 0 — воскресенье, как `Date#getDay`. */
export function weekdayOf(key: string): number {
  const [year, month, day] = partsOf(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function monthOf(key: string): { year: number; month: number } {
  const [year, month] = partsOf(key);
  return { year, month: month - 1 };
}

export function dayNumber(key: string): string {
  return String(partsOf(key)[2]);
}

export function formatMonthTitle(year: number, month: number): string {
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month, 1)),
  );
}

export function formatWeekdayShort(key: string): string {
  const [year, month, day] = partsOf(key);
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** «14 ноября, пт» — для сводки и подтверждения. */
export function formatDateLong(key: string): string {
  const [year, month, day] = partsOf(key);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayMonth = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
  return `${dayMonth}, ${formatWeekdayShort(key)}`;
}

/** Понедельник — первый день недели: 0 для понедельника, 6 для воскресенья. */
export function monthStartOffset(year: number, month: number): number {
  const weekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return (weekday + 6) % 7;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function keyOf(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}
