/**
 * Логика админ-панели: представления броней, сводки, переходы статусов,
 * сетка календаря. Роуты остаются тонкими, а правила живут здесь.
 *
 * Переиспользует домен из `booking.ts` и справочники из `studio.ts`:
 * расписание, длительности и цены нигде не дублируются.
 */

import {
  STUDIO_CLOSE_MINUTES,
  STUDIO_OPEN_MINUTES,
  formatDateKey,
  formatMinutes,
  moscowWallClock,
  parseDateKey,
  type BookingActor,
  type BookingHistoryEntry,
  type BookingMasterRef,
  type BookingRecord,
  type BookingServiceRef,
  type BookingStatus,
} from "./booking";
import type { StudioMaster, Weekday } from "./studio";

/* -------------------------------------------------------------------------- */
/* Ограничения и статусы                                                      */
/* -------------------------------------------------------------------------- */

/** Максимальная длина диапазона в списке броней (включительно). */
export const MAX_RANGE_DAYS = 62;

/** Минуты приёма в одном дне — знаменатель для нагрузки календаря. */
export const DAILY_CAPACITY_MINUTES = STUDIO_CLOSE_MINUTES - STUDIO_OPEN_MINUTES;

export const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: "подтверждена",
  completed: "завершена",
  cancelled: "отменена",
  no_show: "неявка",
};

/** Статусы, которые считаются состоявшимся визитом: нагрузка и выручка. */
export function countsAsVisit(status: BookingStatus): boolean {
  return status === "confirmed" || status === "completed";
}

/**
 * Разрешённые переходы.
 * Отменённую бронь можно вернуть в `confirmed` (ошибочная отмена), но только если
 * слот ещё свободен: проверка конфликта выполняется перед записью.
 * `cancelled → completed/no_show` невозможно — визита не было.
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  confirmed: ["completed", "cancelled", "no_show"],
  completed: ["confirmed"],
  no_show: ["confirmed"],
  cancelled: ["confirmed"],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Понятное объяснение запрещённого перехода. */
export function transitionErrorMessage(from: BookingStatus, to: BookingStatus): string {
  if (from === "cancelled") {
    return `Отменённую бронь можно вернуть только в «подтверждена», а не в «${STATUS_LABELS[to]}»`;
  }
  return `Нельзя перевести бронь из статуса «${STATUS_LABELS[from]}» в «${STATUS_LABELS[to]}»`;
}

/* -------------------------------------------------------------------------- */
/* Представления                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Полная карточка для админа: телефон целиком, email, комментарий, заметка,
 * автор и история статусов. Используется и в списке, и в детали.
 */
export interface AdminBookingView {
  code: string;
  status: BookingStatus;
  date: string;
  time: string;
  durationMin: number;
  priceRub: number;
  name: string;
  phone: string;
  email: string | null;
  comment: string | null;
  note: string | null;
  createdBy: BookingActor;
  createdAt: string;
  service: BookingServiceRef | null;
  master: BookingMasterRef | null;
  history: BookingHistoryEntry[];
}

export interface BookingSummary {
  total: number;
  byStatus: Record<BookingStatus, number>;
  revenueRub: number;
}

function emptyByStatus(): Record<BookingStatus, number> {
  return { confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
}

/** Сводка по набору броней: сколько всего, разбивка по статусам, выручка по визитам. */
export function summarize(bookings: readonly BookingRecord[]): BookingSummary {
  const byStatus = emptyByStatus();
  let revenueRub = 0;

  for (const booking of bookings) {
    byStatus[booking.status] += 1;
    if (countsAsVisit(booking.status)) revenueRub += booking.priceRub;
  }

  return { total: bookings.length, byStatus, revenueRub };
}

/** Сортировка для списков: сначала дата, затем время, затем код. */
export function sortBookings(bookings: readonly BookingRecord[]): BookingRecord[] {
  return [...bookings].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.time !== b.time) return a.time < b.time ? -1 : 1;
    return a.code < b.code ? -1 : 1;
  });
}

export interface FutureBookingRef {
  code: string;
  date: string;
  time: string;
  name: string;
}

/**
 * Будущие подтверждённые брони, подходящие под предикат.
 * Именно они запрещают архивировать услугу или мастера: иначе гость придёт в пустоту.
 */
export function findFutureConfirmedBookings(
  bookings: readonly BookingRecord[],
  match: (booking: BookingRecord) => boolean,
  now: Date = new Date(),
): FutureBookingRef[] {
  const wall = moscowWallClock(now);
  return bookings
    .filter((booking) => {
      if (booking.status !== "confirmed") return false;
      if (!match(booking)) return false;
      if (booking.date > wall.dateKey) return true;
      if (booking.date < wall.dateKey) return false;
      return booking.time >= formatMinutes(wall.minutesOfDay);
    })
    .map((booking) => ({
      code: booking.code,
      date: booking.date,
      time: booking.time,
      name: booking.name,
    }));
}

