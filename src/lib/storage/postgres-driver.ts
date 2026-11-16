/**
 * Postgres-драйвер (Neon) для продакшена: на Vercel файловая система только для
 * чтения, документы живут в таблице `vespera_documents`.
 *
 * Почему транзакция, а не один `UPDATE`:
 * мутация — это `read → JS → write`, поэтому нужен настоящий лок на документ.
 * `pg_advisory_xact_lock(hashtext(name))` берётся первым и держится до COMMIT:
 * он сериализует и чтение, и вставку, в том числе когда строки ещё нет
 * (`SELECT ... FOR UPDATE` пустую строку не блокирует, поэтому его одного мало).
 * Лок снимается автоматически при COMMIT/ROLLBACK, «зависнуть» на нём нельзя.
 *
 * Холодный старт: compute Neon просыпается секунды, и первый коннект может
 * оборваться по таймауту. Поэтому все операции идут через `retryWithDeadline`:
 * до трёх попыток с паузами 250/750/1500 мс (+jitter), только для сетевых ошибок.
 * Общий бюджет одной операции — 25 секунд, дальше `StorageUnavailableError` (503).
 * Транзакция повторяется только после явного ROLLBACK и никогда — после отправки COMMIT.
 *
 * `@neondatabase/serverless` использует WebSocket; в Node 20+ `WebSocket` глобальный,
 * поэтому дополнительный `ws` не нужен.
 */

import { Pool, type PoolClient } from "@neondatabase/serverless";

import {
  StorageUnavailableError,
  type DocumentMutation,
  type DocumentName,
  type DocumentState,
  type StorageDriver,
} from "./types";

