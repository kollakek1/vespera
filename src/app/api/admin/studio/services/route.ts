import { requireAdmin } from "@/lib/admin-auth";
import { revalidateStudio, studioFailureResponse } from "@/lib/admin-studio";
import { errorResponse, jsonResponse, validationErrorResponse } from "@/lib/booking";
import { createService, serviceCreateSchema } from "@/lib/studio-store";
import { storageFailureResponse } from "@/lib/storage/http";

/** POST /api/admin/studio/services — новая услуга. */
const MAX_BODY_BYTES = 32 * 1024;

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

  const parsed = serviceCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }

  const result = await createService(parsed.data).catch((error: unknown) =>
    storageFailureResponse(error, "[admin/studio/services] не удалось создать услугу", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (result instanceof Response) return result;
  if (!result.ok) {
    return studioFailureResponse(result, "service");
  }

  revalidateStudio();
  return jsonResponse({ ok: true, service: result.value }, 201);
}
