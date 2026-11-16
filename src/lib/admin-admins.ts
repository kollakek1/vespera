/**
 * Общие схемы и маппинг ошибок для роутов управления администраторами.
 * Держим вне route.ts: Next разрешает экспортировать оттуда только HTTP-методы.
 */

import { z } from "zod";

import type { AdminWriteFailure } from "./admin-store";
import {
  ADMIN_ROLES,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  isValidEmail,
  isValidName,
} from "./admin-store";
import { errorResponse } from "./booking";

export const emailField = z
  .string({ error: "Укажите email" })
  .trim()
  .toLowerCase()
  .max(MAX_EMAIL_LENGTH, "Слишком длинный email")
  .refine(isValidEmail, "Некорректный email");

export const nameField = z
  .string({ error: "Укажите имя" })
  .trim()
  .refine(isValidName, `Имя должно быть от 2 до ${MAX_NAME_LENGTH} символов`);

export const passwordField = z
  .string({ error: "Укажите пароль" })
  .min(MIN_PASSWORD_LENGTH, `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`)
  .max(MAX_PASSWORD_LENGTH, "Слишком длинный пароль");

export const createAdminSchema = z.object({
  email: emailField,
  name: nameField,
  role: z.enum(ADMIN_ROLES, { error: "Роль: owner или manager" }).optional(),
  password: passwordField,
});

export const patchAdminSchema = z.object({
  email: emailField.optional(),
  name: nameField.optional(),
  role: z.enum(ADMIN_ROLES, { error: "Роль: owner или manager" }).optional(),
  active: z.boolean({ error: "active — true или false" }).optional(),
});

export const passwordChangeSchema = z.object({
  password: passwordField,
  currentPassword: z.string().max(MAX_PASSWORD_LENGTH, "Слишком длинный пароль").optional(),
});

/** Доменная ошибка → HTTP-ответ. */
export function adminFailureResponse(failure: AdminWriteFailure): Response {
  switch (failure.reason) {
    case "not_found":
      return errorResponse(404, "not_found", "Администратор не найден");

    case "email_taken":
      return errorResponse(409, "email_taken", `Email ${failure.email} уже занят`, {
        details: { fields: [{ field: "email", message: "Этот email уже используется" }] },
      });

    case "last_owner":
      return errorResponse(
        400,
        "last_owner",
        "Нельзя убрать последнего активного владельца: сначала назначьте другого",
      );

    case "self_deactivate":
      return errorResponse(
        400,
        "self_deactivate",
        "Нельзя деактивировать собственную учётную запись",
      );

    case "invalid_password":
      return errorResponse(400, "invalid_password", failure.message, {
        details: { fields: [{ field: "password", message: failure.message }] },
      });
  }
}
