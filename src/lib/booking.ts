/**
 * Логика онлайн-записи: время в Europe/Moscow, сетка слотов, конфликты,
 * коды броней, нормализация телефона, rate limit и общие помощники ответов API.
 *
 * Москва живёт в UTC+3 круглый год (перехода на летнее время нет), поэтому
 * «настенное» время считается сдвигом на 180 минут и никакой tz-библиотеки
 * не требуется. Даты и время снаружи — только строки: `YYYY-MM-DD` и `HH:mm`.
 */

import { z } from "zod";

import {
  STUDIO_HOURS,
  type StudioMaster,
  type StudioService,
  type Weekday,
} from "./studio";

/* -------------------------------------------------------------------------- */
/* Время и часовой пояс                                                       */
/* -------------------------------------------------------------------------- */

/** Смещение Москвы от UTC в минутах. */
export const MOSCOW_OFFSET_MINUTES = 180;

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const WEEKDAY_BY_INDEX: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export interface DateParts {
  year: number;
  month: number;
  /** 1–12 */
  day: number;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Строгий разбор `YYYY-MM-DD` с проверкой календаря.
 * `2026-02-30` вернёт `null`, а не «2 марта».
 */
export function parseDateKey(value: string): DateParts | null {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 2020 || year > 2100) return null;

  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function formatDateKey(parts: DateParts): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/** День недели даты `YYYY-MM-DD`; `null` для битой даты. */
export function weekdayOfDateKey(dateKey: string): Weekday | null {
  const parts = parseDateKey(dateKey);
  if (!parts) return null;
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return WEEKDAY_BY_INDEX[utc.getUTCDay()] ?? null;
}

export interface MoscowNow {
  /** Сегодняшняя дата по Москве, `YYYY-MM-DD`. */
  dateKey: string;
  /** Минуты от полуночи по Москве, 0–1439. */
  minutesOfDay: number;
  /** Абсолютный момент времени, мс. */
  timestamp: number;
}

/** Текущее «настенное» время студии для произвольного момента. */
export function moscowWallClock(instant: Date = new Date()): MoscowNow {
  const shifted = new Date(instant.getTime() + MOSCOW_OFFSET_MINUTES * MS_PER_MINUTE);
  return {
    dateKey: `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`,
    minutesOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    timestamp: instant.getTime(),
  };
}

/** Абсолютный момент (мс) для московской даты и минут от полуночи. */
export function moscowInstant(dateKey: string, minutesOfDay: number): number | null {
  const parts = parseDateKey(dateKey);
  if (!parts) return null;
  return (
    Date.UTC(parts.year, parts.month - 1, parts.day) +
    minutesOfDay * MS_PER_MINUTE -
    MOSCOW_OFFSET_MINUTES * MS_PER_MINUTE
  );
}

/** Разница в календарных днях между датами `YYYY-MM-DD`. */
function daysBetweenKeys(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) return Number.NaN;
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toUtc - fromUtc) / MS_PER_DAY);
}

