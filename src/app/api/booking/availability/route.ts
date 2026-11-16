import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import {
  buildAvailability,
  jsonResponse,
  validationErrorResponse,
  type AvailabilityReason,
  type Slot,
} from "@/lib/booking";
import { listBookings } from "@/lib/booking-store";
import { storageFailureResponse, storageSafe } from "@/lib/storage/http";
import { findMaster, findService } from "@/lib/studio-store";
import { TIMEZONE } from "@/lib/studio";

/**
 * GET /api/booking/availability?serviceId=&masterId=&date=YYYY-MM-DD
 *
 * Отдаёт все стартовые точки сетки на дату с флагом `available`.
 * Несуществующие услуга/мастер и нерабочий день — не ошибка ввода:
 * `200`, `slots: []` и `reason`, чтобы интерфейс показал понятный текст.
 */
const querySchema = z.object({
  serviceId: z.string({ error: "Укажите услугу" }).trim().min(1, "Укажите услугу"),
  masterId: z.string({ error: "Укажите мастера" }).trim().min(1, "Укажите мастера"),
  date: z.iso.date("Дата должна быть в формате YYYY-MM-DD"),
});

interface AvailabilityBody {
  date: string;
  serviceId: string;
  masterId: string;
  durationMin: number | null;
  timezone: string;
  slots: Slot[];
  reason?: AvailabilityReason;
}

interface AvailabilityFields {
  date: string;
  serviceId: string;
  masterId: string;
  durationMin: number | null;
  slots?: Slot[];
  reason?: AvailabilityReason;
}

function body(fields: AvailabilityFields): AvailabilityBody {
  const { slots, reason, ...rest } = fields;
  return {
    ...rest,
    timezone: TIMEZONE,
    slots: slots ?? [],
    ...(reason ? { reason } : {}),
  };
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const parsed = querySchema.safeParse({
    serviceId: searchParams.get("serviceId") ?? undefined,
    masterId: searchParams.get("masterId") ?? undefined,
    date: searchParams.get("date") ?? undefined,
  });

  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }

  const { date } = parsed.data;
  // Архивные услуги и мастера публично не предлагаем: findService/findMaster их отсекают.
  const service = await storageSafe(
    findService(parsed.data.serviceId),
    "[booking/availability]",
    "Не удалось загрузить расписание. Попробуйте ещё раз",
  );
  if (service instanceof Response) return service;

  const master = await storageSafe(
    findMaster(parsed.data.masterId),
    "[booking/availability]",
    "Не удалось загрузить расписание. Попробуйте ещё раз",
  );
  if (master instanceof Response) return master;

  if (!service) {
    return jsonResponse(
      body({
        date,
        serviceId: parsed.data.serviceId,
        masterId: master?.id ?? parsed.data.masterId,
        durationMin: null,
        reason: "unknown_service",
      }),
    );
  }

  if (!master) {
    return jsonResponse(
      body({
        date,
        serviceId: service.id,
        masterId: parsed.data.masterId,
        durationMin: service.durationMin,
        reason: "unknown_master",
      }),
    );
  }

  const bookings = await listBookings().catch((error: unknown) =>
    storageFailureResponse(
      error,
      "[booking/availability]",
      "Не удалось загрузить расписание. Попробуйте ещё раз",
    ),
  );
  if (bookings instanceof Response) return bookings;

  // Админ с валидной cookie видит и слоты ближе двух часов: ему нужна ручная запись.
  // Публичного гостя это не касается — без cookie правило прежнее.
  const viewer = await getAdminSession(request);
  const result = buildAvailability({
    service,
    master,
    date,
    bookings,
    ignoreLeadTime: viewer !== null,
  });

  return jsonResponse(
    body({
      date,
      serviceId: service.id,
      masterId: master.id,
      durationMin: result.durationMin,
      slots: result.slots,
      reason: result.reason,
    }),
  );
}
