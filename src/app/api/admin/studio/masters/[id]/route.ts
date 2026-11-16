import { requireAdmin } from "@/lib/admin-auth";
import {
  deleteConflictResponse,
  revalidateStudio,
  studioFailureResponse,
} from "@/lib/admin-studio";
import { findFutureConfirmedBookings } from "@/lib/admin-api";
import { errorResponse, jsonResponse, validationErrorResponse } from "@/lib/booking";
import { backfillSnapshots, listBookings } from "@/lib/booking-store";
import { deleteMaster, findMaster, masterPatchSchema, updateMaster } from "@/lib/studio-store";
import { storageFailureResponse, storageSafe } from "@/lib/storage/http";

/**
 * /api/admin/studio/masters/[id]
 * PATCH  — правка мастера;
 * DELETE — удаление из каталога; имя сохраняется снапшотом в старых бронях.
 *
 * Смена `workingDays` или `serviceIds` сразу меняет свободные слоты: расписание
 * читается из каталога на каждый запрос. Существующие брони не переносятся.
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

  const parsed = masterPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }
  if (Object.keys(parsed.data).length === 0) {
    return errorResponse(400, "invalid_request", "Нет полей для изменения");
  }

  const result = await updateMaster(id, parsed.data).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/studio/masters/[id]] не удалось сохранить мастера", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (result instanceof Response) return result;
  if (!result.ok) {
    return studioFailureResponse(result, "master");
  }

  revalidateStudio();
  return jsonResponse({ ok: true, master: result.value });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const master = await storageSafe(
    findMaster(id),
    "[admin/studio/masters/[id]]",
    "Не удалось удалить мастера",
  );
  if (master instanceof Response) return master;
  if (!master) {
    return errorResponse(404, "not_found", "Такой мастер не найден");
  }

  const bookings = await listBookings().catch((error: unknown) =>
    storageFailureResponse(error, "[admin/studio/masters/[id]] не удалось прочитать брони", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (bookings instanceof Response) return bookings;

  const future = findFutureConfirmedBookings(
    bookings,
    (booking) => booking.masterId === master.id,
  );
  if (future.length > 0) {
    return deleteConflictResponse("master", future);
  }

  // Снапшот до удаления: после него имя мастера взять негде.
  const snapshotted = await backfillSnapshots({
    masterId: master.id,
    masterName: master.name,
    masterSlug: master.slug,
  }).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/studio/masters/[id]] не удалось сохранить снапшоты", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (snapshotted instanceof Response) return snapshotted;

  const result = await deleteMaster(master.id).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/studio/masters/[id]] не удалось удалить мастера", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (result instanceof Response) return result;
  if (!result.ok) {
    return studioFailureResponse(result, "master");
  }

  revalidateStudio();
  return jsonResponse({ ok: true, master: result.value, bookingsUpdated: snapshotted });
}
