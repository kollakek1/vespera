import { requireAdmin } from "@/lib/admin-auth";
import { jsonResponse } from "@/lib/booking";
import { getCatalogForAdmin, getRituals } from "@/lib/studio-store";
import { storageFailureResponse } from "@/lib/storage/http";

/**
 * GET /api/admin/studio — весь каталог для админки.
 * Удаление физическое, поэтому «скрытых» записей здесь нет.
 */
export async function GET(request: Request): Promise<Response> {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const catalog = await getCatalogForAdmin().catch((error: unknown) =>
    storageFailureResponse(error, "[admin/studio] не удалось прочитать каталог", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (catalog instanceof Response) return catalog;

  return jsonResponse({
    ok: true,
    services: catalog.services,
    masters: catalog.masters,
    rituals: getRituals(),
    updatedAt: catalog.updatedAt,
  });
}