const TABLE = "vespera_documents";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${TABLE} (
    name text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`;

/**
 * Числовое значение из env с границами.
 * Нужно, чтобы прод можно было подкрутить без правки кода, но нельзя было
 * выставить бесконечное ожидание.
 */
function envMs(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Сколько ждём установления соединения (холодный compute бывает медленным). */
const CONNECT_TIMEOUT_MS = envMs("STORAGE_CONNECT_TIMEOUT_MS", 20_000, 1_000, 25_000);

/** Бюджет одной операции стора: коннект + все повторы. */
const OPERATION_BUDGET_MS = envMs("STORAGE_OPERATION_BUDGET_MS", 25_000, 5_000, 25_000);

/** Паузы между попытками; длина массива + 1 = число попыток. */
const RETRY_DELAYS_MS = [250, 750, 1500];

/** Сколько отводим на ROLLBACK в аварийном пути. */
const ROLLBACK_TIMEOUT_MS = 2_000;

/**
 * Коды, которые означают «соединение не установлено / оборвалось».
 * SQL-ошибки (классы 22, 23, 42) сюда не входят и не повторяются.
 */
const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now — сервер ещё поднимается
]);

type Row = Record<string, unknown>;

function errorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) return "";
  const message = (error as { message?: unknown }).message;
  if (typeof message === "string" && message.length > 0) return message;
  // ErrorEvent (WebSocket) прячет исходную ошибку в `.error`.
  const inner = (error as { error?: { message?: unknown } }).error;
  return inner && typeof inner.message === "string" ? inner.message : "";
}

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/**
 * `ErrorEvent` — так WebSocket сообщает, что не смог открыть соединение
 * (в частности, когда Neon не отвечает на холодном старте). Это всегда сеть.
 */
function isWebSocketError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = (error as { constructor?: { name?: string } }).constructor?.name;
  return name === "ErrorEvent";
}

/**
 * Похоже ли на проблему соединения (а не на ошибку запроса).
 * Повторяем только такие: синтаксис и нарушение ограничений должны доходить сразу.
 */
function isConnectionError(error: unknown): boolean {
  if (error instanceof StorageUnavailableError) return false;
  if (isWebSocketError(error)) return true;

  const code = errorCode(error);
  if (code && RETRYABLE_CODES.has(code)) return true;

  const message = errorMessage(error).toLowerCase();
  if (message.length === 0) return false;
  return (
    message.includes("connection terminated") ||
    message.includes("connection timeout") ||
    message.includes("timeout exceeded when trying to connect") ||
    message.includes("connection closed") ||
    message.includes("server closed the connection") ||
    message.includes("socket hang up") ||
    message.includes("websocket") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("etimedout")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Отклоняет промис, если бюджет операции вышел. */
function withDeadline<T>(promise: Promise<T>, deadline: number, label: string): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    promise.catch(() => undefined);
    return Promise.reject(new StorageUnavailableError(`${label}: время ожидания истекло`));
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new StorageUnavailableError(`${label}: время ожидания истекло`));
    }, remaining);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function createPostgresDriver(connectionString: string): StorageDriver {
  const pool = new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  });

  /**
   * Один коннект с уважением к бюджету.
   * Если пул отдаст соединение уже после нашего таймаута — сразу вернём его назад.
   */
  async function connectClient(deadline: number): Promise<PoolClient> {
    let expired = false;
    const pending = pool.connect();
    pending.then(
      (client) => {
        if (expired) client.release();
      },
      () => undefined,
    );

    try {
      return await withDeadline(pending, deadline, "connect");
    } catch (error) {
      expired = true;
      throw error;
    }
  }

  /** Запрос с таймаутом по общему бюджету операции. */
  async function runQuery<RowType extends Row = Row>(
    client: PoolClient,
    text: string,
    params: unknown[],
    deadline: number,
  ): Promise<RowType[]> {
    const result = await withDeadline(client.query<RowType>(text, params), deadline, "query");
    return result.rows;
  }

  /**
   * Работа с одним коннектом.
   * `broken` уничтожает соединение в пуле, если оно оборвалось: возвращать
   * в пул полумёртвый сокет нельзя.
   */
  async function withClient<T>(
    deadline: number,
    operation: (client: PoolClient, deadline: number) => Promise<T>,
  ): Promise<T> {
    const client = await connectClient(deadline);
    let broken = false;
    try {
      return await operation(client, deadline);
    } catch (error) {
      // Сокет после таймаута тоже не возвращаем в пул: его состояние неизвестно.
      broken = isConnectionError(error) || error instanceof StorageUnavailableError;
      throw error;
    } finally {
      client.release(broken);
    }
  }

  /**
   * Повтор операции, пока не выйдет бюджет и не кончились попытки.
   * `StorageUnavailableError` (истёк таймаут внутри операции) не повторяем —
   * времени на ещё одну попытку уже нет.
   */
  async function retryWithDeadline<T>(
    label: string,
    deadline: number,
    operation: (deadline: number) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      if (Date.now() >= deadline) break;

      try {
        return await operation(deadline);
      } catch (error) {
        if (error instanceof StorageUnavailableError) {
          break;
        }
        if (!isConnectionError(error)) throw error;

        if (attempt === RETRY_DELAYS_MS.length) break;

        const delay = RETRY_DELAYS_MS[attempt] + Math.floor(Math.random() * 100);
        if (Date.now() + delay >= deadline) break;
        console.warn(
          `[storage:postgres] ${label}: попытка ${attempt + 1} не удалась (${errorMessage(error) || "сеть"}), повтор через ${delay} мс`,
        );
        await sleep(delay);
      }
    }

    throw new StorageUnavailableError(`${label}: хранилище недоступно`);
  }

  /**
   * Инициализация и прогрев — один промис на процесс.
   * `SELECT 1` подтверждает, что сокет действительно живой, а не только
   * что пул выдал объект клиента.
   */
  let ready: Promise<void> | null = null;
  function ensureReady(deadline: number): Promise<void> {
    ready ??= (async () => {
      await retryWithDeadline("ensure-schema", deadline, (dl) =>
        withClient(dl, async (client, inner) => {
          await runQuery(client, CREATE_TABLE_SQL, [], inner);
        }),
      );
      await retryWithDeadline("health-check", deadline, (dl) =>
        withClient(dl, async (client, inner) => {
          await runQuery(client, "SELECT 1", [], inner);
        }),
      );
    })().catch((error: unknown) => {
      ready = null;
      throw error;
    });
    return ready;
  }

  function operationDeadline(): number {
    return Date.now() + OPERATION_BUDGET_MS;
  }

  return {
    kind: "postgres",

    async getDocument<T>(name: DocumentName): Promise<T | null> {
      const deadline = operationDeadline();
      await ensureReady(deadline);

      return retryWithDeadline("get-document", deadline, (dl) =>
        withClient(dl, async (client, inner) => {
          const rows = await runQuery(client, `SELECT data FROM ${TABLE} WHERE name = $1`, [name], inner);
          const value = rows[0]?.data;
          return value === undefined || value === null ? null : (value as T);
        }),
      );
    },

    async readDocument<T>(name: DocumentName): Promise<DocumentState<T>> {
      const deadline = operationDeadline();
      await ensureReady(deadline);

      return retryWithDeadline("read-document", deadline, (dl) =>
        withClient(dl, async (client, inner) => {
          const rows = await runQuery(client, `SELECT data FROM ${TABLE} WHERE name = $1`, [name], inner);
          const value = rows[0]?.data;
          if (value === undefined) return { state: "missing" } as DocumentState<T>;
          // jsonb в базе всегда валиден синтаксически; смысловую проверку делает стор.
          return { state: "ok", value: value as T } as DocumentState<T>;
        }),
      );
    },

    async withLockedDocument<T, R>(
      name: DocumentName,
      mutator: (current: T | null) => Promise<DocumentMutation<T, R>>,
    ): Promise<R> {
      const deadline = operationDeadline();
      await ensureReady(deadline);

      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        if (Date.now() >= deadline) break;

        let client: PoolClient | null = null;
        let transactionOpen = false;
        let commitSent = false;
        let broken = false;

        try {
          // Повторять можно только до этой точки: коннект ещё не начал транзакцию.
          client = await connectClient(deadline);

          await runQuery(client, "BEGIN", [], deadline);
          transactionOpen = true;
          await runQuery(client, "SELECT pg_advisory_xact_lock(hashtext($1))", [name], deadline);

          const rows = await runQuery(client, `SELECT data FROM ${TABLE} WHERE name = $1`, [name], deadline);
          const stored = rows[0]?.data;
          const current = stored === undefined || stored === null ? null : (stored as T);

          const { next, result } = await mutator(current);

          await runQuery(
            client,
            `INSERT INTO ${TABLE} (name, data, updated_at)
             VALUES ($1, $2::jsonb, now())
             ON CONFLICT (name) DO UPDATE
               SET data = EXCLUDED.data, updated_at = now()`,
            [name, JSON.stringify(next)],
            deadline,
          );

          // После отправки COMMIT повторять нельзя: неизвестно, применилось ли.
          commitSent = true;
          await runQuery(client, "COMMIT", [], deadline);
          transactionOpen = false;
          return result;
        } catch (error) {
          broken = isConnectionError(error) || error instanceof StorageUnavailableError;

          // Транзакция могла остаться открытой — откатываем явно, прежде чем решать.
          if (client && transactionOpen) {
            await withDeadline(
              client.query("ROLLBACK"),
              Date.now() + ROLLBACK_TIMEOUT_MS,
              "rollback",
            ).catch(() => undefined);
            transactionOpen = false;
          }

          if (commitSent) {
            // COMMIT отправлен: результат неизвестен, повтор создал бы дубль.
            console.error(`[storage:postgres] ${name}: COMMIT без подтверждения`, error);
            if (isConnectionError(error)) {
              throw new StorageUnavailableError(`${name}: результат записи неизвестен`);
            }
            throw error;
          }

          if (error instanceof StorageUnavailableError) {
            break;
          }
          if (!isConnectionError(error)) throw error;

          if (attempt === RETRY_DELAYS_MS.length) break;

          const delay = RETRY_DELAYS_MS[attempt] + Math.floor(Math.random() * 100);
          if (Date.now() + delay >= deadline) break;
          console.warn(
            `[storage:postgres] ${name}: попытка ${attempt + 1} не удалась (${errorMessage(error) || "сеть"}), повтор через ${delay} мс`,
          );
          await sleep(delay);
        } finally {
          client?.release(broken);
        }
      }

      throw new StorageUnavailableError(`${name}: хранилище недоступно`);
    },
  };
}
