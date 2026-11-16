/**
 * Редактируемый каталог студии: услуги и мастера.
 *
 * `src/lib/studio.ts` остаётся источником типов и seed-значений. Данные лежат
 * в слое хранения (`storage/`): файл `data/studio.json` локально или строка
 * `studio` в Postgres на Vercel. Документа нет — работаем на дефолтах,
 * он появится при первой мутации.
 *
 * Удаление физическое. История броней не страдает: перед удалением названия
 * дописываются снапшотами в брони (см. `booking-store.backfillSnapshots`).
 *
 * Только сервер. Клиентские компоненты должны получать данные через
 * серверный рендер или API — импортировать этот модуль в браузерный код нельзя.
 *
 * Гарантии записи обеспечивает драйвер: очередь/транзакция, атомарная замена,
 * `.bak` и откат при битом JSON. Здесь — модель, валидация и кэш на секунду.
 */

import { randomInt } from "node:crypto";

import { z } from "zod";

import {
  MASTERS,
  RITUALS,
  SERVICES,
  type StudioRitual,
  type Weekday,
} from "./studio";
import { getStorage } from "./storage";

/* -------------------------------------------------------------------------- */
/* Типы                                                                       */
/* -------------------------------------------------------------------------- */

/** Услуга каталога. Структурно совместима с `StudioService`. */
export interface StudioServiceRecord {
  id: string;
  slug: string;
  name: string;
  durationMin: number;
  priceRub: number;
  description: string;
  ritual: string;
}

/** Мастер каталога. Структурно совместим с `StudioMaster`. */
export interface StudioMasterRecord {
  id: string;
  slug: string;
  name: string;
  role: string;
  years: number;
  serviceIds: string[];
  workingDays: Weekday[];
}

export interface StudioCatalog {
  services: StudioServiceRecord[];
  masters: StudioMasterRecord[];
  /** `null`, пока каталог не менялся и файла нет. */
  updatedAt: string | null;
}

export type StudioWriteFailureReason =
  | "not_found"
  | "slug_taken"
  | "service_ids_invalid"
  | "masters_without_services";

export type StudioWriteFailure = {
  ok: false;
  reason: StudioWriteFailureReason;
  slug?: string;
  /** id услуг, которых нет в каталоге. */
  invalidIds?: string[];
  /** Мастера, которые остались бы без единой услуги при удалении. */
  masters?: { id: string; name: string }[];
};

export type StudioWriteResult<T> = { ok: true; value: T } | StudioWriteFailure;

/* -------------------------------------------------------------------------- */
/* Константы                                                                  */
/* -------------------------------------------------------------------------- */

const DOCUMENT_VERSION = 1;

/** Каталог не читается из БД чаще, чем раз в секунду: слот не платит за запрос. */
const CACHE_TTL_MS = 1_000;

const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const ID_LENGTH = 8;

/**
 * Идентификаторы генерируются случайно, а не из slug: иначе удалённая и заново
 * созданная услуга с тем же slug получила бы тот же id и «приклеила» старые брони.
 * Старые id (`svc-skin`, `ms-eva`) продолжают работать — они просто строки.
 */
function generateCatalogId(prefix: "svc" | "ms", taken: ReadonlySet<string>): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let suffix = "";
    for (let index = 0; index < ID_LENGTH; index += 1) {
      suffix += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
    }
    const id = `${prefix}-${suffix}`;
    if (!taken.has(id)) return id;
  }
  throw new Error("Не удалось сгенерировать id записи каталога");
}

/* -------------------------------------------------------------------------- */
/* Seed                                                                       */
/* -------------------------------------------------------------------------- */

function seedCatalog(): StudioCatalog {
  return {
    services: SERVICES.map((service) => ({ ...service })),
    masters: MASTERS.map((master) => ({
      ...master,
      serviceIds: [...master.serviceIds],
      workingDays: [...master.workingDays],
    })),
    updatedAt: null,
  };
}

