/**
 * Брони: нормализация и операции поверх слоя хранения.
 *
 * Драйвер (`storage/`) решает, где лежат данные — файл `data/bookings.json`
 * локально или строка `bookings` в Postgres на Vercel. Здесь только модель:
 * валидация записей, восстановление старых форматов и атомарные мутации.
 *
 * Только серверный модуль.
 */

import {
  isBookingStatus,
  type BookingActor,
  type BookingHistoryEntry,
  type BookingRecord,
  type BookingStatus,
} from "./booking";
import { getStorage } from "./storage";

const DOCUMENT_VERSION = 1;

/* -------------------------------------------------------------------------- */
/* Разбор и нормализация                                                      */
/* -------------------------------------------------------------------------- */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * Старые записи (до админки) не содержали `note`, `createdBy` и `history`.
 * Нормализуем при чтении, чтобы модель данных оставалась одной и той же.
 */
function normalizeHistory(
  value: unknown,
  fallback: { createdAt: string; status: BookingStatus; createdBy: BookingActor },
): BookingHistoryEntry[] {
  const entries: BookingHistoryEntry[] = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isPlainObject(item)) continue;
      const at = typeof item.at === "string" && item.at.trim() !== "" ? item.at : null;
      if (!at || !isBookingStatus(item.status)) continue;
      entries.push({ at, status: item.status, by: item.by === "admin" ? "admin" : "public" });
    }
  }

  if (entries.length > 0) return entries;
  // Запись без истории: считаем, что создана сразу в текущем статусе.
  return [{ at: fallback.createdAt, status: fallback.status, by: fallback.createdBy }];
}

/** Проверяет обязательный каркас и дополняет запись полями, которых нет в старых документах. */
function normalizeRecord(value: unknown): BookingRecord | null {
  if (!isPlainObject(value)) return null;

  const { code, status, serviceId, masterId, date, time, durationMin, priceRub, name, phone, createdAt } =
    value;

  if (typeof code !== "string" || code.trim() === "") return null;
  if (!isBookingStatus(status)) return null;
  if (typeof serviceId !== "string" || serviceId === "") return null;
  if (typeof masterId !== "string" || masterId === "") return null;
  if (typeof date !== "string" || date === "") return null;
  if (typeof time !== "string" || time === "") return null;
  if (typeof durationMin !== "number" || !Number.isFinite(durationMin)) return null;
  if (typeof priceRub !== "number" || !Number.isFinite(priceRub)) return null;
  if (typeof name !== "string" || name === "") return null;
  if (typeof phone !== "string" || phone === "") return null;
  if (typeof createdAt !== "string" || createdAt === "") return null;

  const createdBy: BookingActor = value.createdBy === "admin" ? "admin" : "public";

  return {
    code,
    status,
    serviceId,
    masterId,
    serviceName: isNullableNonEmptyString(value.serviceName),
    serviceSlug: isNullableNonEmptyString(value.serviceSlug),
    masterName: isNullableNonEmptyString(value.masterName),
    masterSlug: isNullableNonEmptyString(value.masterSlug),
    date,
    time,
    durationMin,
    priceRub,
    name,
    phone,
    email: isNullableNonEmptyString(value.email),
    comment: isNullableNonEmptyString(value.comment),
    createdAt,
    note: isNullableNonEmptyString(value.note),
    createdBy,
    history: normalizeHistory(value.history, { createdAt, status, createdBy }),
  };
}

/**
 * Документ → список броней. Поддерживаем `{ version, bookings }` и просто массив
 * (на случай ручной правки или старого файла). `null` и мусор → пустой список.
 */
function normalizeDocument(value: unknown): BookingRecord[] {
  if (value === null) return [];

  const list = Array.isArray(value)
    ? value
    : isPlainObject(value) && Array.isArray(value.bookings)
      ? value.bookings
      : null;
  if (list === null) return [];

  // Дубли кодов (следствие ручной правки) отбрасываем, оставляя первое вхождение.
  const seen = new Set<string>();
  const bookings: BookingRecord[] = [];
  for (const item of list) {
    const record = normalizeRecord(item);
    if (!record) continue;
    const code = record.code.toUpperCase();
    if (seen.has(code)) continue;
    seen.add(code);
    bookings.push(record);
  }
  return bookings;
}

