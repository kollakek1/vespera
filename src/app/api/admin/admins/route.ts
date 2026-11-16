import { invalidateAdminCache, requireOwner } from "@/lib/admin-auth";
import { adminFailureResponse, createAdminSchema } from "@/lib/admin-admins";
import { createAdmin, ensureAdmins, toPublicAdmin } from "@/lib/admin-store";
import { errorResponse, jsonResponse, validationErrorResponse } from "@/lib/booking";
import { storageFailureResponse } from "@/lib/storage/http";

/**
 * /api/admin/admins — список администраторов и создание нового.
 *
 * Доступ только у владельца (`owner`). Хэши паролей наружу не отдаются никогда.
 */

const MAX_BODY_BYTES = 16 * 1024;

export async function GET(request: Request): Promise<Response> {
  const guard = await requireOwner(request);
  if (!guard.ok) return guard.response;

  const result = await ensureAdmins().catch((error: unknown) =>
    storageFailureResponse(error, "[admin/admins]", "Не удалось загрузить список администраторов"),
  );
  if (result instanceof Response) return result;

  if (!result.ok) {
    return errorResponse(
      500,
      result.reason === "not_configured" ? "not_configured" : "server_error",
      result.reason === "not_configured"
        ? `Админка не настроена: ${result.message}`
        : `${result.message}. Панель закрыта: восстановите документ администраторов (см. docs/admins.md)`,
    );
  }

  const admins = [...result.admins]
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
    .map(toPublicAdmin);

  return jsonResponse({ ok: true, admins });
}

export async function POST(request: Request): Promise<Response> {
  const guard = await requireOwner(request);
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

  const parsed = createAdminSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }

  const result = await createAdmin({
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role ?? "manager",
    password: parsed.data.password,
    createdBy: guard.admin.id,
  }).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/admins] не удалось создать администратора", "Сервис временно недоступен. Попробуйте ещё раз"),
  );

  if (result instanceof Response) return result;
  if (!result.ok) return adminFailureResponse(result);

  invalidateAdminCache(result.value.id);
  return jsonResponse({ ok: true, admin: result.value }, 201);
}
