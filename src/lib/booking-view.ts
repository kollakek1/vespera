/**
 * Серверные представления броней: подставляют названия услуги и мастера.
 *
 * Источник имён — каталог, а если записи там уже нет (её удалили) — снапшот
 * в самой брони. Поэтому удаление услуги или мастера не ломает историю.
 *
 * Почему отдельный модуль: `booking.ts` и `admin-api.ts` импортируются клиентскими
 * компонентами (форматтеры, `STATUS_LABELS`), а каталог тянет `node:fs`. Держим
 * файловый слой здесь, чтобы браузерный бандл оставался чистым.
 */

import type { AdminBookingView } from "./admin-api";
import {
  toBookingConfirmationView as buildConfirmationView,
  toBookingView as buildPublicView,
  maskPhone,
  type BookingConfirmationView,
  type BookingMasterRef,
  type BookingRecapView,
  type BookingRecord,
  type BookingRefs,
  type BookingServiceRef,
  type BookingView,
} from "./booking";
import { findMaster, findService, getMasters } from "./studio-store";
import { isStorageUnavailable } from "./storage/http";

export interface MasterFilterOption {
  id: string;
  slug: string;
  name: string;
}

/**
 * Каталог может быть недоступен (холодный старт Neon). Для карточки брони это
 * не повод отдавать 500: имя и slug уже лежат в снапшоте самой брони.
 * Остальные ошибки пробрасываем — проглатывать баги нельзя.
 */
async function orUndefined<T>(promise: Promise<T | undefined>): Promise<T | undefined> {
  try {
    return await promise;
  } catch (error) {
    if (isStorageUnavailable(error)) return undefined;
    throw error;
  }
}

/**
 * Услуга и мастер для брони: сначала каталог, затем снапшот.
 * `slug` у снапшота может быть пустым — он не обязателен для отображения.
 */
export async function resolveBookingRefs(booking: BookingRecord): Promise<BookingRefs> {
  const [service, master] = await Promise.all([
    orUndefined(findService(booking.serviceId)),
    orUndefined(findMaster(booking.masterId)),
  ]);

  const serviceRef: BookingServiceRef | null = service
    ? { id: service.id, slug: service.slug, name: service.name }
    : booking.serviceName
      ? { id: booking.serviceId, slug: booking.serviceSlug ?? "", name: booking.serviceName }
      : null;

  const masterRef: BookingMasterRef | null = master
    ? { id: master.id, slug: master.slug, name: master.name, role: master.role }
    : booking.masterName
      ? {
          id: booking.masterId,
          slug: booking.masterSlug ?? "",
          name: booking.masterName,
          role: "",
        }
      : null;

  return { service: serviceRef, master: masterRef };
}

/** Публичная карточка: телефон замаскирован, email и комментарий скрыты. */
export async function toBookingView(booking: BookingRecord): Promise<BookingView> {
  return buildPublicView(booking, await resolveBookingRefs(booking));
}

/** Ответ на создание: клиент только что прислал эти данные. */
export async function toBookingConfirmationView(
  booking: BookingRecord,
): Promise<BookingConfirmationView> {
  return buildConfirmationView(booking, await resolveBookingRefs(booking));
}

/**
 * Ответ на повторную отправку: без имени, email и комментария.
 * Кода и маскированного телефона достаточно, чтобы показать «уже записано».
 */
export async function toBookingRecapView(booking: BookingRecord): Promise<BookingRecapView> {
  const refs = await resolveBookingRefs(booking);
  return {
    code: booking.code,
    status: booking.status,
    date: booking.date,
    time: booking.time,
    durationMin: booking.durationMin,
    priceRub: booking.priceRub,
    phone: maskPhone(booking.phone),
    service: refs.service,
    master: refs.master,
  };
}

/** Админская карточка: телефон целиком, email, комментарий, заметка, история. */
export async function toAdminBookingView(booking: BookingRecord): Promise<AdminBookingView> {
  const base = await toBookingView(booking);
  return {
    ...base,
    phone: booking.phone,
    email: booking.email,
    comment: booking.comment,
    note: booking.note,
    createdBy: booking.createdBy,
    history: booking.history,
  };
}

/** Мастера для выпадающего фильтра админки. */
export async function masterFilterOptions(): Promise<MasterFilterOption[]> {
  const masters = await getMasters();
  return masters.map((master) => ({
    id: master.id,
    slug: master.slug,
    name: master.name,
  }));
}
