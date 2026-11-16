/**
 * Контракт хранилища документов.
 *
 * Документ — цельный JSON (`bookings`, `studio`, `admins`). Драйвер отвечает
 * только за чтение и за атомарное «прочитать → изменить → записать»;
 * нормализация, валидация и бизнес-правила живут в сторах.
 *
 * Реализации: файлы (`file-driver`, локальная разработка) и Postgres
 * (`postgres-driver`, Vercel/Neon). Выбор — в `storage/index.ts`.
 */

export type DocumentName = "bookings" | "studio" | "admins";

/**
 * Хранилище недоступно: холодный старт Neon, таймаут соединения, обрыв сокета.
 * Это не ошибка данных, поэтому API отвечает `503` + `Retry-After`, а не `500`.
 * Класс живёт в типах (а не в драйвере), чтобы роуты могли его ловить,
 * не подтягивая `@neondatabase/serverless` в бандл.
 */
export class StorageUnavailableError extends Error {
  constructor(message = "Хранилище временно недоступно") {
    super(message);
    this.name = "StorageUnavailableError";
  }
}

export interface DocumentMutation<T, R> {
  /** Документ, который будет записан. */
  next: T;
  /** Значение, которое вернётся вызывающему. */
  result: R;
}

/**
 * Результат чтения с различением «нет документа» и «документ испорчен».
 * Для броней и каталога разница не важна (оба случая → дефолты),
 * а для администраторов важна: испорченный документ нельзя молча заменить
 * новым владельцем — это была бы дыра в доступе.
 */
export type DocumentState<T> =
  | { state: "missing" }
  | { state: "ok"; value: T }
  | { state: "corrupt" };

export interface StorageDriver {
  /** Для диагностики и логов: `file` или `postgres`. */
  readonly kind: "file" | "postgres";

  /** Документ или `null`, если его ещё нет или он нечитаем. */
  getDocument<T>(name: DocumentName): Promise<T | null>;

  /** То же чтение, но с явным статусом: нет / есть / испорчен. */
  readDocument<T>(name: DocumentName): Promise<DocumentState<T>>;

  /**
   * Атомарное чтение-изменение-запись.
   * Пока мутатор работает, другие мутации этого документа ждут:
   * иначе два запроса на один слот могут оба пройти проверку.
   */
  withLockedDocument<T, R>(
    name: DocumentName,
    mutator: (current: T | null) => Promise<DocumentMutation<T, R>>,
  ): Promise<R>;
}