/** `"HH:mm"` → минуты от полуночи; `null`, если формат неверный. */
export function parseTimeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Минуты от полуночи → `"HH:mm"`. */
export function formatMinutes(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`;
}

/** Начало и конец приёма в минутах от полуночи. */
export const STUDIO_OPEN_MINUTES = parseTimeToMinutes(STUDIO_HOURS.opensAt) ?? 12 * 60;
export const STUDIO_CLOSE_MINUTES = parseTimeToMinutes(STUDIO_HOURS.closesAt) ?? 22 * 60;

/* -------------------------------------------------------------------------- */
/* Телефон                                                                    */
/* -------------------------------------------------------------------------- */

const NATIONAL_PHONE_PATTERN = /^[3489]\d{9}$/;

/**
 * Приводит российский номер к `+7XXXXXXXXXX`.
 * Принимает `8 999 123-45-67`, `+7 (999) 123 45 67`, `9991234567`.
 * Возвращает `null`, если номер не похож на российский.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D+/g, "");
  let national: string;

  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    national = digits.slice(1);
  } else if (digits.length === 10) {
    national = digits;
  } else {
    return null;
  }

  if (!NATIONAL_PHONE_PATTERN.test(national)) return null;
  // 9999999999 формально проходит шаблон, но это не номер.
  if (/^(\d)\1{9}$/.test(national)) return null;

  return `+7${national}`;
}

/** `+79991234567` → `+7 999 123-45-67`. */
export function formatPhoneForDisplay(phone: string): string {
  const national = phone.replace(/\D+/g, "").slice(-10);
  if (national.length !== 10) return phone;
  return `+7 ${national.slice(0, 3)} ${national.slice(3, 6)}-${national.slice(6, 8)}-${national.slice(8)}`;
}

/**
 * Маска для публичных ответов: `+7 9•• ••• 12 34`.
 * Первая цифра кода и последние четыре цифры — остальное скрыто.
 */
export function maskPhone(phone: string): string {
  const national = phone.replace(/\D+/g, "").slice(-10);
  if (national.length !== 10) return "+7 ••• ••• •• ••";
  return `+7 ${national.slice(0, 1)}•• ••• ${national.slice(6, 8)} ${national.slice(8)}`;
}

/* -------------------------------------------------------------------------- */
/* Брони: типы и коды                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Статусы брони.
 * `confirmed` — держит слот; `completed` — визит состоялся; `cancelled` и `no_show`
 * слот не занимают, публичная запись снова видит это время свободным.
 */
export const BOOKING_STATUSES = ["confirmed", "completed", "cancelled", "no_show"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Кто создал бронь или сменил статус: гость с сайта или администратор. */
export type BookingActor = "public" | "admin";

export interface BookingHistoryEntry {
  /** ISO-строка момента. */
  at: string;
  status: BookingStatus;
  by: BookingActor;
}

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as readonly string[]).includes(value);
}

/**
 * Занимает ли бронь время мастера.
 * Единственный блокирующий статус — `confirmed`; всё остальное освобождает слот.
 */
export function occupiesSlot(status: BookingStatus): boolean {
  return status === "confirmed";
}

export interface BookingRecord {
  /** `VSP-XXXX`. */
  code: string;
  status: BookingStatus;
  serviceId: string;
  masterId: string;
  /**
   * Снимок названий на момент записи. Каталог редактируемый и записи удаляются,
   * поэтому имя услуги/мастера не должно зависеть от текущего состояния справочника.
   */
  serviceName: string | null;
  serviceSlug: string | null;
  masterName: string | null;
  masterSlug: string | null;
  /** `YYYY-MM-DD`, московская дата. */
  date: string;
  /** `HH:mm`, московское время начала. */
  time: string;
  /** Длительность и цена на момент записи — снимок серверных справочников. */
  durationMin: number;
  priceRub: number;
  name: string;
  /** Всегда нормализован: `+7XXXXXXXXXX`. */
  phone: string;
  email: string | null;
  comment: string | null;
  /** ISO-строка момента создания. */
  createdAt: string;
  /** Внутренняя заметка администратора. Публично не отдаётся. */
  note: string | null;
  createdBy: BookingActor;
  /** История смен статуса. Публично не отдаётся. */
  history: BookingHistoryEntry[];
}

export interface BookingServiceRef {
  id: string;
  slug: string;
  name: string;
}

export interface BookingMasterRef {
  id: string;
  slug: string;
  name: string;
  role: string;
}

/** Публичное представление брони: без email и комментария, телефон замаскирован. */
export interface BookingView {
  code: string;
  status: BookingStatus;
  date: string;
  time: string;
  durationMin: number;
  priceRub: number;
  name: string;
  phone: string;
  service: BookingServiceRef | null;
  master: BookingMasterRef | null;
  createdAt: string;
}

/** Ответ на создание: клиент только что прислал эти данные, их можно вернуть. */
export interface BookingConfirmationView extends BookingView {
  email: string | null;
  comment: string | null;
}

/**
 * Ответ на повторную отправку той же заявки: только код и маскированный телефон.
 * Знать чужой телефон и слот недостаточно, чтобы получить имя, email или комментарий.
 */
export interface BookingRecapView {
  code: string;
  status: BookingStatus;
  date: string;
  time: string;
  durationMin: number;
  priceRub: number;
  phone: string;
  service: BookingServiceRef | null;
  master: BookingMasterRef | null;
}

/** Алфавит без похожих символов: нет B/8, I/1/L, O/0, S/5, Z/2. */
const CODE_ALPHABET = "ACDEFGHJKMNPQRTUVWXY34679";
const CODE_LENGTH = 4;
const CODE_PREFIX = "VSP";
/**
 * Для поиска брони формат мягче алфавита: любой `VSP-XXXX` из латиницы и цифр.
 * Строгий алфавит нужен только при генерации, чтобы код не путали по телефону.
 */
const CODE_PATTERN = new RegExp(`^${CODE_PREFIX}-[A-Z0-9]{${CODE_LENGTH}}$`);

function randomAlphabetIndex(): number {
  const max = CODE_ALPHABET.length;
  const bucket = Math.floor(65_536 / max) * max;
  const buffer = new Uint16Array(1);
  // Отбрасываем значения из «хвоста», чтобы не было modulo-смещения.
  for (;;) {
    globalThis.crypto.getRandomValues(buffer);
    const value = buffer[0] ?? 0;
    if (value < bucket) return value % max;
  }
}

/** Случайный код вида `VSP-7K4M`. */
export function generateBookingCode(): string {
  let suffix = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    suffix += CODE_ALPHABET[randomAlphabetIndex()];
  }
  return `${CODE_PREFIX}-${suffix}`;
}

/** Нормализует пользовательский ввод кода: trim + верхний регистр + проверка формата. */
export function normalizeBookingCode(input: string): string | null {
  const normalized = input.trim().toUpperCase();
  return CODE_PATTERN.test(normalized) ? normalized : null;
}

/** Код, которого ещё нет среди занятых. */
export function generateUniqueBookingCode(takenCodes: ReadonlySet<string>, attempts = 50): string {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const code = generateBookingCode();
    if (!takenCodes.has(code)) return code;
  }
  // 24^4 ≈ 331 000 комбинаций: сюда можно попасть только при исчерпании.
  throw new Error("Не удалось сгенерировать уникальный код брони");
}

/* -------------------------------------------------------------------------- */
/* Слоты и конфликты                                                          */
/* -------------------------------------------------------------------------- */

export interface Slot {
  time: string;
  available: boolean;
}

export interface BookingInterval {
  startMin: number;
  endMin: number;
}

/** Интервал брони в минутах от полуночи; `null`, если запись битая. */
export function bookingInterval(booking: BookingRecord): BookingInterval | null {
  const startMin = parseTimeToMinutes(booking.time);
  if (startMin === null) return null;
  const duration = Number.isFinite(booking.durationMin) && booking.durationMin > 0 ? booking.durationMin : 0;
  if (duration === 0) return null;
  return { startMin, endMin: startMin + duration };
}

export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Занят ли интервал у мастера на эту дату (отменённые и неявки не блокируют). */
export function isSlotBusy(
  bookings: readonly BookingRecord[],
  masterId: string,
  dateKey: string,
  startMin: number,
  endMin: number,
): boolean {
  return bookings.some((booking) => {
    if (!occupiesSlot(booking.status)) return false;
    if (booking.masterId !== masterId) return false;
    if (booking.date !== dateKey) return false;
    const interval = bookingInterval(booking);
    if (!interval) return false;
    return intervalsOverlap(startMin, endMin, interval.startMin, interval.endMin);
  });
}

export type AvailabilityReason =
  | "unknown_service"
  | "unknown_master"
  | "master_not_assigned"
  | "day_off"
  | "date_in_past"
  | "date_out_of_range";

export interface AvailabilityInput {
  service: StudioService;
  master: StudioMaster;
  date: string;
  bookings: readonly BookingRecord[];
  now?: Date;
  /**
   * Админская сессия: лид-тайм 2 часа не действует, прошедшие слоты всё равно
   * помечаются недоступными. Нужно для ручной записи «на сейчас».
   */
  ignoreLeadTime?: boolean;
}

export interface AvailabilityResult {
  slots: Slot[];
  durationMin: number;
  reason?: AvailabilityReason;
}

/**
 * Все стартовые точки сетки на дату с флагом доступности.
 * Недоступные слоты не выкидываем: интерфейсу полезно показать «занято».
 */
export function buildAvailability(input: AvailabilityInput): AvailabilityResult {
  const { service, master, date, bookings } = input;
  const now = input.now ?? new Date();
  const durationMin = service.durationMin;
  const step = STUDIO_HOURS.slotStepMin;

  if (!master.serviceIds.includes(service.id)) {
    return { slots: [], durationMin, reason: "master_not_assigned" };
  }

  const weekday = weekdayOfDateKey(date);
  if (weekday === null) {
    // Дату уже проверила схема запроса, сюда попадаем только при прямом вызове.
    return { slots: [], durationMin, reason: "date_in_past" };
  }

  // Прошлое и горизонт важнее графика: «этот день уже прошёл» точнее, чем «выходной».
  const today = moscowWallClock(now);
  if (date < today.dateKey) {
    return { slots: [], durationMin, reason: "date_in_past" };
  }
  const aheadDays = daysBetweenKeys(today.dateKey, date);
  if (Number.isNaN(aheadDays) || aheadDays > STUDIO_HOURS.bookingHorizonDays) {
    return { slots: [], durationMin, reason: "date_out_of_range" };
  }
  if (!master.workingDays.includes(weekday)) {
    return { slots: [], durationMin, reason: "day_off" };
  }

  const leadMinutes = input.ignoreLeadTime ? 0 : STUDIO_HOURS.minLeadMinutes;
  const earliestStart = now.getTime() + leadMinutes * MS_PER_MINUTE;
  const slots: Slot[] = [];

  for (
    let startMin = STUDIO_OPEN_MINUTES;
    startMin + durationMin <= STUDIO_CLOSE_MINUTES;
    startMin += step
  ) {
    const instant = moscowInstant(date, startMin);
    const available =
      instant !== null &&
      instant >= earliestStart &&
      !isSlotBusy(bookings, master.id, date, startMin, startMin + durationMin);

    slots.push({ time: formatMinutes(startMin), available });
  }

  return { slots, durationMin };
}

export type SlotCheckReason =
  | "master_not_assigned"
  | "day_off"
  | "date_in_past"
  | "date_out_of_range"
  | "invalid_slot"
  | "slot_in_past"
  | "slot_taken";

export type SlotCheck =
  | { ok: true; startMin: number; endMin: number; instant: number }
  | { ok: false; reason: SlotCheckReason; message: string };

export interface SlotCheckInput {
  service: StudioService;
  master: StudioMaster;
  date: string;
  time: string;
  bookings: readonly BookingRecord[];
  now?: Date;
  /**
   * Ручная запись администратора: лид-тайм 2 часа не действует,
   * но прошедшее время всё равно отсекается.
   */
  ignoreLeadTime?: boolean;
}

/**
 * Серверная проверка конкретного слота для POST.
 * Клиент присылает только «когда» — длительность и границы берутся из справочника.
 */
export function checkRequestedSlot(input: SlotCheckInput): SlotCheck {
  const { service, master, date, time, bookings } = input;
  const now = input.now ?? new Date();

  if (!master.serviceIds.includes(service.id)) {
    return { ok: false, reason: "master_not_assigned", message: "Мастер не выполняет эту услугу" };
  }

  const weekday = weekdayOfDateKey(date);
  if (weekday === null) {
    return { ok: false, reason: "invalid_slot", message: "Дата указана неверно" };
  }

  const today = moscowWallClock(now);
  if (date < today.dateKey) {
    return { ok: false, reason: "date_in_past", message: "Эта дата уже прошла" };
  }
  const aheadDays = daysBetweenKeys(today.dateKey, date);
  if (Number.isNaN(aheadDays) || aheadDays > STUDIO_HOURS.bookingHorizonDays) {
    return {
      ok: false,
      reason: "date_out_of_range",
      message: `Запись открыта на ${STUDIO_HOURS.bookingHorizonDays} дней вперёд`,
    };
  }
  if (!master.workingDays.includes(weekday)) {
    return { ok: false, reason: "day_off", message: "Мастер не работает в этот день" };
  }

  const startMin = parseTimeToMinutes(time);
  if (startMin === null) {
    return { ok: false, reason: "invalid_slot", message: "Время указано неверно" };
  }
  if (startMin < STUDIO_OPEN_MINUTES || startMin + service.durationMin > STUDIO_CLOSE_MINUTES) {
    return {
      ok: false,
      reason: "invalid_slot",
      message: `Запись возможна с ${STUDIO_HOURS.opensAt} до ${STUDIO_HOURS.closesAt}`,
    };
  }
  if ((startMin - STUDIO_OPEN_MINUTES) % STUDIO_HOURS.slotStepMin !== 0) {
    return {
      ok: false,
      reason: "invalid_slot",
      message: `Время должно быть кратно ${STUDIO_HOURS.slotStepMin} минутам`,
    };
  }

  const instant = moscowInstant(date, startMin);
  if (instant === null) {
    return { ok: false, reason: "invalid_slot", message: "Дата указана неверно" };
  }
  const leadMinutes = input.ignoreLeadTime ? 0 : STUDIO_HOURS.minLeadMinutes;
  if (instant < now.getTime() + leadMinutes * MS_PER_MINUTE) {
    return {
      ok: false,
      reason: "slot_in_past",
      message: input.ignoreLeadTime
        ? "Это время уже прошло"
        : `Ближайшая запись — не раньше чем через ${STUDIO_HOURS.minLeadMinutes / 60} часа`,
    };
  }

  const endMin = startMin + service.durationMin;
  if (isSlotBusy(bookings, master.id, date, startMin, endMin)) {
    return { ok: false, reason: "slot_taken", message: "Это время уже занято. Выберите другой слот" };
  }

  return { ok: true, startMin, endMin, instant };
}

/* -------------------------------------------------------------------------- */
/* Представления для API                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Ссылки на услугу и мастера резолвит серверный слой (`booking-view.ts`):
 * этот модуль остаётся чистым и импортируется клиентскими компонентами.
 */
export interface BookingRefs {
  service: BookingServiceRef | null;
  master: BookingMasterRef | null;
}

/** Публичная проекция брони: телефон замаскирован, email и комментарий скрыты. */
export function toBookingView(booking: BookingRecord, refs: BookingRefs): BookingView {
  return {
    code: booking.code,
    status: booking.status,
    date: booking.date,
    time: booking.time,
    durationMin: booking.durationMin,
    priceRub: booking.priceRub,
    name: booking.name,
    phone: maskPhone(booking.phone),
    service: refs.service,
    master: refs.master,
    createdAt: booking.createdAt,
  };
}

/** Проекция для ответа на создание: добавляет то, что клиент только что прислал. */
export function toBookingConfirmationView(
  booking: BookingRecord,
  refs: BookingRefs,
): BookingConfirmationView {
  return {
    ...toBookingView(booking, refs),
    email: booking.email,
    comment: booking.comment,
  };
}

/* -------------------------------------------------------------------------- */
/* Rate limit                                                                 */
/* -------------------------------------------------------------------------- */

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  /** Страховка от роста Map: при переполнении чистим самые старые ключи. */
  maxKeys?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export interface RateLimiter {
  check(key: string, now?: Date): RateLimitDecision;
  /** Сбросить счётчик (например, после успешного входа). */
  reset(key: string): void;
}

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  const { limit, windowMs, maxKeys = 5_000 } = options;
  const hits = new Map<string, number[]>();

  function prune(reference: number): void {
    for (const [key, timestamps] of hits) {
      if (timestamps.every((timestamp) => timestamp <= reference)) hits.delete(key);
    }
    if (hits.size <= maxKeys) return;
    for (const key of hits.keys()) {
      hits.delete(key);
      if (hits.size <= maxKeys) break;
    }
  }

  return {
    check(key, now = new Date()) {
      const nowMs = now.getTime();
      const windowStart = nowMs - windowMs;
      const recent = (hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

      if (recent.length >= limit) {
        const oldest = recent[0] ?? nowMs;
        hits.set(key, recent);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000)),
        };
      }

      recent.push(nowMs);
      hits.set(key, recent);
      if (hits.size > maxKeys) prune(windowStart);
      return { allowed: true, remaining: limit - recent.length, retryAfterSec: 0 };
    },

    reset(key) {
      hits.delete(key);
    },
  };
}

/* -------------------------------------------------------------------------- */
/* HTTP-помощники для route handlers                                          */
/* -------------------------------------------------------------------------- */

export type ApiErrorCode =
  | "invalid_request"
  | "unknown_service"
  | "unknown_master"
  | "master_not_assigned"
  | "day_off"
  | "invalid_slot"
  | "slot_in_past"
  | "date_in_past"
  | "date_out_of_range"
  | "slot_taken"
  | "rate_limited"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "email_taken"
  | "last_owner"
  | "self_deactivate"
  | "invalid_password"
  | "not_configured"
  | "invalid_transition"
  | "slug_taken"
  | "delete_conflict"
  | "masters_without_services"
  | "storage_unavailable"
  | "server_error";

export interface ApiErrorBody {
  ok: false;
  error: ApiErrorCode;
  message: string;
  fields?: { field: string; message: string }[];
}

export interface ResponseOptions {
  /** Технические подробности для клиента: список полей, границы и т.п. */
  details?: unknown;
  headers?: Record<string, string>;
}

export function jsonResponse<T>(body: T, status = 200, headers?: Record<string, string>): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });
}

export function errorResponse(
  status: number,
  error: ApiErrorCode,
  message: string,
  options: ResponseOptions = {},
): Response {
  const body: ApiErrorBody & Record<string, unknown> = { ok: false, error, message };
  if (options.details !== undefined) body.details = options.details;
  return jsonResponse(body, status, options.headers);
}

/** Единый формат ошибки валидации: первое сообщение + список полей. */
export function validationErrorResponse(
  issues: readonly { path: PropertyKey[]; message: string }[],
): Response {
  const fields = issues.map((issue) => ({
    field: issue.path.map(String).join("."),
    message: issue.message,
  }));
  return errorResponse(400, "invalid_request", fields[0]?.message ?? "Проверьте данные запроса", {
    details: { fields },
  });
}

/**
 * IP клиента.
 *
 * Порядок доверия — от самого надёжного источника к наименее:
 * 1. `x-vercel-forwarded-for` — ставит Vercel, клиент его не контролирует;
 * 2. `x-real-ip` — обычно отдаёт обратный прокси;
 * 3. **последний** адрес `x-forwarded-for` — его дописывает ближайший прокси;
 *    первый адрес подделывается клиентом, поэтому брать его нельзя;
 * 4. `unknown` — общего бакета для всех запросов без IP.
 */
export function clientIp(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for");
  const vercelIp = vercel?.split(",").pop()?.trim();
  if (vercelIp) return vercelIp;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").pop()?.trim();
    if (last) return last;
  }

  return "unknown";
}

/** HTTP-статус для причины отказа по слоту. */
export function statusForSlotReason(reason: SlotCheckReason): number {
  return reason === "slot_taken" ? 409 : 400;
}

/** Стабильный код ошибки для причины отказа по слоту. */
export function errorCodeForSlotReason(reason: SlotCheckReason): ApiErrorCode {
  return reason;
}

/* -------------------------------------------------------------------------- */
/* Схемы запросов (общие для публичной и админской записи)                    */
/* -------------------------------------------------------------------------- */

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/**
 * Поля записи. Цены, длительности и статуса здесь нет намеренно:
 * эти значения всегда берутся из серверного справочника.
 */
export const bookingPayloadSchema = z.object({
  serviceId: z.string({ error: "Выберите услугу" }).trim().min(1, "Выберите услугу"),
  masterId: z.string({ error: "Выберите мастера" }).trim().min(1, "Выберите мастера"),
  date: z.iso.date("Дата должна быть в формате YYYY-MM-DD"),
  time: z
    .string({ error: "Выберите время" })
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Время должно быть в формате HH:mm"),
  name: z
    .string({ error: "Укажите имя" })
    .trim()
    .min(2, "Имя должно быть не короче 2 символов")
    .max(60, "Имя должно быть не длиннее 60 символов"),
  phone: z
    .string({ error: "Укажите телефон" })
    .trim()
    .min(1, "Укажите телефон")
    .max(32, "Слишком длинный номер телефона"),
  email: z.preprocess(
    emptyToUndefined,
    z.email("Проверьте адрес электронной почты").max(120, "Слишком длинный email").optional(),
  ),
  comment: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500, "Комментарий не длиннее 500 символов").optional(),
  ),
});

export type BookingPayload = z.infer<typeof bookingPayloadSchema>;

/**
 * Публичная форма: те же поля плюс антибот-механика.
 *
 * Ловушка называется `vespera_hp` — имя не похоже на осмысленное поле, чтобы
 * автозаполнители не складывали туда «Организацию». Устаревшее имя `honeypot`
 * принимается на переходный период (пока UI не переименует input), а поле
 * `company` сервер намеренно игнорирует: браузеры заполняют его сами.
 */
export const publicBookingPayloadSchema = bookingPayloadSchema.extend({
  vespera_hp: z.string().optional(),
  honeypot: z.string().optional(),
  /**
   * Момент монтирования формы (epoch ms). Заявка быстрее 1.5 c — бот.
   * Нет поля или мусор — считаем человеком: легитимные заявки не режем.
   */
  formStartedAt: z.preprocess((value) => {
    const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    return Number.isFinite(numeric) ? numeric : undefined;
  }, z.number().optional()),
});

export type PublicBookingPayload = z.infer<typeof publicBookingPayloadSchema>;
