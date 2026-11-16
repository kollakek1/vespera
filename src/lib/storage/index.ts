/**
 * Выбор драйвера хранилища.
 *
 * - `DATABASE_URL` (или `POSTGRES_URL`, `NEON_DATABASE_URL`) задан → Postgres/Neon.
 * - иначе → файлы в `data/` (локальная разработка, e2e).
 *
 * Отсутствие env не ошибка: приложение просто работает на файлах.
 * Драйверы подгружаются лениво, чтобы `@neondatabase/serverless` не попадал
 * в бандл там, где Postgres не используется.
 */

import type { DocumentName, DocumentMutation, DocumentState, StorageDriver } from "./types";
import { StorageUnavailableError } from "./types";

export type { DocumentName, DocumentMutation, DocumentState, StorageDriver };
export { StorageUnavailableError };

const CONNECTION_ENV_KEYS = ["DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL"] as const;

/** Строка подключения из первого заполненного env. */
export function databaseUrl(): string | null {
  for (const key of CONNECTION_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value && value.length > 0) return value;
  }
  return null;
}

export type StorageKind = "file" | "postgres";

/** Какой драйвер будет использован. Полезно в логах и health-check. */
export function storageKind(): StorageKind {
  return databaseUrl() ? "postgres" : "file";
}

let cache: { url: string | null; driver: StorageDriver } | null = null;

/** Текущий драйвер. Создаётся один раз на процесс и строку подключения. */
export async function getStorage(): Promise<StorageDriver> {
  const url = databaseUrl();
  if (cache && cache.url === url) return cache.driver;

  if (!url) {
    const { fileDriver } = await import("./file-driver");
    cache = { url: null, driver: fileDriver };
    return cache.driver;
  }

  const { createPostgresDriver } = await import("./postgres-driver");
  cache = { url, driver: createPostgresDriver(url) };
  return cache.driver;
}
