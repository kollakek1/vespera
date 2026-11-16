/**
 * Ответы API на недоступное хранилище.
 *
 * Холодный старт Neon, таймаут соединения, обрыв сокета — это не ошибка данных
 * и не баг кода, поэтому клиенту отдаём `503` + `Retry-After`, а не `500`
 * с трейсом. Подробности драйвера остаются в логах.
 *
 * Модуль серверный, но без `node:`-импортов: тянет только типы storage и
 * HTTP-помощники из `booking.ts`, поэтому его можно использовать в любом роуте.
 */

import { errorResponse } from "../booking";
import { StorageUnavailableError } from "./types";

/** Сколько секунд советовать клиенту подождать. */
export const STORAGE_RETRY_AFTER_SEC = 2;

export const STORAGE_UNAVAILABLE_MESSAGE =
  "Сервис временно недоступен. Попробуйте через пару секунд";

/** Ошибка именно нашего слоя хранения (а не бизнес-логики и не SQL). */
export function isStorageUnavailable(error: unknown): error is StorageUnavailableError {
  return error instanceof StorageUnavailableError;
}

/** Готовый `503` без деталей драйвера. */
export function storageUnavailableResponse(): Response {
  return errorResponse(503, "storage_unavailable", STORAGE_UNAVAILABLE_MESSAGE, {
    headers: { "retry-after": String(STORAGE_RETRY_AFTER_SEC) },
    details: { retryAfterSec: STORAGE_RETRY_AFTER_SEC },
  });
}

/**
 * Единая точка обработки ошибок стора в роутах:
 * недоступное хранилище → `503`, всё остальное → `500` с безопасным текстом.
 * Возвращает готовый `Response`, чтобы вызывающий мог сразу его вернуть.
 */
export function storageFailureResponse(
  error: unknown,
  context: string,
  fallbackMessage: string,
): Response {
  if (isStorageUnavailable(error)) {
    console.warn(`${context}: хранилище недоступно — ${error.message}`);
    return storageUnavailableResponse();
  }

  console.error(context, error);
  return errorResponse(500, "server_error", fallbackMessage);
}

/**
 * То же, но как обёртка над промисом:
 * `const service = await storageSafe(findService(id), ctx, "…"); if (service instanceof Response) return service;`
 */
export function storageSafe<T>(
  promise: Promise<T>,
  context: string,
  fallbackMessage: string,
): Promise<T | Response> {
  return promise.catch((error: unknown) => storageFailureResponse(error, context, fallbackMessage));
}