/** Флагманские ритуалы. Пока не редактируются — берутся из seed. */
export function getRituals(): StudioRitual[] {
  return RITUALS.map((ritual) => ({ ...ritual, serviceIds: [...ritual.serviceIds] }));
}

/* -------------------------------------------------------------------------- */
/* Нормализация файла                                                        */
/* -------------------------------------------------------------------------- */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeWeekday(value: unknown): Weekday | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6
    ? (value as Weekday)
    : null;
}

/** Возвращает `null`, если запись нечитаема: одна битая строка не рушит каталог. */
function normalizeService(value: unknown): StudioServiceRecord | null {
  if (!isPlainObject(value)) return null;
  const id = asString(value.id);
  const slug = asString(value.slug);
  const name = asString(value.name);
  const durationMin = asNumber(value.durationMin);
  const priceRub = asNumber(value.priceRub);
  if (!id || !slug || !name || durationMin === null || priceRub === null) return null;

  return {
    id,
    slug,
    name,
    durationMin,
    priceRub,
    description: asString(value.description) ?? "",
    ritual: asString(value.ritual) ?? "",
  };
}

function normalizeMaster(value: unknown): StudioMasterRecord | null {
  if (!isPlainObject(value)) return null;
  const id = asString(value.id);
  const slug = asString(value.slug);
  const name = asString(value.name);
  const years = asNumber(value.years);
  if (!id || !slug || !name || years === null) return null;

  const rawServices = Array.isArray(value.serviceIds) ? value.serviceIds : [];
  const serviceIds = rawServices.filter((item): item is string => typeof item === "string");

  const rawDays = Array.isArray(value.workingDays) ? value.workingDays : [];
  const workingDays: Weekday[] = [];
  for (const item of rawDays) {
    const day = normalizeWeekday(item);
    if (day !== null && !workingDays.includes(day)) workingDays.push(day);
  }

  return {
    id,
    slug,
    name,
    role: asString(value.role) ?? "",
    years,
    serviceIds,
    workingDays,
  };
}

/**
 * Документ → каталог. `null`, пустой объект и мусор → seed-дефолты из `studio.ts`.
 * Одна битая запись не рушит каталог: она просто отбрасывается.
 */
function normalizeCatalogDocument(value: unknown): StudioCatalog {
  if (!isPlainObject(value)) return seedCatalog();

  const servicesRaw = Array.isArray(value.services) ? value.services : null;
  const mastersRaw = Array.isArray(value.masters) ? value.masters : null;
  if (!servicesRaw || !mastersRaw) return seedCatalog();

  const services: StudioServiceRecord[] = [];
  const serviceIds = new Set<string>();
  for (const item of servicesRaw) {
    const record = normalizeService(item);
    if (!record || serviceIds.has(record.id)) continue;
    serviceIds.add(record.id);
    services.push(record);
  }

  const masters: StudioMasterRecord[] = [];
  const masterIds = new Set<string>();
  for (const item of mastersRaw) {
    const record = normalizeMaster(item);
    if (!record || masterIds.has(record.id)) continue;
    masterIds.add(record.id);
    masters.push(record);
  }

  return { services, masters, updatedAt: asString(value.updatedAt) };
}

/* -------------------------------------------------------------------------- */
/* Чтение и кэш                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Кэш живёт секунду. В файловом режиме это экономит чтение на каждый слот,
 * в Postgres-режиме — лишний запрос к базе при серии запросов подряд.
 * Дольше держать нельзя: инстансы на Vercel друг о друге не знают.
 */
let cache: { catalog: StudioCatalog; at: number } | null = null;

function invalidateCache(): void {
  cache = null;
}

/** Текущий каталог (с кэшем на секунду). */
export async function getCatalog(): Promise<StudioCatalog> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.catalog;

  const storage = await getStorage();
  const catalog = normalizeCatalogDocument(await storage.getDocument<unknown>("studio"));
  cache = { catalog, at: Date.now() };
  return catalog;
}

/* -------------------------------------------------------------------------- */
/* Запись                                                                    */
/* -------------------------------------------------------------------------- */

