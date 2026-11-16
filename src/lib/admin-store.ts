/**
 * Администраторы студии: документ `admins` в слое хранения.
 *
 * Один владелец создаётся автоматически из env при первом входе (bootstrap).
 * Дальше `ADMIN_PASSWORD` не используется: пароли живут только в виде scrypt-хэшей.
 *
 * Только сервер. Хэши никогда не покидают этот модуль — наружу отдаётся `PublicAdmin`.
 */

import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

import { getStorage } from "./storage";

/* -------------------------------------------------------------------------- */
/* Константы                                                                  */
/* -------------------------------------------------------------------------- */

export const ADMIN_ROLES = ["owner", "manager"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const DEFAULT_ADMIN_EMAIL = "admin@vespera.studio";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 200;

export const MAX_EMAIL_LENGTH = 120;
export const MAX_NAME_LENGTH = 60;

const DOCUMENT_VERSION = 1;
const DOCUMENT_NAME = "admins" as const;

/** Параметры scrypt. Меняются только вместе с форматом хэша. */
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_SALT_BYTES = 16;
const SCRYPT_KEY_BYTES = 64;
/** 128 * N * r = 16 МБ; запас, чтобы Node не отказал на граничных параметрах. */
const SCRYPT_MAX_MEM = 64 * 1024 * 1024;

const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const ID_LENGTH = 8;

/* -------------------------------------------------------------------------- */
/* Модель                                                                     */
/* -------------------------------------------------------------------------- */

export interface AdminRecord {
  id: string;
  /** Всегда в нижнем регистре. */
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  /** `scrypt$N$r$p$salt$hash`, всё в base64 кроме параметров. */
  passwordHash: string;
  createdAt: string;
  /** id создателя или `null`, если владелец создан bootstrap'ом. */
  createdBy: string | null;
  lastLoginAt: string | null;
}

/** Представление для API и сессии: без хэша и служебных полей. */
export interface PublicAdmin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  createdBy: string | null;
  lastLoginAt: string | null;
}

interface AdminsDocument {
  version: number;
  updatedAt: string;
  admins: AdminRecord[];
}

/* -------------------------------------------------------------------------- */
/* Ошибки и результаты                                                        */
/* -------------------------------------------------------------------------- */

/** Внутренний сигнал: документ есть, но его нельзя использовать. Наружу → 500. */
export class AdminsCorruptError extends Error {
  constructor() {
    super("Документ администраторов повреждён");
    this.name = "AdminsCorruptError";
  }
}

export type AdminReadResult =
  | { ok: true; admins: AdminRecord[] }
  | { ok: false; reason: "corrupt" | "not_configured"; message: string };

export type AdminWriteFailure =
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "email_taken"; email: string }
  | { ok: false; reason: "last_owner" }
  | { ok: false; reason: "self_deactivate" }
  | { ok: false; reason: "invalid_password"; message: string };

export type AdminWriteResult<T> = { ok: true; value: T } | AdminWriteFailure;

/* -------------------------------------------------------------------------- */
/* Пароли                                                                     */
/* -------------------------------------------------------------------------- */

function scryptKey(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEY_BYTES,
      { N: n, r, p, maxmem: SCRYPT_MAX_MEM },
      (error, derived) => {
        if (error) reject(error);
        else resolve(derived);
      },
    );
  });
}

