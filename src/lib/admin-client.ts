/**
 * Клиентские обёртки над админ-API.
 *
 * Никакой бизнес-логики: только типы ответов, единый разбор ошибок и
 * `credentials: "same-origin"`, чтобы HttpOnly-cookie сессии уходила всегда.
 */

import type {
  AdminBookingView,
  BookingSummary,
  CalendarDay,
  CalendarSummary,
  FutureBookingRef,
} from "@/lib/admin-api";
import type { AdminRole } from "@/lib/admin-store";
import type { BookingStatus } from "@/lib/booking";
import type { Weekday } from "@/lib/studio";

export type { AdminBookingView, BookingSummary, CalendarDay, CalendarSummary } from "@/lib/admin-api";
export type { FutureBookingRef } from "@/lib/admin-api";
export type { AdminRole } from "@/lib/admin-store";

/* -------------------------------------------------------------------------- */
/* Каталог студии                                                             */
/* -------------------------------------------------------------------------- */

/** Услуга каталога. Архива нет: удаление окончательное. */
export interface StudioService {
  id: string;
  slug: string;
  name: string;
  durationMin: number;
  priceRub: number;
  description: string;
  ritual: string;
}

/** Мастер каталога. */
export interface StudioMaster {
  id: string;
  slug: string;
  name: string;
  role: string;
  years: number;
  serviceIds: string[];
  workingDays: Weekday[];
}

export interface AdminMasterOption {
  id: string;
  slug: string;
  name: string;
}

export interface CalendarResponse {
  ok: true;
  month: string;
  masterId: string;
  timezone: string;
  days: CalendarDay[];
  summary: CalendarSummary;
  masters: AdminMasterOption[];
}

export interface BookingsResponse {
  ok: true;
  from: string;
  to: string;
  masterId: string;
  status: string;
  timezone: string;
  bookings: AdminBookingView[];
  summary: BookingSummary;
  masters: AdminMasterOption[];
}

/** Текущий администратор в сессии: роль нужна, чтобы скрыть раздел «Администраторы» у менеджера. */
export interface SessionAdmin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface SessionResponse {
  authenticated: boolean;
  admin?: SessionAdmin | null;
}

/* -------------------------------------------------------------------------- */
/* Администраторы                                                             */
/* -------------------------------------------------------------------------- */

export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  createdBy: string | null;
  lastLoginAt: string | null;
}

export interface AdminsResponse {
  ok: true;
  admins: AdminAccount[];
}

export interface AdminResponse {
  ok: true;
  admin: AdminAccount;
}

export interface CreateAdminPayload {
  email: string;
  name: string;
  role: AdminRole;
  password: string;
}

export interface UpdateAdminPayload {
  name?: string;
  email?: string;
  role?: AdminRole;
  active?: boolean;
}

export interface AdminPasswordPayload {
  password: string;
  /** Обязателен, когда владелец меняет собственный пароль. */
  currentPassword?: string;
}

export interface LoginResponse {
  ok: true;
  authenticated: true;
  expiresAt: string;
}

export interface AvailabilitySlot {
  time: string;
  available: boolean;
}

export interface AvailabilityResponse {
  date: string;
  serviceId: string;
  masterId: string;
  durationMin: number | null;
  timezone: string;
  slots: AvailabilitySlot[];
  reason?: string;
}

export interface BookingMutationResponse {
  ok: true;
  booking: AdminBookingView;
}

export interface CreateBookingResponse extends BookingMutationResponse {
  code: string;
}

export interface ManualBookingPayload {
  serviceId: string;
  masterId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email?: string;
  comment?: string;
  note?: string;
  source: "admin";
}

/* -------------------------------------------------------------------------- */
/* Каталог студии                                                             */
/* -------------------------------------------------------------------------- */

export interface StudioRitualRef {
  id: string;
  name: string;
  description: string;
  serviceIds: string[];
}

export interface StudioResponse {
  ok: true;
  services: StudioService[];
  masters: StudioMaster[];
  rituals: StudioRitualRef[];
  updatedAt: string | null;
}

/** Ответ API разбираем защитно: лишние поля (например, `archived` переходного периода) игнорируем. */
interface RawStudioResponse {
  ok: true;
  services: unknown;
  masters: unknown;
  rituals: StudioRitualRef[];
  updatedAt: string | null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readWeekdays(value: unknown): Weekday[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Weekday => typeof item === "number" && Number.isInteger(item) && item >= 0 && item <= 6,
  );
}

