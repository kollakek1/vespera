import { invalidateAdminCache, requireAdmin } from "@/lib/admin-auth";
import { adminFailureResponse, passwordChangeSchema } from "@/lib/admin-admins";
import { changeAdminPassword } from "@/lib/admin-store";
import { errorResponse, jsonResponse, validationErrorResponse } from "@/lib/booking";
import { storageFailureResponse } from "@/lib/storage/http";

/**
 * POST /api/admin/admins/[id]/password
 *
 * Свой пароль меняет любой администратор и обязан назвать текущий.
 * Чужой пароль сбрасывает только владелец и без старого пароля.
 */

const MAX_BODY_BYTES = 16 * 1024;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const isSelf = guard.admin.id === id;

  if (!isSelf && guard.admin.role !== "owner") {
    return errorResponse(403, "forbidden", "Сбросить чужой пароль может только владелец студии");
  }

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

  const parsed = passwordChangeSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }

  if (isSelf && !parsed.data.currentPassword) {
    return errorResponse(400, "invalid_request", "Укажите текущий пароль", {
      details: { fields: [{ field: "currentPassword", message: "Укажите текущий пароль" }] },
    });
  }

  const result = await changeAdminPassword(id, {
    newPassword: parsed.data.password,
    currentPassword: parsed.data.currentPassword,
    requireCurrent: isSelf,
  }).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/admins/[id]/password] не удалось сменить пароль", "Сервис временно недоступен. Попробуйте ещё раз"),
  );

  if (result instanceof Response) return result;
  if (!result.ok) return adminFailureResponse(result);

  invalidateAdminCache(id);
  return jsonResponse({ ok: true, admin: result.value });
}
