import {
  clientIp,
  createRateLimiter,
  errorResponse,
  jsonResponse,
  normalizeBookingCode,
} from "@/lib/booking";
import { toBookingView } from "@/lib/booking-view";
import { findBookingByCode } from "@/lib/booking-store";
import { storageFailureResponse } from "@/lib/storage/http";
import { TIMEZONE } from "@/lib/studio";

/**
 * GET /api/booking/[code] — экран подтверждения.
 *
 * Код брони — единственный «ключ доступа», поэтому:
 * - отдаём только безопасную проекцию (телефон замаскирован, email и комментарий скрыты);
 * - ограничиваем перебор кодов по IP.
 */
const lookupLimiter = createRateLimiter({ limit: 60, windowMs: 10 * 60_000 });

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code: rawCode } = await context.params;
  const code = normalizeBookingCode(rawCode);
  if (!code) {
    return errorResponse(400, "invalid_request", "Код брони выглядит так: VSP-7K4M");
  }

  const limit = lookupLimiter.check(clientIp(request));
  if (!limit.allowed) {
    return errorResponse(429, "rate_limited", "Слишком много запросов. Попробуйте позже", {
      headers: { "retry-after": String(limit.retryAfterSec) },
    });
  }

  const booking = await findBookingByCode(code).catch((error: unknown) =>
    storageFailureResponse(error, "[booking/[code]]", "Не удалось загрузить бронь. Попробуйте ещё раз"),
  );
  if (booking instanceof Response) return booking;

  if (!booking) {
    return errorResponse(404, "not_found", "Бронь с таким кодом не найдена");
  }

  return jsonResponse({
    ok: true,
    timezone: TIMEZONE,
    booking: await toBookingView(booking),
  });
}