function readServices(value: unknown): StudioService[] {
  if (!Array.isArray(value)) return [];
  const services: StudioService[] = [];

  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    if (record.archived === true) continue;

    const id = readString(record.id);
    const slug = readString(record.slug);
    const name = readString(record.name);
    const durationMin = readNumber(record.durationMin);
    const priceRub = readNumber(record.priceRub);
    if (!id || !slug || !name || durationMin === null || priceRub === null) continue;

    services.push({
      id,
      slug,
      name,
      durationMin,
      priceRub,
      description: readString(record.description) ?? "",
      ritual: readString(record.ritual) ?? "",
    });
  }

  return services;
}

function readMasters(value: unknown): StudioMaster[] {
  if (!Array.isArray(value)) return [];
  const masters: StudioMaster[] = [];

  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    if (record.archived === true) continue;

    const id = readString(record.id);
    const slug = readString(record.slug);
    const name = readString(record.name);
    if (!id || !slug || !name) continue;

    masters.push({
      id,
      slug,
      name,
      role: readString(record.role) ?? "",
      years: readNumber(record.years) ?? 0,
      serviceIds: readStringArray(record.serviceIds),
      workingDays: readWeekdays(record.workingDays),
    });
  }

  return masters;
}

export interface ServicePayload {
  name: string;
  slug?: string;
  durationMin: number;
  priceRub: number;
  description?: string;
  ritual?: string;
}

export interface MasterPayload {
  name: string;
  slug?: string;
  role?: string;
  years?: number;
  serviceIds: string[];
  workingDays: Weekday[];
}

export interface ServiceResponse {
  ok: true;
  service: StudioService;
}

export interface MasterResponse {
  ok: true;
  master: StudioMaster;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: readonly ApiFieldError[];
  /** Сырой `details` ответа: у `delete_conflict` там брони или мастера. */
  readonly details: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    fields: readonly ApiFieldError[] = [],
    details?: unknown,
  ) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.details = details;
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof AdminApiError && error.status === 401;
}

/** 403 — нет прав (например, раздел владельца), но сессия жива: не разлогиниваем. */
export function isForbidden(error: unknown): boolean {
  return error instanceof AdminApiError && error.status === 403;
}

export const OWNER_ONLY_MESSAGE = "Раздел доступен только владельцу студии";

/** Текст для тоста: 403 всегда объясняем одинаково, остальное — сообщением сервера. */
export function adminErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError) {
    if (error.status === 403) return OWNER_ONLY_MESSAGE;
    return error.message.length > 0 ? error.message : fallback;
  }
  return fallback;
}

function readFieldErrors(details: unknown): ApiFieldError[] {
  if (typeof details !== "object" || details === null) return [];
  const fields = (details as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return [];

  const result: ApiFieldError[] = [];
  for (const entry of fields) {
    if (typeof entry !== "object" || entry === null) continue;
    const candidate = entry as { field?: unknown; message?: unknown };
    if (typeof candidate.field !== "string" || typeof candidate.message !== "string") continue;
    result.push({ field: candidate.field, message: candidate.message });
  }
  return result;
}

export function readApiError(status: number, body: unknown): AdminApiError {
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    const code = typeof record.error === "string" ? record.error : "unknown";
    const message =
      typeof record.message === "string" && record.message.length > 0
        ? record.message
        : "Не удалось выполнить запрос";
    return new AdminApiError(status, code, message, readFieldErrors(record.details), record.details);
  }
  return new AdminApiError(status, "unknown", "Не удалось выполнить запрос");
}

/** Список будущих броней, которые мешают удалению. */
export type DeleteConflict =
  | { kind: "bookings"; bookings: FutureBookingRef[] }
  | { kind: "masters"; masters: string[] }
  | null;

function parseBookingRefs(value: unknown): FutureBookingRef[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is FutureBookingRef => {
    if (typeof entry !== "object" || entry === null) return false;
    const candidate = entry as Record<string, unknown>;
    return (
      typeof candidate.code === "string" &&
      typeof candidate.date === "string" &&
      typeof candidate.time === "string"
    );
  }).map((entry) => ({ ...entry, name: typeof entry.name === "string" ? entry.name : "" }));
}

function parseMasterNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.length > 0) names.push(entry);
    else if (typeof entry === "object" && entry !== null) {
      const name = (entry as { name?: unknown }).name;
      if (typeof name === "string" && name.length > 0) names.push(name);
    }
  }
  return names;
}

/**
 * `409 delete_conflict`: сервер объясняет, что мешает удалению —
 * будущие брони (`details.bookings`) или мастера, которые ведут услугу (`details.masters`).
 * Принимаем и переходный `archive_conflict` (тот же 409), пока бэкенд мигрирует.
 */