interface StudioDocument {
  version: number;
  updatedAt: string | null;
  services: StudioServiceRecord[];
  masters: StudioMasterRecord[];
}

/**
 * Атомарное «прочитать → изменить → записать» через слой хранения.
 * Драйвер гарантирует, что две одновременные правки каталога не потеряются:
 * файл — очередь в процессе, Postgres — транзакция с advisory lock.
 */
async function mutateCatalog<T>(
  mutator: (
    catalog: StudioCatalog,
  ) => { next?: StudioCatalog; value: T } | Promise<{ next?: StudioCatalog; value: T }>,
): Promise<T> {
  const storage = await getStorage();

  try {
    return await storage.withLockedDocument<StudioDocument, T>("studio", async (current) => {
      const catalog = normalizeCatalogDocument(current);
      const outcome = await mutator(catalog);

      const next: StudioDocument = {
        version: DOCUMENT_VERSION,
        updatedAt: new Date().toISOString(),
        services: outcome.next ? outcome.next.services : catalog.services,
        masters: outcome.next ? outcome.next.masters : catalog.masters,
      };

      return { next, result: outcome.value };
    });
  } finally {
    // Даже при ошибке следующий читатель пойдёт в хранилище, а не в старый кэш.
    invalidateCache();
  }
}

/* -------------------------------------------------------------------------- */
/* Slug                                                                      */
/* -------------------------------------------------------------------------- */

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** «Ритуал кожи» → `ritual-kozhi`. */
export function slugify(value: string): string {
  const transliterated = value
    .toLowerCase()
    .split("")
    .map((char) => TRANSLIT[char] ?? char)
    .join("");

  const slug = transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return slug.length >= 2 ? slug : `item-${slug || "x"}`;
}

