import { requireAdmin } from "@/lib/admin-auth";
import {
  deleteConflictResponse,
  revalidateStudio,
  studioFailureResponse,
} from "@/lib/admin-studio";
import { findFutureConfirmedBookings } from "@/lib/admin-api";
import { errorResponse, jsonResponse, validationErrorResponse } from "@/lib/booking";
import { backfillSnapshots, listBookings } from "@/lib/booking-store";
import {
  deleteService,
  findService,
  servicePatchSchema,
  updateService,
} from "@/lib/studio-store";
import { storageFailureResponse, storageSafe } from "@/lib/storage/http";

/**
 * /api/admin/studio/services/[id]
 * PATCH  — правка услуги (id или slug в пути);
 * DELETE — удаление из каталога. Имена сохраняются снапшотами в бронях.
 *
 * Старые брони не пересчитываются: цена и длительность в них — снимок.
 * Свободные слоты пересчитываются автоматически, они читают каталог на каждый запрос.
 */
const MAX_BODY_BYTES = 32 * 1024;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
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

  const parsed = servicePatchSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }
  if (Object.keys(parsed.data).length === 0) {
    return errorResponse(400, "invalid_request", "Нет полей для изменения");
  }

  const result = await updateService(id, parsed.data).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/studio/services/[id]] не удалось сохранить услугу", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (result instanceof Response) return result;
  if (!result.ok) {
    return studioFailureResponse(result, "service");
  }

  revalidateStudio();
  return jsonResponse({ ok: true, service: result.value });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const service = await storageSafe(
    findService(id),
    "[admin/studio/services/[id]]",
    "Не удалось удалить услугу",
  );
  if (service instanceof Response) return service;
  if (!service) {
    return errorResponse(404, "not_found", "Такая услуга не найдена");
  }

  const bookings = await listBookings().catch((error: unknown) =>
    storageFailureResponse(error, "[admin/studio/services/[id]] не удалось прочитать брони", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (bookings instanceof Response) return bookings;

  const future = findFutureConfirmedBookings(
    bookings,
    (booking) => booking.serviceId === service.id,
  );
  if (future.length > 0) {
    return deleteConflictResponse("service", future);
  }

  // Сначала сохраняем имена в старых бронях, потом удаляем: после удаления имя негде взять.
  const snapshotted = await backfillSnapshots({
    serviceId: service.id,
    serviceName: service.name,
    serviceSlug: service.slug,
  }).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/studio/services/[id]] не удалось сохранить снапшоты", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (snapshotted instanceof Response) return snapshotted;

  const result = await deleteService(service.id).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/studio/services/[id]] не удалось удалить услугу", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (result instanceof Response) return result;
  if (!result.ok) {
    return studioFailureResponse(result, "service");
  }

  revalidateStudio();
  return jsonResponse({ ok: true, service: result.value, bookingsUpdated: snapshotted });
}