/* -------------------------------------------------------------------------- */
/* Диапазоны и месяцы                                                         */
/* -------------------------------------------------------------------------- */

/** Длина диапазона включительно; `null`, если даты битые. */
export function rangeLengthDays(from: string, to: string): number | null {
  const start = parseDateKey(from);
  const end = parseDateKey(to);
  if (!start || !end) return null;
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  return Math.round((endUtc - startUtc) / 86_400_000) + 1;
}

export interface MonthParts {
  year: number;
  month: number;
}

/** `"2026-11"` → `{ year: 2026, month: 11 }`; `null` для мусора. */
export function parseMonthKey(value: string): MonthParts | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2020 || year > 2100) return null;
  return { year, month };
}

/** Все даты месяца в формате `YYYY-MM-DD`. */
export function monthDateKeys(month: MonthParts): string[] {
  const daysInMonth = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
  const keys: string[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    keys.push(formatDateKey({ year: month.year, month: month.month, day }));
  }
  return keys;
}

/** Границы месяца для выборки броней. */
export function monthRange(month: MonthParts): { from: string; to: string } {
  const keys = monthDateKeys(month);
  const first = keys[0] ?? formatDateKey({ year: month.year, month: month.month, day: 1 });
  const last = keys[keys.length - 1] ?? first;
  return { from: first, to: last };
}

/* -------------------------------------------------------------------------- */
/* Календарь                                                                  */
/* -------------------------------------------------------------------------- */

export interface CalendarMasterRef {
  id: string;
  slug: string;
  name: string;
}

export interface CalendarDay {
  date: string;
  weekday: Weekday;
  isWorkingDay: boolean;
  /** Записи, которые занимают день: `confirmed` + `completed`. */
  bookingsCount: number;
  cancelledCount: number;
  /** Занятые минуты / доступные минуты дня, 0–100. */
  loadPercent: number;
  revenueRub: number;
  /** Кто из мастеров на смене в этот день недели. */
  mastersOnDuty: CalendarMasterRef[];
}

export interface CalendarSummary extends BookingSummary {
  /** Сколько дней месяца имеют хотя бы одного мастера на смене. */
  workingDays: number;
  /** Нагрузка за месяц, 0–100. */
  loadPercent: number;
}

export interface CalendarDayInput {
  date: string;
  weekday: Weekday;
  /** Брони только этого дня. */
  bookings: readonly BookingRecord[];
  /** Мастера, у которых этот день недели рабочий (уже с учётом фильтра). */
  mastersOnDuty: readonly StudioMaster[];
}

export function buildCalendarDay(input: CalendarDayInput): CalendarDay {
  const { date, weekday, bookings, mastersOnDuty } = input;

  const active = bookings.filter((booking) => countsAsVisit(booking.status));
  const occupiedMinutes = active.reduce(
    (sum, booking) => sum + Math.max(0, booking.durationMin),
    0,
  );
  const availableMinutes = mastersOnDuty.length * DAILY_CAPACITY_MINUTES;

  return {
    date,
    weekday,
    isWorkingDay: mastersOnDuty.length > 0,
    bookingsCount: active.length,
    cancelledCount: bookings.filter((booking) => booking.status === "cancelled").length,
    loadPercent:
      availableMinutes > 0 ? Math.min(100, Math.round((occupiedMinutes / availableMinutes) * 100)) : 0,
    revenueRub: active.reduce((sum, booking) => sum + booking.priceRub, 0),
    mastersOnDuty: mastersOnDuty.map((master) => ({
      id: master.id,
      slug: master.slug,
      name: master.name,
    })),
  };
}

export function summarizeCalendar(
  days: readonly CalendarDay[],
  bookings: readonly BookingRecord[],
): CalendarSummary {
  const base = summarize(bookings);
  const workingDays = days.filter((day) => day.isWorkingDay).length;

  const capacity = days.reduce((sum, day) => sum + day.mastersOnDuty.length, 0) * DAILY_CAPACITY_MINUTES;
  const occupied = bookings
    .filter((booking) => countsAsVisit(booking.status))
    .reduce((sum, booking) => sum + Math.max(0, booking.durationMin), 0);

  return {
    ...base,
    workingDays,
    loadPercent: capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0,
  };
}

/** Кто работает в этот день недели с учётом фильтра. */
export function mastersWorkingOn(
  masters: readonly StudioMaster[],
  weekday: Weekday,
): StudioMaster[] {
  return masters.filter((master) => master.workingDays.includes(weekday));
}