/** `scrypt$16384$8$1$<saltB64>$<hashB64>` */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derived = await scryptKey(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return [
    "scrypt",
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/** Сравнение в постоянном времени. Любая странность формата → `false`, без исключений. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  // Границы, чтобы испорченный хэш не превратился в многоминутный CPU-скрипт.
  if (n < 1024 || n > 1_048_576 || r < 1 || r > 32 || p < 1 || p > 16) return false;

  const salt = Buffer.from(parts[4] ?? "", "base64");
  const expected = Buffer.from(parts[5] ?? "", "base64");
  if (salt.length < 8 || expected.length === 0) return false;

  try {
    const derived = await scryptKey(password, salt, n, r, p);
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function isValidPassword(value: string): boolean {
  return value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH;
}

/* -------------------------------------------------------------------------- */
/* Валидация полей                                                            */
/* -------------------------------------------------------------------------- */

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  if (value.length === 0 || value.length > MAX_EMAIL_LENGTH) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidName(value: string): boolean {
  return value.length >= 2 && value.length <= MAX_NAME_LENGTH;
}

export function isAdminRole(value: unknown): value is AdminRole {
  return value === "owner" || value === "manager";
}

/* -------------------------------------------------------------------------- */
/* Нормализация документа                                                     */
/* -------------------------------------------------------------------------- */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Строгая проверка: одна битая запись делает документ невалидным (fail closed). */
function normalizeAdmin(value: unknown): AdminRecord | null {
  if (!isPlainObject(value)) return null;

  const { id, email, name, role, active, passwordHash, createdAt, createdBy, lastLoginAt } = value;
  if (typeof id !== "string" || id === "") return null;
  if (typeof email !== "string" || email === "") return null;
  if (typeof name !== "string" || name === "") return null;
  if (!isAdminRole(role)) return null;
  if (typeof active !== "boolean") return null;
  if (typeof passwordHash !== "string" || passwordHash === "") return null;
  if (typeof createdAt !== "string" || createdAt === "") return null;

  return {
    id,
    email: email.toLowerCase(),
    name,
    role,
    active,
    passwordHash,
    createdAt,
    createdBy: nullableString(createdBy),
    lastLoginAt: nullableString(lastLoginAt),
  };
}

function normalizeDocument(value: unknown): AdminsDocument | null {
  if (!isPlainObject(value)) return null;
  if (!Array.isArray(value.admins)) return null;

  const admins: AdminRecord[] = [];
  for (const item of value.admins) {
    const record = normalizeAdmin(item);
    if (!record) return null;
    admins.push(record);
  }

  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : "";
  return { version: DOCUMENT_VERSION, updatedAt, admins };
}

function toDocument(admins: readonly AdminRecord[]): AdminsDocument {
  return { version: DOCUMENT_VERSION, updatedAt: new Date().toISOString(), admins: [...admins] };
}

/* -------------------------------------------------------------------------- */
/* Bootstrap                                                                  */
/* -------------------------------------------------------------------------- */

export type BootstrapCredentials =
  | { ok: true; email: string; password: string }
  | { ok: false; message: string };

/** Env нужен только для создания первого владельца. */
export function getBootstrapCredentials(): BootstrapCredentials {
  const password = process.env.ADMIN_PASSWORD?.trim() ?? "";
  const email = normalizeEmail(process.env.ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL);

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `ADMIN_PASSWORD не задан или короче ${MIN_PASSWORD_LENGTH} символов`,
    };
  }
  if (!isValidEmail(email)) {
    return { ok: false, message: "ADMIN_EMAIL не похож на email" };
  }
  return { ok: true, email, password };
}

function generateAdminId(taken: ReadonlySet<string>): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let suffix = "";
    for (let index = 0; index < ID_LENGTH; index += 1) {
      suffix += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
    }
    const id = `adm-${suffix}`;
    if (!taken.has(id)) return id;
  }
  throw new Error("Не удалось сгенерировать id администратора");
}

