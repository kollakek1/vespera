import {
  checkRequestedSlot,
  clientIp,
  createRateLimiter,
  errorCodeForSlotReason,
  errorResponse,
  generateBookingCode,
  generateUniqueBookingCode,
  jsonResponse,
  normalizePhone,
  publicBookingPayloadSchema,
  statusForSlotReason,
  validationErrorResponse,
  type BookingRecord,
  type PublicBookingPayload,
  type SlotCheckReason,
} from "@/lib/booking";
import { toBookingConfirmationView, toBookingRecapView } from "@/lib/booking-view";
import { listBookings, mutateBookings } from "@/lib/booking-store";
import { storageFailureResponse, storageSafe } from "@/lib/storage/http";
import { findMaster, findService } from "@/lib/studio-store";

/**
 * POST /api/booking — создание брони.
 *
 * Доверяем клиенту только выбор услуги/мастера и времени: цена, длительность и
 * занятость всегда пересчитываются по серверному каталогу (`studio-store`).
 * Архивные услуги и мастера публично не записывают.
 */

/** 5 заявок с одного IP за 10 минут. Считаем только прошедшие валидацию запросы. */
const createLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

/** Форма записи с комментарием — это сотни байт; 16 КБ хватает с запасом. */
const MAX_BODY_BYTES = 16 * 1024;

/** Схема общая с админской ручной записью: поля не дублируем. */
const bodySchema = publicBookingPayloadSchema;

type Body = PublicBookingPayload;

type CreateOutcome =
  | { kind: "created"; booking: BookingRecord }
  | { kind: "duplicate"; booking: BookingRecord }
  | { kind: "rejected"; reason: SlotCheckReason; message: string };

interface RequestFingerprint {
  serviceId: string;
  masterId: string;
  date: string;
  time: string;
  phone: string;
}

/** Совпадение по услуге, мастеру, слоту и телефону — это повтор той же заявки. */
function findSameRequest(
  bookings: readonly BookingRecord[],
  key: RequestFingerprint,
): BookingRecord | undefined {
  return bookings.find(
    (booking) =>
      booking.status === "confirmed" &&
      booking.serviceId === key.serviceId &&
      booking.masterId === key.masterId &&
      booking.date === key.date &&
      booking.time === key.time &&
      booking.phone === key.phone,
  );
}

/** Быстрее этого форму человек не заполнит. */
const MIN_FORM_FILL_MS = 1500;

/**
 * Признаки бота.
 *
 * - `vespera_hp` — поле-ловушка со «случайным» именем; заполнено → бот.
 * - `honeypot` — то же самое под старым именем, пока UI не переименован.
 * - `company` намеренно НЕ проверяется: браузерные автозаполнители сами кладут
 *   туда «Организацию», и реальные заявки превращались в фиктивный успех.
 * - `formStartedAt` — если форма «заполнена» быстрее 1.5 c, это бот. Нет поля,
 *   мусор или время из будущего — считаем человеком, чтобы не резать живые заявки.
 */
function looksLikeBot(data: Body, now: number): boolean {
  const trap = data.vespera_hp ?? data.honeypot;
  if (typeof trap === "string" && trap.trim() !== "") return true;

  const startedAt = data.formStartedAt;
  if (typeof startedAt === "number") {
    const elapsed = now - startedAt;
    if (elapsed >= 0 && elapsed < MIN_FORM_FILL_MS) return true;
  }

  return false;
}

/**
 * Ответ на заполненную ловушку: снаружи — обычный успех (201), внутри — ничего не записано.
 * Форму ответа повторяем полностью, чтобы бот не отличил подделку.
 */
async function honeypotResponse(data: Body): Promise<Response> {
  const [service, master] = await Promise.all([
    storageSafe(findService(data.serviceId), "[booking]", "Не удалось создать бронь. Попробуйте ещё раз"),
    storageSafe(findMaster(data.masterId), "[booking]", "Не удалось создать бронь. Попробуйте ещё раз"),
  ]);
  if (service instanceof Response) return service;
  if (master instanceof Response) return master;
  const code = generateBookingCode();
  const createdAt = new Date().toISOString();
  const decoy: BookingRecord = {
    code,
    status: "confirmed",
    serviceId: service?.id ?? data.serviceId,
    masterId: master?.id ?? data.masterId,
    serviceName: service?.name ?? null,
    serviceSlug: service?.slug ?? null,
    masterName: master?.name ?? null,
    masterSlug: master?.slug ?? null,
    date: data.date,
    time: data.time,
    durationMin: service?.durationMin ?? 0,
    priceRub: service?.priceRub ?? 0,
    name: data.name,
    phone: normalizePhone(data.phone) ?? "",
    email: data.email ?? null,
    comment: data.comment ?? null,
    createdAt,
    note: null,
    createdBy: "public",
    history: [{ at: createdAt, status: "confirmed", by: "public" }],
  };
  return jsonResponse({ ok: true, code, booking: await toBookingConfirmationView(decoy) }, 201);
}

