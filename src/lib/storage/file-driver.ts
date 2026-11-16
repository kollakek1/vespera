/**
 * Файловый драйвер: `data/<name>.json` рядом с проектом.
 *
 * Поведение прежних `booking-store`/`studio-store`, вынесенное в общий слой:
 * - in-process очередь на документ — две мутации не переплетаются;
 * - запись атомарная: временный файл + `rename`;
 * - перед перезаписью предыдущая валидная версия уходит в `.bak`;
 * - битый основной файл читается из `.bak`, битые оба — `null` (вызывающий
 *   подставит дефолты; сайт не падает).
 *
 * Только сервер: `node:fs`.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { DocumentMutation, DocumentName, DocumentState, StorageDriver } from "./types";

const FILE_EXTENSION = ".json";
const BACKUP_SUFFIX = ".bak";

/** Каталог данных: `VESPERA_DATA_DIR` (для тестов/e2e) или `<cwd>/data`. */
export function dataDirectory(): string {
  const override = process.env.VESPERA_DATA_DIR?.trim();
  return override && override.length > 0 ? override : join(process.cwd(), "data");
}

/** Абсолютный путь к документу. Полезно в логах и тестах. */
export function documentFilePath(name: DocumentName): string {
  return join(dataDirectory(), `${name}${FILE_EXTENSION}`);
}

async function readRaw(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch {
    // Нет файла или нет прав — для нас это «данных нет».
    return null;
  }
}

function parseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeFileAtomic(file: string, contents: string): Promise<void> {
  const temp = `${file}.${process.pid}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await writeFile(temp, contents, "utf8");
  await rename(temp, file);
}

class FileStorageDriver implements StorageDriver {
  readonly kind = "file" as const;

  /** Очередь на каждый документ: разные документы друг друга не блокируют. */
  private readonly queues = new Map<DocumentName, Promise<unknown>>();

  private runExclusive<T>(name: DocumentName, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(name) ?? Promise.resolve();
    const started = previous.then(task, task);
    this.queues.set(
      name,
      started.then(
        () => undefined,
        () => undefined,
      ),
    );
    return started;
  }

  async getDocument<T>(name: DocumentName): Promise<T | null> {
    const file = documentFilePath(name);

    const raw = await readRaw(file);
    if (raw !== null) {
      const parsed = parseJson(raw);
      if (parsed !== null) return parsed as T;
      console.warn(`[storage:file] ${file} повреждён, пробую ${BACKUP_SUFFIX}`);
    }

    const backupRaw = await readRaw(`${file}${BACKUP_SUFFIX}`);
    if (backupRaw !== null) {
      const backup = parseJson(backupRaw);
      if (backup !== null) {
        if (raw !== null) {
          console.warn(`[storage:file] ${file}: данные восстановлены из ${BACKUP_SUFFIX}`);
        }
        return backup as T;
      }
    }

    return null;
  }

  /**
   * Отличает «файла нет» от «файл есть, но испорчен».
   * Испорченным считается документ, если существовал хотя бы один из файлов
   * (основной или `.bak`), но ни один не разобрался.
   */
  async readDocument<T>(name: DocumentName): Promise<DocumentState<T>> {
    const file = documentFilePath(name);
    let corrupted = false;

    const raw = await readRaw(file);
    if (raw !== null) {
      const parsed = parseJson(raw);
      if (parsed !== null) return { state: "ok", value: parsed as T };
      corrupted = true;
      console.warn(`[storage:file] ${file} повреждён, пробую ${BACKUP_SUFFIX}`);
    }

    const backupRaw = await readRaw(`${file}${BACKUP_SUFFIX}`);
    if (backupRaw !== null) {
      const backup = parseJson(backupRaw);
      if (backup !== null) {
        if (corrupted) {
          console.warn(`[storage:file] ${file}: данные восстановлены из ${BACKUP_SUFFIX}`);
        }
        return { state: "ok", value: backup as T };
      }
      corrupted = true;
    }

    return corrupted ? { state: "corrupt" } : { state: "missing" };
  }

  async withLockedDocument<T, R>(
    name: DocumentName,
    mutator: (current: T | null) => Promise<DocumentMutation<T, R>>,
  ): Promise<R> {
    return this.runExclusive(name, async () => {
      const current = await this.getDocument<T>(name);
      const { next, result } = await mutator(current);
      await this.persist(name, next);
      return result;
    });
  }

  private async persist(name: DocumentName, value: unknown): Promise<void> {
    const file = documentFilePath(name);
    await mkdir(dirname(file), { recursive: true });

    const previous = await readRaw(file);
    if (previous !== null && parseJson(previous) !== null) {
      try {
        await writeFile(`${file}${BACKUP_SUFFIX}`, previous, "utf8");
      } catch {
        // Бэкап — страховка, а не инвариант: не мешаем основной записи.
      }
    }

    await writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
  }
}

export const fileDriver: StorageDriver = new FileStorageDriver();
