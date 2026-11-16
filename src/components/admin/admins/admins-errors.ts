import { AdminApiError, adminErrorMessage } from "@/lib/admin-client";

/**
 * Доменные коды `/api/admin/admins` → человеческий текст.
 * Сервер присылает английские коды, в консоли показываем формулировки студии.
 */
const BY_CODE: Record<string, string> = {
  last_owner: "Нельзя оставить студию без владельца",
  self_deactivate: "Нельзя отключить собственную учётную запись",
  invalid_password: "Неверный текущий пароль",
  email_taken: "Этот email уже используется",
  forbidden: "Раздел доступен только владельцу студии",
};

export function adminAccountsMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) {
    const mapped = BY_CODE[error.code];
    if (mapped) return mapped;
  }
  return adminErrorMessage(error, fallback);
}
