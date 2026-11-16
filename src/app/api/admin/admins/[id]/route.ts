import { invalidateAdminCache, requireOwner } from "@/lib/admin-auth";
import { adminFailureResponse, patchAdminSchema } from "@/lib/admin-admins";
import { deactivateAdmin, updateAdmin } from "@/lib/admin-store";
import { errorResponse, jsonResponse, validationErrorResponse } from "@/lib/booking";
import { storageFailureResponse } from "@/lib/storage/http";

/**
 * /api/admin/admins/[id]
 * PATCH  — имя, email, роль, активность.
 * DELETE — деактивация (физического удаления нет: аудит и история остаются).
 *
 * Гарды: последнего активного владельца понизить/деактивировать нельзя,
 * себя деактивировать нельзя.
 */

const MAX_BODY_BYTES = 16 * 1024;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireOwner(request);
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

  const parsed = patchAdminSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }
  if (Object.keys(parsed.data).length === 0) {
    return errorResponse(400, "invalid_request", "Нет полей для изменения");
  }

  const result = await updateAdmin(id, parsed.data, guard.admin.id).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/admins/[id]] не удалось обновить администратора", "Сервис временно недоступен. Попробуйте ещё раз"),
  );

  if (result instanceof Response) return result;
  if (!result.ok) return adminFailureResponse(result);

  // Роль и активность могли измениться — сбрасываем кэш, чтобы применилось сразу.
  invalidateAdminCache(id);
  return jsonResponse({ ok: true, admin: result.value });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireOwner(request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;

  const result = await deactivateAdmin(id, guard.admin.id).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/admins/[id]] не удалось деактивировать администратора", "Сервис временно недоступен. Попробуйте ещё раз"),
  );

  if (result instanceof Response) return result;
  if (!result.ok) return adminFailureResponse(result);

  invalidateAdminCache(id);
  return jsonResponse({ ok: true, admin: result.value });
}