export async function POST(request: Request): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return errorResponse(413, "invalid_request", "Слишком большой запрос");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_request", "Тело запроса должно быть корректным JSON");
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return errorResponse(400, "invalid_request", "Тело запроса должно быть JSON-объектом");
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }
  const data = parsed.data;

  const limit = createLimiter.check(clientIp(request));
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSec / 60);
    return errorResponse(
      429,
      "rate_limited",
      `Слишком много заявок с этого адреса. Попробуйте через ${minutes} мин.`,
      {
        headers: { "retry-after": String(limit.retryAfterSec) },
        details: { retryAfterSec: limit.retryAfterSec },
      },
    );
  }

  if (looksLikeBot(data, Date.now())) {
    return honeypotResponse(data);
  }

  const service = await storageSafe(
    findService(data.serviceId),
    "[booking]",
    "Не удалось создать бронь. Попробуйте ещё раз",
  );
  if (service instanceof Response) return service;
  if (!service) {
    return errorResponse(400, "unknown_service", "Такой услуги нет в расписании");
  }

  const master = await storageSafe(
    findMaster(data.masterId),
    "[booking]",
    "Не удалось создать бронь. Попробуйте ещё раз",
  );
  if (master instanceof Response) return master;
  if (!master) {
    return errorResponse(400, "unknown_master", "Такого мастера нет в расписании");
  }

  const phone = normalizePhone(data.phone);
  if (!phone) {
    return errorResponse(400, "invalid_request", "Телефон в формате +7 999 123-45-67", {
      details: { fields: [{ field: "phone", message: "Укажите российский номер телефона" }] },
    });
  }

  // Быстрая проверка без блокировки записи: большинство отказов отсекается здесь.
  const existing = await listBookings().catch((error: unknown) =>
    storageFailureResponse(error, "[booking]", "Не удалось создать бронь. Попробуйте ещё раз"),
  );
  if (existing instanceof Response) return existing;

  // Двойная отправка формы (двойной клик, повтор после таймаута) — это та же бронь,
  // а не конфликт: отдаём уже созданную, а не «слот занят».
  const alreadyBooked = findSameRequest(existing, {
    serviceId: service.id,
    masterId: master.id,
    date: data.date,
    time: data.time,
    phone,
  });
  if (alreadyBooked) {
    // Чужой экран подтверждения: только код и маскированный телефон.
    // Зная телефон и слот, получить имя, email или комментарий нельзя.
    return jsonResponse(
      {
        ok: true,
        duplicate: true,
        code: alreadyBooked.code,
        booking: await toBookingRecapView(alreadyBooked),
      },
      200,
    );
  }

  const preliminary = checkRequestedSlot({
    service,
    master,
    date: data.date,
    time: data.time,
    bookings: existing,
  });
  if (!preliminary.ok) {
    return errorResponse(
      statusForSlotReason(preliminary.reason),
      errorCodeForSlotReason(preliminary.reason),
      preliminary.message,
    );
  }

  // Повторная проверка и запись — внутри одной критической секции.
  const outcome = await mutateBookings<CreateOutcome>((bookings) => {
    const duplicate = findSameRequest(bookings, {
      serviceId: service.id,
      masterId: master.id,
      date: data.date,
      time: data.time,
      phone,
    });
    if (duplicate) {
      return { value: { kind: "duplicate", booking: duplicate } };
    }

    // Пока шла валидация, слот мог занять другой гость.
    const recheck = checkRequestedSlot({
      service,
      master,
      date: data.date,
      time: data.time,
      bookings,
    });
    if (!recheck.ok) {
      return { value: { kind: "rejected", reason: recheck.reason, message: recheck.message } };
    }

    const takenCodes = new Set(bookings.map((booking) => booking.code.toUpperCase()));
    const createdAt = new Date().toISOString();
    const record: BookingRecord = {
      code: generateUniqueBookingCode(takenCodes),
      status: "confirmed",
      serviceId: service.id,
      masterId: master.id,
      serviceName: service.name,
      serviceSlug: service.slug,
      masterName: master.name,
      masterSlug: master.slug,
      date: data.date,
      time: data.time,
      durationMin: service.durationMin,
      priceRub: service.priceRub,
      name: data.name,
      phone,
      email: data.email ?? null,
      comment: data.comment ?? null,
      createdAt,
      note: null,
      createdBy: "public",
      history: [{ at: createdAt, status: "confirmed", by: "public" }],
    };

    return { bookings: [...bookings, record], value: { kind: "created", booking: record } };
  }).catch((error: unknown) =>
    storageFailureResponse(error, "[booking]", "Не удалось сохранить бронь. Попробуйте ещё раз"),
  );

  if (outcome instanceof Response) return outcome;

  if (outcome.kind === "rejected") {
    return errorResponse(
      statusForSlotReason(outcome.reason),
      errorCodeForSlotReason(outcome.reason),
      outcome.message,
    );
  }

  return jsonResponse(
    {
      ok: true,
      code: outcome.booking.code,
      booking: await toBookingConfirmationView(outcome.booking),
    },
    outcome.kind === "created" ? 201 : 200,
  );
}
