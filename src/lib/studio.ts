/**
 * Справочники студии VESPERA.
 *
 * Файл чистый: никаких серверных импортов, его можно тянуть и в клиентские
 * компоненты (формы, карточки услуг). Всё, что относится к расписанию и
 * проверке слотов, живёт в `src/lib/booking.ts`.
 */

/** День недели: 0 — воскресенье, 6 — суббота (как `Date#getDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "Вс",
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
  6: "Сб",
};

export interface StudioService {
  /** Технический ключ, уходит в API как `serviceId`. */
  id: string;
  /** Человекочитаемый ключ для URL и аналитики. */
  slug: string;
  name: string;
  durationMin: number;
  priceRub: number;
  /** Одно предложение для карточки услуги. */
  description: string;
  /** Короткая строка про сам ритуал — для шага подтверждения записи. */
  ritual: string;
}

export interface StudioMaster {
  /** Технический ключ, уходит в API как `masterId`. */
  id: string;
  slug: string;
  name: string;
  role: string;
  years: number;
  serviceIds: readonly string[];
  workingDays: readonly Weekday[];
}

export interface StudioHours {
  timezone: "Europe/Moscow";
  /** Начало приёма, локальное время студии. */
  opensAt: string;
  /** Конец приёма: услуга должна закончиться не позже. */
  closesAt: string;
  /** Шаг сетки слотов в минутах. */
  slotStepMin: number;
  /** Минимальный запас до начала записи (нельзя «через 20 минут»). */
  minLeadMinutes: number;
  /** Насколько вперёд открыта запись. */
  bookingHorizonDays: number;
}

export interface StudioContacts {
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
  addressNote: string;
}

export const TIMEZONE = "Europe/Moscow" as const;

export const STUDIO_HOURS: StudioHours = {
  timezone: TIMEZONE,
  opensAt: "12:00",
  closesAt: "22:00",
  slotStepMin: 30,
  minLeadMinutes: 120,
  bookingHorizonDays: 90,
};

export const STUDIO_CONTACTS: StudioContacts = {
  phone: "+7 495 000-00-00",
  phoneHref: "+74950000000",
  email: "hello@vespera.studio",
  address: "Москва, Столярный переулок, 3",
  addressNote: "вход со двора",
};

export const STUDIO_NAME = "VESPERA";
export const STUDIO_TAGLINE = "Красота после заката";

export const SERVICES: readonly StudioService[] = [
  {
    id: "svc-skin",
    slug: "skin-ritual",
    name: "Ритуал кожи",
    durationMin: 90,
    priceRub: 12_000,
    description:
      "Семь шагов: очищение, ферментный пилинг, массаж лица, маски по слоям. Работаем по протоколу, а не по настроению.",
    ritual: "90 минут без слов и телефона",
  },
  {
    id: "svc-brow",
    slug: "brow-architecture",
    name: "Архитектура взгляда",
    durationMin: 60,
    priceRub: 7_500,
    description:
      "Форма по костной структуре, окрашивание, ламинирование. Линия брови держится шесть недель.",
    ritual: "Форма, а не мода",
  },
  {
    id: "svc-hair",
    slug: "hair-form",
    name: "Стрижка как форма",
    durationMin: 60,
    priceRub: 8_000,
    description:
      "Диагностика, срез по сухому, финальная укладка. Форма, которая собирается за две минуты.",
    ritual: "Срез по сухому",
  },
  {
    id: "svc-makeup",
    slug: "light-and-shadow",
    name: "Свет и тень",
    durationMin: 75,
    priceRub: 9_500,
    description:
      "Макияж на дневном свету, с проверкой в трёх сценариях освещения. Без слоя, который видно.",
    ritual: "Свет, тень и три проверки",
  },
  {
    id: "svc-nails",
    slug: "nail-minimalism",
    name: "Маникюр-минимализм",
    durationMin: 60,
    priceRub: 5_500,
    description:
      "Аппаратная обработка, укрепление, один тон без декора. Аккуратная кромка и никакого декора.",
    ritual: "Один тон, ноль декора",
  },
  {
    id: "svc-massage",
    slug: "face-massage",
    name: "Массаж лица и шеи",
    durationMin: 45,
    priceRub: 6_500,
    description:
      "Лимфодренаж по мышцам шеи и воротниковой зоны. Работает с отёком, а не с «омоложением».",
    ritual: "Тише, глубже, медленнее",
  },
];