export function readDeleteConflict(error: unknown): DeleteConflict {
  if (!(error instanceof AdminApiError)) return null;
  if (error.status !== 409 && error.code !== "delete_conflict") return null;
  if (typeof error.details !== "object" || error.details === null) return null;

  const details = error.details as Record<string, unknown>;
  const bookings = parseBookingRefs(details.bookings);
  if (bookings.length > 0) return { kind: "bookings", bookings };

  const masters = parseMasterNames(details.masters);
  if (masters.length > 0) return { kind: "masters", masters };

  return null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init.headers },
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw readApiError(response.status, body);
  return body as T;
}

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, value);
  }
  const result = search.toString();
  return result ? `?${result}` : "";
}

export const adminClient = {
  checkSession(): Promise<SessionResponse> {
    return request<SessionResponse>("/api/admin/auth");
  },

  login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>("/api/admin/auth", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  logout(): Promise<SessionResponse> {
    return request<SessionResponse>("/api/admin/auth", { method: "DELETE" });
  },

  calendar(month: string, masterId: string): Promise<CalendarResponse> {
    return request<CalendarResponse>(
      `/api/admin/calendar${query({ month, masterId: masterId === "all" ? undefined : masterId })}`,
    );
  },

  bookings(params: {
    from: string;
    to: string;
    masterId: string;
    status: string;
  }): Promise<BookingsResponse> {
    return request<BookingsResponse>(
      `/api/admin/bookings${query({
        from: params.from,
        to: params.to,
        masterId: params.masterId === "all" ? undefined : params.masterId,
        status: params.status === "all" ? undefined : params.status,
      })}`,
    );
  },

  booking(code: string): Promise<BookingMutationResponse> {
    return request<BookingMutationResponse>(`/api/admin/bookings/${encodeURIComponent(code)}`);
  },

  updateBooking(
    code: string,
    payload: { status: BookingStatus; note?: string | null },
  ): Promise<BookingMutationResponse> {
    return request<BookingMutationResponse>(`/api/admin/bookings/${encodeURIComponent(code)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  createBooking(payload: ManualBookingPayload): Promise<CreateBookingResponse> {
    return request<CreateBookingResponse>("/api/admin/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Публичный эндпоинт: ручная запись использует ту же сетку слотов, что и лендинг. */
  availability(params: {
    serviceId: string;
    masterId: string;
    date: string;
  }): Promise<AvailabilityResponse> {
    return request<AvailabilityResponse>(`/api/booking/availability${query(params)}`);
  },

  /* Каталог услуг и мастеров ------------------------------------------------ */

  studio(): Promise<StudioResponse> {
    return request<RawStudioResponse>("/api/admin/studio").then((response) => ({
      ok: true,
      services: readServices(response.services),
      masters: readMasters(response.masters),
      rituals: Array.isArray(response.rituals) ? response.rituals : [],
      updatedAt: response.updatedAt ?? null,
    }));
  },

  createService(payload: ServicePayload): Promise<ServiceResponse> {
    return request<ServiceResponse>("/api/admin/studio/services", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateService(id: string, payload: Partial<ServicePayload>): Promise<ServiceResponse> {
    return request<ServiceResponse>(`/api/admin/studio/services/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  /** Удаление окончательное: архивных состояний в UI нет. */
  deleteService(id: string): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/api/admin/studio/services/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  createMaster(payload: MasterPayload): Promise<MasterResponse> {
    return request<MasterResponse>("/api/admin/studio/masters", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateMaster(id: string, payload: Partial<MasterPayload>): Promise<MasterResponse> {
    return request<MasterResponse>(`/api/admin/studio/masters/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteMaster(id: string): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/api/admin/studio/masters/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  /* Администраторы (только owner) ------------------------------------------ */

  listAdmins(): Promise<AdminsResponse> {
    return request<AdminsResponse>("/api/admin/admins");
  },

  createAdmin(payload: CreateAdminPayload): Promise<AdminResponse> {
    return request<AdminResponse>("/api/admin/admins", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateAdmin(id: string, payload: UpdateAdminPayload): Promise<AdminResponse> {
    return request<AdminResponse>(`/api/admin/admins/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  /** DELETE в контракте — деактивация: история и брони остаются за сотрудником. */
  deactivateAdmin(id: string): Promise<AdminResponse> {
    return request<AdminResponse>(`/api/admin/admins/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  setAdminPassword(id: string, payload: AdminPasswordPayload): Promise<AdminResponse> {
    return request<AdminResponse>(`/api/admin/admins/${encodeURIComponent(id)}/password`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
