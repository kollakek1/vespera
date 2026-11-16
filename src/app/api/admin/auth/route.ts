import { z } from "zod";

import {
  ADMIN_SESSION_TTL_SECONDS,
  adminSessionCookie,
  clearAdminSessionCookie,
  createAdminSessionToken,
  getAdminSession,
  getSessionSecret,
} from "@/lib/admin-auth";
import {
  DEFAULT_ADMIN_EMAIL,
  ensureAdmins,
  hashPassword,
  normalizeEmail,
  toPublicAdmin,
  touchLastLogin,
  verifyPassword,
} from "@/lib/admin-store";
import {
  clientIp,
  createRateLimiter,
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/booking";
import { storageFailureResponse } from "@/lib/storage/http";

/**
 * /api/admin/auth — вход, выход и проверка сессии.
 *
 * Вход по паре email + пароль. Для совместимости со старой формой email можно
 * не передавать: тогда ищем владельца по `ADMIN_EMAIL` (или `admin@vespera.studio`).
 * Сессия — HttpOnly cookie с HMAC-подписью и id администратора внутри.
 */

/** 5 попыток с одного IP за 10 минут. */
const ipLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });
/** Плюс 5 попыток на конкретную пару email: перебор чужого аккаунта с одного IP не пройдёт. */
const emailLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(120, "Слишком длинный email")
    .optional(),
  password: z
    .string({ error: "Укажите пароль" })
    .min(1, "Укажите пароль")
    .max(200, "Слишком длинный пароль"),
});

/** Хэш-заглушка: выравнивает время ответа, чтобы нельзя было перебирать email по таймингу. */
let decoyHash: Promise<string> | null = null;
function getDecoyHash(): Promise<string> {
  decoyHash ??= hashPassword("vespera-decoy-password-for-timing");
  return decoyHash;
}

async function verifyPasswordAgainstDecoy(password: string): Promise<boolean> {
  await verifyPassword(password, await getDecoyHash());
  return false;
}

function rateLimitResponse(retryAfterSec: number): Response {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return errorResponse(
    429,
    "rate_limited",
    `Слишком много попыток входа. Попробуйте через ${minutes} мин.`,
    {
      headers: { "retry-after": String(retryAfterSec) },
      details: { retryAfterSec },
    },
  );
}

function defaultLoginEmail(): string {
  return normalizeEmail(process.env.ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL);
}

export async function POST(request: Request): Promise<Response> {
  const secret = getSessionSecret();
  if (!secret) {
    return errorResponse(
      500,
      "not_configured",
      "Админка не настроена: ADMIN_SESSION_SECRET не задан или короче 16 символов. Добавьте его в .env.local и перезапустите сервер",
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_request", "Тело запроса должно быть корректным JSON");
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }

  const ipLimit = ipLimiter.check(clientIp(request));
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSec);

  const email = parsed.data.email ? normalizeEmail(parsed.data.email) : defaultLoginEmail();
  const emailKey = `email:${email}`;
  const emailLimit = emailLimiter.check(emailKey);
  if (!emailLimit.allowed) return rateLimitResponse(emailLimit.retryAfterSec);

  const admins = await ensureAdmins().catch((error: unknown) =>
    storageFailureResponse(error, "[admin/auth]", "Не удалось выполнить вход. Попробуйте ещё раз"),
  );
  if (admins instanceof Response) return admins;

  if (!admins.ok) {
    const message =
      admins.reason === "not_configured"
        ? `Админка не настроена: ${admins.message}. Добавьте ADMIN_PASSWORD в .env.local`
        : `${admins.message}. Панель закрыта: восстановите документ администраторов (см. docs/admins.md)`;
    return errorResponse(500, admins.reason === "not_configured" ? "not_configured" : "server_error", message);
  }

  const record = admins.admins.find((admin) => admin.email === email);
  const passwordOk =
    record && record.active
      ? await verifyPassword(parsed.data.password, record.passwordHash)
      : await verifyPasswordAgainstDecoy(parsed.data.password);

  // Один и тот же ответ на «нет такого», «неактивен» и «неверный пароль».
  if (!record || !record.active || !passwordOk) {
    return errorResponse(401, "unauthorized", "Неверный email или пароль");
  }

  emailLimiter.reset(emailKey);

  try {
    await touchLastLogin(record.id);
  } catch (error) {
    // Не мешаем входу из-за отметки аудита.
    console.error("[admin/auth] не удалось обновить lastLoginAt", error);
  }

  const now = Date.now();
  const token = createAdminSessionToken(secret, record, ADMIN_SESSION_TTL_SECONDS, now);
  const admin = toPublicAdmin(record);

  return jsonResponse(
    {
      ok: true,
      authenticated: true,
      expiresAt: new Date(now + ADMIN_SESSION_TTL_SECONDS * 1000).toISOString(),
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    },
    200,
    { "set-cookie": adminSessionCookie(token) },
  );
}

export async function GET(request: Request): Promise<Response> {
  const admin = await getAdminSession(request);
  return jsonResponse({
    authenticated: admin !== null,
    admin: admin
      ? { id: admin.id, email: admin.email, name: admin.name, role: admin.role }
      : null,
  });
}

export async function DELETE(): Promise<Response> {
  return jsonResponse({ ok: true, authenticated: false }, 200, {
    "set-cookie": clearAdminSessionCookie(),
  });
}
