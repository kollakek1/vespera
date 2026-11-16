/**
 * Даты консоли живут строками `YYYY-MM-DD` в московском времени студии.
 * Все расчёты — через UTC-полночь, чтобы локальная зона браузера не сдвигала день.
 */

export const ADMIN_TIMEZONE = "Europe/Moscow";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parts(key: string): [number, number, number] {
  const [year, month, day] = key.split("-").map(Number);
  return [year ?? 0, month ?? 1, day ?? 1];
}

export function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ADMIN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function shiftDate(key: string, days: number): string {
  const [year, month, day] = parts(key);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** 0 — воскресенье, как `Date#getDay`. */
export function weekdayOf(key: string): number {
  const [year, month, day] = parts(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function monthOf(key: string): string {
  return key.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 2026, (monthIndex ?? 1) - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

export function monthRange(month: string): { from: string; to: string } {
  const [year, monthIndex] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year ?? 2026, monthIndex ?? 1, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad(days)}` };
}

export function daysInMonth(month: string): number {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year ?? 2026, monthIndex ?? 1, 0)).getUTCDate();
}

/** Понедельник — первый день недели: 0 для понедельника, 6 для воскресенья. */
export function monthStartOffset(month: string): number {
  const [year, monthIndex] = month.split("-").map(Number);
  const weekday = new Date(Date.UTC(year ?? 2026, (monthIndex ?? 1) - 1, 1)).getUTCDay();
  return (weekday + 6) % 7;
}

export function dayNumber(key: string): string {
  return String(parts(key)[2]);
}

export function formatMonthTitle(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 2026, (monthIndex ?? 1) - 1, 1)));
}

export function formatDayLong(key: string): string {
  const [year, month, day] = parts(key);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatDayShort(key: string): string {
  const [year, month, day] = parts(key);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatWeekdayShort(key: string): string {
  const [year, month, day] = parts(key);
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace(".", "");
}

/** «сегодня в 14:20», «вчера в 09:05», «3 дня назад», «15.11.2026», «ещё не входил». */
export function formatLastLogin(iso: string | null): string {
  if (!iso) return "ещё не входил";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "ещё не входил";

  const inZone = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("ru-RU", { ...options, timeZone: ADMIN_TIMEZONE }).format(date);

  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: ADMIN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const time = inZone({ hour: "2-digit", minute: "2-digit" });
  const today = todayKey();

  if (dayKey === today) return `сегодня в ${time}`;
  if (dayKey === shiftDate(today, -1)) return `вчера в ${time}`;

  const diff = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dayKey}T00:00:00Z`)) / 86_400_000,
  );
  if (diff > 1 && diff < 7) return `${diff} ${plural(diff, ["день", "дня", "дней"])} назад`;

  return inZone({ day: "2-digit", month: "2-digit", year: "numeric" });
}

/** «15.11, 19:40» по московскому времени. */
export function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ADMIN_TIMEZONE,
  }).format(date);
}

const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

export function formatMoney(rub: number): string {
  return `${money.format(rub)}\u00A0₽`;
}

/** Компактная сумма для ячейки календаря: 12 000 → «12 000», 120 000 → «120 тыс.». */
export function formatMoneyShort(rub: number): string {
  if (rub >= 100_000) return `${Math.round(rub / 1000)}\u00A0тыс.`;
  return money.format(rub);
}

export function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function formatMinutes(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** «1 запись», «4 записи», «12 записей». */
export function plural(count: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
