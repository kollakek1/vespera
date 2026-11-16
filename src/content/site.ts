/**
 * Копирайт и презентационные данные страницы.
 * Справочники (услуги, мастера, часы, контакты) живут в `src/lib/studio.ts`
 * и здесь только дополняются тем, чего в API нет: цены ритуалов, отзывы,
 * сравнение масштабов (секция 05), навигация.
 */

export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: "#manifesto", label: "Манифест" },
  { href: "#services", label: "Услуги" },
  { href: "#rituals", label: "Ритуалы" },
  { href: "#masters", label: "Мастера" },
];

export interface RitualMeta {
  /**
   * Цена ритуала как пакета. Она не обязана равняться сумме услуг:
   * скидка за сборку — нормальная практика студии.
   */
  priceRub: number;
  /**
   * Из каких услуг собирается ритуал. Названия и длительность берём из каталога,
   * чтобы ритуал не обещал «90 мин» там, где практики занимают 135.
   */
  serviceIds: readonly string[];
}

/** Ритуал — сборка из практик, поэтому цена и длина не равны одной услуге. */
export const RITUAL_META: Record<string, RitualMeta> = {
  "ritual-quiet-hour": {
    priceRub: 18_000,
    serviceIds: ["svc-skin", "svc-massage"],
  },
  "ritual-light-shadow": {
    priceRub: 14_000,
    serviceIds: ["svc-makeup", "svc-brow"],
  },
  "ritual-gaze": {
    priceRub: 16_000,
    serviceIds: ["svc-brow", "svc-makeup"],
  },
};

export const HERO = {
  eyebrow: "VESPERA · BEAUTY STUDIO · MOSCOW",
  titleLines: ["КРАСОТА", "ПОСЛЕ", "ЗАКАТА"] as const,
  lead: "Красота после заката — студия вечерних ритуалов. Один мастер, один гость, девяносто минут тишины.",
  ticker: [
    "Ритуал кожи",
    "Архитектура взгляда",
    "Стрижка как форма",
    "Свет и тень",
    "Маникюр-минимализм",
    "Массаж лица и шеи",
  ] as const,
};

export const MANIFESTO = {
  eyebrow: "01 — МАНИФЕСТ",
  statement: "Один мастер. Один гость. Девяносто минут тишины.",
  quote: "Свет к вечеру становится мягче — и лицо тоже.",
  signature: "— ОСНОВАТЕЛЬ, АЛИСА ВЕТРОВА",
  body: "Мы не делаем «всё для всех». Шесть практик, четыре мастера и расписание, в котором между гостями остаётся воздух.",
};

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  service: string;
}

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    id: "t-1",
    quote: "Пришла на ритуал кожи после двух недель дедлайнов. Ушла с ощущением, что мне вернули лицо.",
    author: "Ника Орлова",
    service: "Ритуал кожи",
  },
  {
    id: "t-2",
    quote: "Тимур срезал ровно то, что нужно, и ничего не предложил сверху. В Москве это редкость.",
    author: "Олег Мельник",
    service: "Стрижка как форма",
  },
  {
    id: "t-3",
    quote: "Здесь не разговаривают громко. За полтора часа я успела выдохнуть и перестать проверять телефон.",
    author: "Аня Круглова",
    service: "Тихий час",
  },
  {
    id: "t-4",
    quote: "Бровь держится шестую неделю. Форма моя, а не трендовая — именно об этом я и просила.",
    author: "Мария Лебедева",
    service: "Архитектура взгляда",
  },
  {
    id: "t-5",
    quote: "Макияж проверили в трёх светах, включая лифт и офис. К вечеру ничего не поплыло.",
    author: "Дарья Соколова",
    service: "Свет и тень",
  },
  {
    id: "t-6",
    quote: "Маникюр без декора — то, что я искала три года. Аккуратная кромка и ни одного лишнего слоя.",
    author: "Ирина Пахомова",
    service: "Маникюр-минимализм",
  },
];

export interface CaseStudy {
  id: string;
  index: string;
  title: string;
  meta: string;
  note: string;
  caption: string;
}

/**
 * Не «до/после»: сравниваются два масштаба одного кадра.
 * Поэтому в `meta` — коэффициент увеличения, а не сроки и количество сеансов.
 */
export const CASES: readonly CaseStudy[] = [
  {
    id: "case-skin",
    index: "01",
    title: "Кожа",
    meta: "МАКРО ×2,5 · КАДР",
    note: "Скула · свет сбоку",
    caption: "Один кадр, два масштаба: слева фрагмент крупнее в 2,5 раза.",
  },
  {
    id: "case-makeup",
    index: "02",
    title: "Свет и тень",
    meta: "МАКРО ×2,8 · КАДР",
    note: "Глаз · жёсткий свет",
    caption: "Тот же кадр и тот же свет: меняется только расстояние.",
  },
];

export interface SocialLink {
  href: string;
  label: string;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  { href: "https://t.me/vespera_studio", label: "Telegram" },
  { href: "https://vk.com/vespera_studio", label: "VK" },
];

export const FOOTER_PRINT = "© 2026 VESPERA · МОСКВА";