async function bootstrapOwner(): Promise<AdminReadResult> {
  const credentials = getBootstrapCredentials();
  if (!credentials.ok) {
    return { ok: false, reason: "not_configured", message: credentials.message };
  }

  const passwordHash = await hashPassword(credentials.password);
  const storage = await getStorage();

  return storage.withLockedDocument<AdminsDocument, AdminReadResult>(
    DOCUMENT_NAME,
    async (current) => {
      if (current !== null) {
        const existing = normalizeDocument(current);
        if (!existing) throw new AdminsCorruptError();
        return { next: existing, result: { ok: true, admins: existing.admins } };
      }

      const owner: AdminRecord = {
        id: generateAdminId(new Set()),
        email: credentials.email,
        name: "Владелец",
        role: "owner",
        active: true,
        passwordHash,
        createdAt: new Date().toISOString(),
        createdBy: null,
        lastLoginAt: null,
      };
      const document = toDocument([owner]);
      return { next: document, result: { ok: true, admins: document.admins } };
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Чтение                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Документ администраторов.
 * Нет документа → создаём владельца из env (один раз).
 * Документ испорчен → `corrupt`: панель закрыта, доступ никому не выдаётся.
 */
export async function ensureAdmins(): Promise<AdminReadResult> {
  const storage = await getStorage();
  const state = await storage.readDocument<unknown>(DOCUMENT_NAME);

  if (state.state === "corrupt") {
    return { ok: false, reason: "corrupt", message: "Документ администраторов повреждён" };
  }
  if (state.state === "missing") {
    return bootstrapOwner();
  }

  const document = normalizeDocument(state.value);
  if (!document) {
    return { ok: false, reason: "corrupt", message: "Документ администраторов повреждён" };
  }
  return { ok: true, admins: document.admins };
}

export async function findAdminById(id: string): Promise<AdminRecord | undefined> {
  const result = await ensureAdmins();
  if (!result.ok) return undefined;
  return result.admins.find((admin) => admin.id === id);
}

export async function findAdminByEmail(email: string): Promise<AdminRecord | undefined> {
  const normalized = normalizeEmail(email);
  const result = await ensureAdmins();
  if (!result.ok) return undefined;
  return result.admins.find((admin) => admin.email === normalized);
}

export function toPublicAdmin(admin: AdminRecord): PublicAdmin {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    active: admin.active,
    createdAt: admin.createdAt,
    createdBy: admin.createdBy,
    lastLoginAt: admin.lastLoginAt,
  };
}

/* -------------------------------------------------------------------------- */
/* Мутации                                                                    */
/* -------------------------------------------------------------------------- */

async function mutateAdmins<T>(
  mutator: (admins: AdminRecord[]) => { next?: AdminRecord[]; value: T } | Promise<{ next?: AdminRecord[]; value: T }>,
): Promise<T> {
  const storage = await getStorage();

  return storage.withLockedDocument<AdminsDocument, T>(DOCUMENT_NAME, async (current) => {
    const document = current === null ? null : normalizeDocument(current);
    if (current !== null && !document) throw new AdminsCorruptError();

    // Документа ещё нет (bootstrap не запускался) — стартуем с пустого списка.
    const admins = document ? document.admins : [];
    const outcome = await mutator(admins);

    return {
      next: toDocument(outcome.next ?? admins),
      result: outcome.value,
    };
  });
}

export interface CreateAdminInput {
  email: string;
  name: string;
  role: AdminRole;
  password: string;
  createdBy: string | null;
}

export async function createAdmin(input: CreateAdminInput): Promise<AdminWriteResult<PublicAdmin>> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  return mutateAdmins<AdminWriteResult<PublicAdmin>>((admins) => {
    if (admins.some((admin) => admin.email === email)) {
      return { value: { ok: false, reason: "email_taken", email } };
    }

    const record: AdminRecord = {
      id: generateAdminId(new Set(admins.map((admin) => admin.id))),
      email,
      name: normalizeName(input.name),
      role: input.role,
      active: true,
      passwordHash,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      lastLoginAt: null,
    };

    return { next: [...admins, record], value: { ok: true, value: toPublicAdmin(record) } };
  });
}

export interface UpdateAdminInput {
  name?: string;
  email?: string;
  role?: AdminRole;
  active?: boolean;
}

export async function updateAdmin(
  id: string,
  patch: UpdateAdminInput,
  actorId: string,
): Promise<AdminWriteResult<PublicAdmin>> {
  const email = patch.email === undefined ? undefined : normalizeEmail(patch.email);

  return mutateAdmins<AdminWriteResult<PublicAdmin>>((admins) => {
    const index = admins.findIndex((admin) => admin.id === id);
    const current = admins[index];
    if (index === -1 || !current) return { value: { ok: false, reason: "not_found" } };

    if (email !== undefined && email !== current.email) {
      const taken = admins.some((admin) => admin.id !== id && admin.email === email);
      if (taken) return { value: { ok: false, reason: "email_taken", email } };
    }

    const nextRole = patch.role ?? current.role;
    const nextActive = patch.active ?? current.active;

    if (actorId === id && nextActive === false) {
      return { value: { ok: false, reason: "self_deactivate" } };
    }

    const losesOwner = current.role === "owner" && current.active && (nextRole !== "owner" || !nextActive);
    if (losesOwner) {
      const otherOwners = admins.filter(
        (admin) => admin.id !== id && admin.role === "owner" && admin.active,
      ).length;
      if (otherOwners === 0) return { value: { ok: false, reason: "last_owner" } };
    }

    const updated: AdminRecord = {
      ...current,
      name: patch.name === undefined ? current.name : normalizeName(patch.name),
      email: email ?? current.email,
      role: nextRole,
      active: nextActive,
    };

    const next = [...admins];
    next[index] = updated;
    return { next, value: { ok: true, value: toPublicAdmin(updated) } };
  });
}

export async function deactivateAdmin(
  id: string,
  actorId: string,
): Promise<AdminWriteResult<PublicAdmin>> {
  return updateAdmin(id, { active: false }, actorId);
}

/**
 * Смена пароля.
 * Свой пароль — только со старым; чужой — owner'ом и без старого (проверка роли в роуте).
 */
export async function changeAdminPassword(
  id: string,
  options: { newPassword: string; currentPassword?: string; requireCurrent: boolean },
): Promise<AdminWriteResult<PublicAdmin>> {
  if (!isValidPassword(options.newPassword)) {
    return {
      ok: false,
      reason: "invalid_password",
      message: `Пароль должен быть от ${MIN_PASSWORD_LENGTH} до ${MAX_PASSWORD_LENGTH} символов`,
    };
  }

  const passwordHash = await hashPassword(options.newPassword);

  return mutateAdmins<AdminWriteResult<PublicAdmin>>(async (admins) => {
    const index = admins.findIndex((admin) => admin.id === id);
    const record = admins[index];
    if (index === -1 || !record) return { value: { ok: false, reason: "not_found" } };

    if (options.requireCurrent) {
      const current = options.currentPassword ?? "";
      if (current === "" || !(await verifyPassword(current, record.passwordHash))) {
        return { value: { ok: false, reason: "invalid_password", message: "Текущий пароль неверен" } };
      }
    }

    const updated: AdminRecord = { ...record, passwordHash };
    const next = [...admins];
    next[index] = updated;
    return { next, value: { ok: true, value: toPublicAdmin(updated) } };
  });
}

/** Отметка успешного входа. Не влияет на доступ, поэтому ошибки не критичны. */
export async function touchLastLogin(id: string): Promise<void> {
  await mutateAdmins((admins) => {
    const index = admins.findIndex((admin) => admin.id === id);
    const record = admins[index];
    if (index === -1 || !record) return { value: undefined };

    const next = [...admins];
    next[index] = { ...record, lastLoginAt: new Date().toISOString() };
    return { next, value: undefined };
  });
}
