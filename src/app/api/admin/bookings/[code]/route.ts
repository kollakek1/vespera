import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { canTransition, transitionErrorMessage } from "@/lib/admin-api";
import { toAdminBookingView } from "@/lib/booking-view";
import {
  BOOKING_STATUSES,
  bookingInterval,
  errorResponse,
  isSlotBusy,
  jsonResponse,
  normalizeBookingCode,
  validationErrorResponse,
  type BookingRecord,
  type BookingStatus,
} from "@/lib/booking";
import { findBookingByCode, mutateBookings } from "@/lib/booking-store";
import { TIMEZONE } from "@/lib/studio";
import { storageFailureResponse, storageSafe } from "@/lib/storage/http";

/**
 * /api/admin/bookings/[code]
 * GET   — полная карточка (телефон, email, комментарий, заметка, история);
 * PATCH — смена статуса и/или заметки.
 *
 * Отмена освобождает слот: публичная доступность учитывает только `confirmed`.
 */

const patchSchema = z.object({
  status: z.enum(BOOKING_STATUSES, {
    error: "Укажите статус: confirmed, completed, cancelled или no_show",
  }),
  /** `null` — стереть заметку, отсутствие поля — не менять. */
  note: z.string().trim().max(1000, "Заметка не длиннее 1000 символов").nullable().optional(),
});

type PatchOutcome =
  | { kind: "updated"; booking: BookingRecord }
  | { kind: "not_found" }
  | { kind: "invalid_transition"; from: BookingStatus; to: BookingStatus }
  | { kind: "conflict" };

function normalizeNote(note: string | null | undefined): string | null | undefined {
  if (note === undefined) return undefined;
  if (note === null) return null;
  const trimmed = note.trim();
  return trimmed === "" ? null : trimmed;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
): Promise<Response> {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { code: rawCode } = await context.params;
  const code = normalizeBookingCode(rawCode);
  if (!code) {
    return errorResponse(400, "invalid_request", "Код брони выглядит так: VSP-7K4M");
  }

  const booking = await findBookingByCode(code).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/bookings/[code]] не удалось прочитать хранилище", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (booking instanceof Response) return booking;
  if (!booking) {
    return errorResponse(404, "not_found", "Бронь с таким кодом не найдена");
  }

  return jsonResponse({
    ok: true,
    timezone: TIMEZONE,
    booking: await toAdminBookingView(booking),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ code: string }> },
): Promise<Response> {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { code: rawCode } = await context.params;
  const code = normalizeBookingCode(rawCode);
  if (!code) {
    return errorResponse(400, "invalid_request", "Код брони выглядит так: VSP-7K4M");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_request", "Тело запроса должно быть корректным JSON");
  }

  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }

  const target = parsed.data.status;
  const note = normalizeNote(parsed.data.note);

  const current = await storageSafe(
    findBookingByCode(code),
    "[admin/bookings/[code]]",
    "Не удалось обновить бронь. Попробуйте ещё раз",
  );
  if (current instanceof Response) return current;
  if (!current) {
    return errorResponse(404, "not_found", "Бронь с таким кодом не найдена");
  }
  if (!canTransition(current.status, target)) {
    return errorResponse(
      400,
      "invalid_transition",
      transitionErrorMessage(current.status, target),
    );
  }

  const at = new Date().toISOString();
  const outcome = await mutateBookings<PatchOutcome>((bookings) => {
    const index = bookings.findIndex((booking) => booking.code.toUpperCase() === code);
    if (index === -1) return { value: { kind: "not_found" } };

    const record = bookings[index];
    if (!record) return { value: { kind: "not_found" } };

    if (!canTransition(record.status, target)) {
      return { value: { kind: "invalid_transition", from: record.status, to: target } };
    }

    // Возврат в расписание конфликтует с чужими бронями — проверяем до записи.
    if (target === "confirmed" && record.status !== "confirmed") {
      const interval = bookingInterval(record);
      const others = bookings.filter((booking) => booking.code.toUpperCase() !== code);
      if (
        interval &&
        isSlotBusy(others, record.masterId, record.date, interval.startMin, interval.endMin)
      ) {
        return { value: { kind: "conflict" } };
      }
    }

    const updated: BookingRecord = {
      ...record,
      status: target,
      note: note === undefined ? record.note : note,
      history:
        target === record.status
          ? record.history
          : [...record.history, { at, status: target, by: "admin" }],
    };

    const next = [...bookings];
    next[index] = updated;
    return { bookings: next, value: { kind: "updated", booking: updated } };
  }).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/bookings/[code]] не удалось сохранить статус", "Сервис временно недоступен. Попробуйте ещё раз"),
  );

  if (outcome instanceof Response) return outcome;

  switch (outcome.kind) {
    case "not_found":
      return errorResponse(404, "not_found", "Бронь с таким кодом не найдена");
    case "invalid_transition":
      return errorResponse(
        400,
        "invalid_transition",
        transitionErrorMessage(outcome.from, outcome.to),
      );
    case "conflict":
      return errorResponse(
        409,
        "slot_taken",
        "Это время уже занято другой бронью: сначала отмените её",
      );
    case "updated":
      return jsonResponse({ ok: true, booking: await toAdminBookingView(outcome.booking) });
  }
}
