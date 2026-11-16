import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { MAX_RANGE_DAYS, rangeLengthDays, sortBookings, summarize } from "@/lib/admin-api";
import {
  bookingPayloadSchema,
  checkRequestedSlot,
  errorCodeForSlotReason,
  errorResponse,
  generateUniqueBookingCode,
  isBookingStatus,
  jsonResponse,
  normalizePhone,
  statusForSlotReason,
  validationErrorResponse,
  type BookingRecord,
  type BookingStatus,
  type SlotCheckReason,
} from "@/lib/booking";
import { masterFilterOptions, toAdminBookingView } from "@/lib/booking-view";
import { listBookings, mutateBookings } from "@/lib/booking-store";
import { findMaster, findService } from "@/lib/studio-store";
import { TIMEZONE, type StudioMaster } from "@/lib/studio";
import { storageFailureResponse, storageSafe } from "@/lib/storage/http";

/**
 * /api/admin/bookings
 * GET  — список броней за диапазон (не длиннее 62 дней) со сводкой;
 * POST — ручная запись: гость по телефону или walk-in, лид-тайм не действует.
 */

const MAX_BODY_BYTES = 32 * 1024;

const listQuerySchema = z.object({
  from: z.iso.date("Укажите дату начала в формате YYYY-MM-DD"),
  to: z.iso.date("Укажите дату окончания в формате YYYY-MM-DD"),
  masterId: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

const walkInSchema = bookingPayloadSchema.extend({
  /** Явный маркер источника; необязателен, значение допускается только одно. */
  source: z.literal("admin", { error: 'source может быть только "admin"' }).optional(),
  note: z
    .string()
    .trim()
    .max(1000, "Заметка не длиннее 1000 символов")
    .nullable()
    .optional(),
});

type WalkInPayload = z.infer<typeof walkInSchema>;

type CreateOutcome =
  | { kind: "created"; booking: BookingRecord }
  | { kind: "rejected"; reason: SlotCheckReason; message: string };

/** `all` или конкретный мастер (включая архивного — история фильтруется тоже). */
async function resolveMasterFilter(
  value: string | undefined,
): Promise<StudioMaster | null | Response> {
  const normalized = (value ?? "all").trim().toLowerCase();
  if (normalized === "" || normalized === "all") return null;

  const master = await storageSafe(
    findMaster(normalized),
    "[admin/bookings]",
    "Не удалось загрузить список броней. Попробуйте ещё раз",
  );
  if (master instanceof Response) return master;
  if (!master) {
    return errorResponse(400, "unknown_master", "Такого мастера нет в расписании");
  }
  return master;
}

/** `all` или один из статусов; `undefined` — параметр не задан. */
function resolveStatusFilter(value: string | undefined): BookingStatus | null | Response {
  const normalized = (value ?? "all").trim().toLowerCase();
  if (normalized === "" || normalized === "all") return null;

  if (!isBookingStatus(normalized)) {
    return errorResponse(
      400,
      "invalid_request",
      "Неизвестный статус. Допустимо: all, confirmed, completed, cancelled, no_show",
    );
  }
  return normalized;
}

function normalizeNote(note: string | null | undefined): string | null | undefined {
  if (note === undefined) return undefined;
  if (note === null) return null;
  const trimmed = note.trim();
  return trimmed === "" ? null : trimmed;
}

export async function GET(request: Request): Promise<Response> {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    masterId: searchParams.get("masterId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }

  const { from, to } = parsed.data;
  const length = rangeLengthDays(from, to);
  if (length === null) {
    return errorResponse(400, "invalid_request", "Дата указана неверно");
  }
  if (length < 1) {
    return errorResponse(400, "invalid_request", "Дата начала позже даты окончания");
  }
  if (length > MAX_RANGE_DAYS) {
    return errorResponse(
      400,
      "invalid_request",
      `Диапазон не длиннее ${MAX_RANGE_DAYS} дней. Выберите меньший период`,
    );
  }

  const master = await resolveMasterFilter(parsed.data.masterId);
  if (master instanceof Response) return master;

  const status = resolveStatusFilter(parsed.data.status);
  if (status instanceof Response) return status;

  const stored = await listBookings().catch((error: unknown) =>
    storageFailureResponse(error, "[admin/bookings] не удалось прочитать хранилище", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (stored instanceof Response) return stored;

  const bookings = sortBookings(stored).filter((booking) => {
    if (booking.date < from || booking.date > to) return false;
    if (master && booking.masterId !== master.id) return false;
    if (status && booking.status !== status) return false;
    return true;
  });

  const views = await Promise.all(bookings.map((booking) => toAdminBookingView(booking)));

  const masters = await masterFilterOptions().catch((error: unknown) =>
    storageFailureResponse(error, "[admin/bookings]", "Не удалось загрузить список мастеров"),
  );
  if (masters instanceof Response) return masters;

  return jsonResponse({
    ok: true,
    from,
    to,
    masterId: master?.id ?? "all",
    status: status ?? "all",
    timezone: TIMEZONE,
    bookings: views,
    summary: summarize(bookings),
    masters,
  });
}

export async function POST(request: Request): Promise<Response> {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

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

  const parsed = walkInSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }
  const data: WalkInPayload = parsed.data;

  const service = await storageSafe(
    findService(data.serviceId),
    "[admin/bookings]",
    "Не удалось сохранить бронь. Попробуйте ещё раз",
  );
  if (service instanceof Response) return service;
  if (!service) {
    return errorResponse(400, "unknown_service", "Такой услуги нет в расписании");
  }

  const master = await storageSafe(
    findMaster(data.masterId),
    "[admin/bookings]",
    "Не удалось сохранить бронь. Попробуйте ещё раз",
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

  const note = normalizeNote(data.note) ?? null;

  const stored = await listBookings().catch((error: unknown) =>
    storageFailureResponse(error, "[admin/bookings]", "Не удалось сохранить бронь. Попробуйте ещё раз"),
  );
  if (stored instanceof Response) return stored;
  const preliminary = checkRequestedSlot({
    service,
    master,
    date: data.date,
    time: data.time,
    bookings: stored,
    ignoreLeadTime: true,
  });
  if (!preliminary.ok) {
    return errorResponse(
      statusForSlotReason(preliminary.reason),
      errorCodeForSlotReason(preliminary.reason),
      preliminary.message,
    );
  }

  const outcome = await mutateBookings<CreateOutcome>((bookings) => {
    const recheck = checkRequestedSlot({
      service,
      master,
      date: data.date,
      time: data.time,
      bookings,
      ignoreLeadTime: true,
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
      note,
      createdBy: "admin",
      history: [{ at: createdAt, status: "confirmed", by: "admin" }],
    };

    return { bookings: [...bookings, record], value: { kind: "created", booking: record } };
  }).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/bookings] не удалось сохранить бронь", "Сервис временно недоступен. Попробуйте ещё раз"),
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
      booking: await toAdminBookingView(outcome.booking),
    },
    201,
  );
}