function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let attempt = 2; attempt <= 99; attempt += 1) {
    const candidate = `${base}-${attempt}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/* -------------------------------------------------------------------------- */
/* Схемы валидации для API                                                    */
/* -------------------------------------------------------------------------- */

/** «Skin Ritual» → `skin-ritual`: пробелы и лишние дефисы схлопываются до правки. */
function normalizeSlugInput(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const slugSchema = z.preprocess(
  normalizeSlugInput,
  z
    .string()
    .min(2, "slug — минимум 2 символа")
    .max(48, "slug — максимум 48 символов")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug: латиница, цифры и дефис между словами"),
);

const nameSchema = z
  .string({ error: "Укажите название" })
  .trim()
  .min(2, "Название — от 2 символов")
  .max(60, "Название — до 60 символов");

const durationSchema = z.coerce
  .number({ error: "Укажите длительность в минутах" })
  .int("Длительность — целое число минут")
  .min(15, "Минимум 15 минут")
  .max(240, "Максимум 240 минут")
  .refine((value) => value % 15 === 0, "Длительность кратна 15 минутам");

const priceSchema = z.coerce
  .number({ error: "Укажите цену" })
  .int("Цена — целое число рублей")
  .min(0, "Цена не может быть отрицательной")
  .max(200_000, "Цена — не больше 200 000 ₽");

const descriptionSchema = z.string().trim().max(300, "Описание — до 300 символов");
const ritualSchema = z.string().trim().max(80, "Ритуал — до 80 символов");

export const serviceCreateSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  durationMin: durationSchema,
  priceRub: priceSchema,
  description: descriptionSchema.optional(),
  ritual: ritualSchema.optional(),
});

export const servicePatchSchema = z.object({
  name: nameSchema.optional(),
  slug: slugSchema.optional(),
  durationMin: durationSchema.optional(),
  priceRub: priceSchema.optional(),
  description: descriptionSchema.optional(),
  ritual: ritualSchema.optional(),
});

const workingDaysSchema = z
  .array(z.coerce.number().int().min(0).max(6), { error: "workingDays — массив чисел 0–6" })
  .min(1, "Выберите хотя бы один рабочий день")
  .refine((days) => new Set(days).size === days.length, "Дни недели не должны повторяться");

const serviceIdsSchema = z
  .array(z.string().trim().min(1))
  .min(1, "Выберите хотя бы одну услугу");

export const masterCreateSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  role: z.string().trim().max(80, "Специализация — до 80 символов").optional(),
  years: z.coerce
    .number({ error: "Укажите стаж" })
    .int("Стаж — целое число лет")
    .min(0, "Стаж не может быть отрицательным")
    .max(60, "Стаж — не больше 60 лет")
    .optional(),
  serviceIds: serviceIdsSchema,
  workingDays: workingDaysSchema,
});

export const masterPatchSchema = masterCreateSchema.partial();

export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type ServicePatchInput = z.infer<typeof servicePatchSchema>;
export type MasterCreateInput = z.infer<typeof masterCreateSchema>;
export type MasterPatchInput = z.infer<typeof masterPatchSchema>;

/* -------------------------------------------------------------------------- */
/* Чтение: услуги                                                             */
/* -------------------------------------------------------------------------- */

export async function getServices(): Promise<StudioServiceRecord[]> {
  const catalog = await getCatalog();
  return [...catalog.services];
}

export async function getMasters(): Promise<StudioMasterRecord[]> {
  const catalog = await getCatalog();
  return [...catalog.masters];
}

/** Снимок каталога для админки. */
export async function getCatalogForAdmin(): Promise<StudioCatalog> {
  const catalog = await getCatalog();
  return {
    services: [...catalog.services],
    masters: [...catalog.masters],
    updatedAt: catalog.updatedAt,
  };
}

function matchesIdOrSlug(item: { id: string; slug: string }, key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return item.id.toLowerCase() === normalized || item.slug.toLowerCase() === normalized;
}

export async function getServiceById(id: string): Promise<StudioServiceRecord | undefined> {
  const catalog = await getCatalog();
  return catalog.services.find((service) => service.id === id);
}

export async function getServiceBySlug(slug: string): Promise<StudioServiceRecord | undefined> {
  const catalog = await getCatalog();
  return catalog.services.find(
    (service) => service.slug.toLowerCase() === slug.trim().toLowerCase(),
  );
}

/** По `id` или `slug` — так удобнее и API, и роутам. */
export async function findService(
  idOrSlug: string | null | undefined,
): Promise<StudioServiceRecord | undefined> {
  if (!idOrSlug || idOrSlug.trim() === "") return undefined;
  const catalog = await getCatalog();
  return catalog.services.find((service) => matchesIdOrSlug(service, idOrSlug));
}

export async function getMasterById(id: string): Promise<StudioMasterRecord | undefined> {
  const catalog = await getCatalog();
  return catalog.masters.find((master) => master.id === id);
}

export async function getMasterBySlug(slug: string): Promise<StudioMasterRecord | undefined> {
  const catalog = await getCatalog();
  return catalog.masters.find((master) => master.slug.toLowerCase() === slug.trim().toLowerCase());
}

export async function findMaster(
  idOrSlug: string | null | undefined,
): Promise<StudioMasterRecord | undefined> {
  if (!idOrSlug || idOrSlug.trim() === "") return undefined;
  const catalog = await getCatalog();
  return catalog.masters.find((master) => matchesIdOrSlug(master, idOrSlug));
}

export async function mastersForService(serviceId: string): Promise<StudioMasterRecord[]> {
  const masters = await getMasters();
  return masters.filter((master) => master.serviceIds.includes(serviceId));
}

export async function isServiceAvailableForMaster(
  serviceId: string,
  masterId: string,
): Promise<boolean> {
  const master = await findMaster(masterId);
  return master ? master.serviceIds.includes(serviceId) : false;
}

/* -------------------------------------------------------------------------- */
/* Мутации: услуги                                                            */
/* -------------------------------------------------------------------------- */

function ensureUniqueSlug(
  requested: string | undefined,
  name: string,
  taken: ReadonlySet<string>,
): string {
  const base = requested ?? slugify(name);
  return uniqueSlug(base, taken);
}

export async function createService(
  input: ServiceCreateInput,
): Promise<StudioWriteResult<StudioServiceRecord>> {
  return mutateCatalog<StudioWriteResult<StudioServiceRecord>>((catalog) => {
    const taken = new Set(catalog.services.map((service) => service.slug));
    if (input.slug && taken.has(input.slug)) {
      return { value: { ok: false, reason: "slug_taken", slug: input.slug } };
    }

    const slug = ensureUniqueSlug(input.slug, input.name, taken);
    const takenIds = new Set(catalog.services.map((service) => service.id));
    const record: StudioServiceRecord = {
      id: generateCatalogId("svc", takenIds),
      slug,
      name: input.name,
      durationMin: input.durationMin,
      priceRub: input.priceRub,
      description: input.description ?? "",
      ritual: input.ritual ?? "",
    };

    return {
      next: { ...catalog, services: [...catalog.services, record] },
      value: { ok: true, value: record },
    };
  });
}

export async function updateService(
  idOrSlug: string,
  patch: ServicePatchInput,
): Promise<StudioWriteResult<StudioServiceRecord>> {
  return mutateCatalog<StudioWriteResult<StudioServiceRecord>>((catalog) => {
    const index = catalog.services.findIndex((service) => matchesIdOrSlug(service, idOrSlug));
    const current = catalog.services[index];
    if (index === -1 || !current) {
      return { value: { ok: false, reason: "not_found" } };
    }

    if (patch.slug && patch.slug !== current.slug) {
      const taken = new Set(
        catalog.services.filter((service) => service.id !== current.id).map((service) => service.slug),
      );
      if (taken.has(patch.slug)) {
        return { value: { ok: false, reason: "slug_taken", slug: patch.slug } };
      }
    }

    const updated: StudioServiceRecord = {
      ...current,
      name: patch.name ?? current.name,
      slug: patch.slug ?? current.slug,
      durationMin: patch.durationMin ?? current.durationMin,
      priceRub: patch.priceRub ?? current.priceRub,
      description: patch.description ?? current.description,
      ritual: patch.ritual ?? current.ritual,
    };

    const nextServices = [...catalog.services];
    nextServices[index] = updated;
    return {
      next: { ...catalog, services: nextServices },
      value: { ok: true, value: updated },
    };
  });
}

/**
 * Удаляет услугу из каталога и вычищает её id у всех мастеров.
 *
 * Если после удаления у мастера не осталось ни одной услуги — запись не удаляем:
 * возвращаем `masters_without_services` со списком мастеров. Иначе мастер стал бы
 * «мёртвым»: его нельзя выбрать ни на одну услугу, и админ не понял бы почему.
 */
export async function deleteService(
  idOrSlug: string,
): Promise<StudioWriteResult<StudioServiceRecord>> {
  return mutateCatalog<StudioWriteResult<StudioServiceRecord>>((catalog) => {
    const index = catalog.services.findIndex((service) => matchesIdOrSlug(service, idOrSlug));
    const current = catalog.services[index];
    if (index === -1 || !current) return { value: { ok: false, reason: "not_found" } };

    const orphaned = catalog.masters.filter(
      (master) =>
        master.serviceIds.includes(current.id) &&
        master.serviceIds.filter((id) => id !== current.id).length === 0,
    );
    if (orphaned.length > 0) {
      return {
        value: {
          ok: false,
          reason: "masters_without_services",
          masters: orphaned.map((master) => ({ id: master.id, name: master.name })),
        },
      };
    }

    const nextServices = catalog.services.filter((service) => service.id !== current.id);
    const nextMasters = catalog.masters.map((master) =>
      master.serviceIds.includes(current.id)
        ? { ...master, serviceIds: master.serviceIds.filter((id) => id !== current.id) }
        : master,
    );

    return {
      next: { ...catalog, services: nextServices, masters: nextMasters },
      value: { ok: true, value: current },
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Мутации: мастера                                                           */
/* -------------------------------------------------------------------------- */

/** Проверяет `serviceIds` мастера: все услуги должны существовать в каталоге. */
function validateServiceIds(
  catalog: StudioCatalog,
  ids: readonly string[],
): { invalidIds: string[] } {
  const known = new Set(catalog.services.map((service) => service.id));
  const invalidIds: string[] = [];

  for (const id of ids) {
    if (!known.has(id)) invalidIds.push(id);
  }

  return { invalidIds };
}

export async function createMaster(
  input: MasterCreateInput,
): Promise<StudioWriteResult<StudioMasterRecord>> {
  return mutateCatalog<StudioWriteResult<StudioMasterRecord>>((catalog) => {
    const taken = new Set(catalog.masters.map((master) => master.slug));
    if (input.slug && taken.has(input.slug)) {
      return { value: { ok: false, reason: "slug_taken", slug: input.slug } };
    }

    const check = validateServiceIds(catalog, input.serviceIds);
    if (check.invalidIds.length > 0) {
      return { value: { ok: false, reason: "service_ids_invalid", ...check } };
    }

    const slug = ensureUniqueSlug(input.slug, input.name, taken);
    const takenIds = new Set(catalog.masters.map((master) => master.id));
    const record: StudioMasterRecord = {
      id: generateCatalogId("ms", takenIds),
      slug,
      name: input.name,
      role: input.role ?? "",
      years: input.years ?? 0,
      serviceIds: [...input.serviceIds],
      workingDays: [...input.workingDays] as Weekday[],
    };

    return {
      next: { ...catalog, masters: [...catalog.masters, record] },
      value: { ok: true, value: record },
    };
  });
}

export async function updateMaster(
  idOrSlug: string,
  patch: MasterPatchInput,
): Promise<StudioWriteResult<StudioMasterRecord>> {
  return mutateCatalog<StudioWriteResult<StudioMasterRecord>>((catalog) => {
    const index = catalog.masters.findIndex((master) => matchesIdOrSlug(master, idOrSlug));
    const current = catalog.masters[index];
    if (index === -1 || !current) return { value: { ok: false, reason: "not_found" } };

    if (patch.slug && patch.slug !== current.slug) {
      const taken = new Set(
        catalog.masters.filter((master) => master.id !== current.id).map((master) => master.slug),
      );
      if (taken.has(patch.slug)) {
        return { value: { ok: false, reason: "slug_taken", slug: patch.slug } };
      }
    }

    let serviceIds = current.serviceIds;
    if (patch.serviceIds) {
      const check = validateServiceIds(catalog, patch.serviceIds);
      if (check.invalidIds.length > 0) {
        return { value: { ok: false, reason: "service_ids_invalid", ...check } };
      }
      serviceIds = [...patch.serviceIds];
    }

    const updated: StudioMasterRecord = {
      ...current,
      name: patch.name ?? current.name,
      slug: patch.slug ?? current.slug,
      role: patch.role ?? current.role,
      years: patch.years ?? current.years,
      serviceIds,
      workingDays: patch.workingDays ? ([...patch.workingDays] as Weekday[]) : current.workingDays,
    };

    const nextMasters = [...catalog.masters];
    nextMasters[index] = updated;
    return {
      next: { ...catalog, masters: nextMasters },
      value: { ok: true, value: updated },
    };
  });
}

/** Удаляет мастера из каталога. История броней держится на снапшотах. */
export async function deleteMaster(
  idOrSlug: string,
): Promise<StudioWriteResult<StudioMasterRecord>> {
  return mutateCatalog<StudioWriteResult<StudioMasterRecord>>((catalog) => {
    const index = catalog.masters.findIndex((master) => matchesIdOrSlug(master, idOrSlug));
    const current = catalog.masters[index];
    if (index === -1 || !current) return { value: { ok: false, reason: "not_found" } };

    return {
      next: {
        ...catalog,
        masters: catalog.masters.filter((master) => master.id !== current.id),
      },
      value: { ok: true, value: current },
    };
  });
}