export const MASTERS: readonly StudioMaster[] = [
  {
    id: "ms-alisa",
    slug: "alisa-vetrova",
    name: "Алиса Ветрова",
    role: "кожа, протоколы ухода",
    years: 11,
    serviceIds: ["svc-skin", "svc-massage"],
    workingDays: [1, 2, 3, 4, 5],
  },
  {
    id: "ms-marina",
    slug: "marina-dorn",
    name: "Марина Дорн",
    role: "брови, ресницы, ногти",
    years: 8,
    serviceIds: ["svc-brow", "svc-nails"],
    workingDays: [1, 2, 3, 4, 6],
  },
  {
    id: "ms-timur",
    slug: "timur-aslanov",
    name: "Тимур Асланов",
    role: "стрижка, форма",
    years: 14,
    serviceIds: ["svc-hair", "svc-brow"],
    workingDays: [2, 3, 4, 5, 6],
  },
  {
    id: "ms-eva",
    slug: "eva-kim",
    name: "Ева Ким",
    role: "макияж, свет",
    years: 7,
    serviceIds: ["svc-makeup", "svc-nails"],
    workingDays: [0, 3, 4, 5, 6],
  },
];

export interface StudioRitual {
  id: string;
  name: string;
  description: string;
  serviceIds: readonly string[];
}

/** Три флагманских ритуала из брифа — их показывает секция Rituals. */
export const RITUALS: readonly StudioRitual[] = [
  {
    id: "ritual-quiet-hour",
    name: "Тихий час",
    description: "Кожа, протокол из семи шагов, полтора часа без разговоров.",
    serviceIds: ["svc-skin"],
  },
  {
    id: "ritual-light-shadow",
    name: "Свет и тень",
    description: "Макияж, который проверяют в трёх сценариях освещения.",
    serviceIds: ["svc-makeup"],
  },
  {
    id: "ritual-gaze",
    name: "Архитектура взгляда",
    description: "Бровь как конструкция: форма, цвет, шесть недель покоя.",
    serviceIds: ["svc-brow"],
  },
];

/**
 * Услуга по `id` или `slug`, регистр не важен.
 * Возвращает `undefined`, если услуги нет — вызывающий решает, что это 400 или пустые слоты.
 */
export function resolveService(idOrSlug: string | null | undefined): StudioService | undefined {
  const key = (idOrSlug ?? "").trim().toLowerCase();
  if (!key) return undefined;
  return SERVICES.find((service) => service.id === key || service.slug === key);
}

/** Мастер по `id` или `slug`, регистр не важен. */
export function resolveMaster(idOrSlug: string | null | undefined): StudioMaster | undefined {
  const key = (idOrSlug ?? "").trim().toLowerCase();
  if (!key) return undefined;
  return MASTERS.find((master) => master.id === key || master.slug === key);
}

/** Мастера, которые делают услугу (для шага выбора мастера). */
export function mastersForService(serviceId: string): StudioMaster[] {
  return MASTERS.filter((master) => master.serviceIds.includes(serviceId));
}

/** Услуги конкретного мастера. */
export function servicesForMaster(masterId: string): StudioService[] {
  const master = resolveMaster(masterId);
  if (!master) return [];
  return SERVICES.filter((service) => master.serviceIds.includes(service.id));
}

export function isServiceAvailableForMaster(serviceId: string, masterId: string): boolean {
  const master = resolveMaster(masterId);
  return master ? master.serviceIds.includes(serviceId) : false;
}