/* -------------------------------------------------------------------------- */
/* Публичный API                                                              */
/* -------------------------------------------------------------------------- */

/** Все брони (включая отменённые). */
export async function listBookings(): Promise<BookingRecord[]> {
  const storage = await getStorage();
  return normalizeDocument(await storage.getDocument<unknown>("bookings"));
}

/** Бронь по коду, регистр не важен. */
export async function findBookingByCode(code: string): Promise<BookingRecord | undefined> {
  const normalized = code.trim().toUpperCase();
  const bookings = await listBookings();
  return bookings.find((booking) => booking.code.toUpperCase() === normalized);
}

export interface BookingMutation<T> {
  /** Новый список броней. Не задан — изменения не сохраняются. */
  bookings?: readonly BookingRecord[];
  value: T;
}

/**
 * Атомарное «прочитать → изменить → записать».
 * Вся проверка конфликтов и уникальности кода должна происходить внутри `mutator`:
 * это единственное место, где состояние защищено от параллельной записи
 * (очередь в файловом драйвере, транзакция с advisory lock в Postgres).
 */
export async function mutateBookings<T>(
  mutator: (bookings: readonly BookingRecord[]) => BookingMutation<T> | Promise<BookingMutation<T>>,
): Promise<T> {
  const storage = await getStorage();

  return storage.withLockedDocument<{ version: number; bookings: BookingRecord[] }, T>(
    "bookings",
    async (current) => {
      const bookings = normalizeDocument(current);
      const outcome = await mutator(bookings);

      return {
        next: {
          version: DOCUMENT_VERSION,
          bookings: outcome.bookings ? [...outcome.bookings] : bookings,
        },
        result: outcome.value,
      };
    },
  );
}

/** Какие снапшоты проставить: заполняются только пустые поля. */
export interface SnapshotPatch {
  serviceId?: string;
  serviceName?: string;
  serviceSlug?: string;
  masterId?: string;
  masterName?: string;
  masterSlug?: string;
}

/**
 * Дописывает названия услуги/мастера в существующие брони.
 *
 * Вызывается **перед** удалением из каталога: после удаления взять имя негде.
 * Заполняем только пустые поля, чтобы не переписать снимок, сделанный при записи.
 * Возвращает число обновлённых броней (для логов и тестов).
 */
export async function backfillSnapshots(patch: SnapshotPatch): Promise<number> {
  const hasService = patch.serviceId !== undefined;
  const hasMaster = patch.masterId !== undefined;
  if (!hasService && !hasMaster) return 0;

  return mutateBookings((bookings) => {
    let changed = 0;

    const next = bookings.map((booking) => {
      const serviceMatches = hasService && booking.serviceId === patch.serviceId;
      const masterMatches = hasMaster && booking.masterId === patch.masterId;
      if (!serviceMatches && !masterMatches) return booking;

      const updated: BookingRecord = {
        ...booking,
        serviceName: serviceMatches
          ? (booking.serviceName ?? patch.serviceName ?? null)
          : booking.serviceName,
        serviceSlug: serviceMatches
          ? (booking.serviceSlug ?? patch.serviceSlug ?? null)
          : booking.serviceSlug,
        masterName: masterMatches
          ? (booking.masterName ?? patch.masterName ?? null)
          : booking.masterName,
        masterSlug: masterMatches
          ? (booking.masterSlug ?? patch.masterSlug ?? null)
          : booking.masterSlug,
      };

      const touched =
        updated.serviceName !== booking.serviceName ||
        updated.serviceSlug !== booking.serviceSlug ||
        updated.masterName !== booking.masterName ||
        updated.masterSlug !== booking.masterSlug;
      if (!touched) return booking;

      changed += 1;
      return updated;
    });

    return changed > 0 ? { bookings: next, value: changed } : { value: 0 };
  });
}
