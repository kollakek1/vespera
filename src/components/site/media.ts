/**
 * Кураторская фотография секций «Услуги», «Мастера» и «Масштаб» (бывш. «До и после»).
 *
 * Все кадры локальные (`public/images/...`), приведены к одному дуотону
 * (тени — `ink`, света — тёплая `sand`/`milk`) и кропу под сетку.
 * Справочники в админке редактируются, поэтому связь — по `id`, а не по порядку:
 * если практику переименовали или добавили новую, она просто останется
 * с CSS-артефактом (`plate-pearl` / `plate-figure`) — без битой картинки.
 *
 * «До/после» не подделываем: в секции сравниваются два масштаба ОДНОГО кадра —
 * фрагмент и кадр целиком. Обе картинки — кропы одного исходника, поэтому
 * свет, ракурс и ретушь совпадают физически, а не на словах.
 *
 * Источники и права — `docs/image-sources.md`.
 */

export interface Media {
  /** Путь от `public`: `/images/...` */
  src: string;
  /** Что видно на кадре — дополняется названием услуги/мастера в компоненте. */
  alt: string;
  width: number;
  height: number;
  /** `object-position`: подбирается под кроп, чтобы не резать лицо и объект. */
  position: string;
}

const SERVICE_MEDIA: Record<string, Media> = {
  "svc-skin": {
    src: "/images/services/skin-ritual.webp",
    alt: "крупный план кожи с каплей сыворотки на скуле в тёплом свете",
    width: 1200,
    height: 900,
    position: "50% 45%",
  },
  "svc-brow": {
    src: "/images/services/brow-architecture.webp",
    alt: "кисточка расчёсывает бровь, видна линия роста волосков",
    width: 1000,
    height: 750,
    position: "55% 45%",
  },
  "svc-hair": {
    src: "/images/services/hair-form.webp",
    alt: "гребень проходит сквозь тёмные волосы, видна линия среза",
    width: 1200,
    height: 900,
    position: "50% 40%",
  },
  "svc-makeup": {
    src: "/images/services/makeup-light-shadow.webp",
    alt: "глаз с растушёванной тенью и ресницами в контровом свете",
    width: 1200,
    height: 900,
    position: "45% 50%",
  },
  "svc-nails": {
    src: "/images/services/nails-minimal.webp",
    alt: "кисти рук с короткими ногтями без декора на тёмном фоне",
    width: 1200,
    height: 900,
    position: "50% 50%",
  },
  "svc-massage": {
    src: "/images/services/face-massage.webp",
    alt: "руки мастера лежат на лице гостьи, глаза закрыты",
    width: 1200,
    height: 900,
    position: "55% 45%",
  },
};

const MASTER_MEDIA: Record<string, Media> = {
  "ms-alisa": {
    src: "/images/masters/alisa-vetrova.webp",
    alt: "портрет в тёмной водолазке, свет падает диагональю",
    width: 900,
    height: 1200,
    position: "50% 32%",
  },
  "ms-marina": {
    src: "/images/masters/marina-dorn.webp",
    alt: "портрет в профиль, мягкий свет на скуле",
    width: 900,
    height: 1200,
    position: "50% 32%",
  },
  "ms-timur": {
    src: "/images/masters/timur-aslanov.webp",
    alt: "портрет в тени, свет только на половине лица",
    width: 900,
    height: 1200,
    position: "50% 30%",
  },
  "ms-eva": {
    src: "/images/masters/eva-kim.webp",
    alt: "портрет с длинными волосами, свет сбоку",
    width: 900,
    height: 1200,
    position: "50% 30%",
  },
};

/**
 * Пара для слайдера «Масштаб»: `macro` — фрагмент, `frame` — тот же кадр целиком.
 * `zoom` — честный коэффициент увеличения фрагмента (для подписи под слайдером).
 */
export interface ScaleMedia {
  macro: Media;
  frame: Media;
  zoom: string;
}

const CASE_MEDIA: Record<string, ScaleMedia> = {
  "case-skin": {
    zoom: "×2,5",
    macro: {
      src: "/images/before-after/skin-macro.webp",
      alt: "макро: бровь, глаз и блик на коже, увеличение в 2,5 раза",
      width: 800,
      height: 640,
      position: "50% 50%",
    },
    frame: {
      src: "/images/before-after/skin-frame.webp",
      alt: "тот же кадр целиком: глаз и блеск кожи в тёплом боковом свете",
      width: 1200,
      height: 960,
      position: "50% 46%",
    },
  },
  "case-makeup": {
    zoom: "×2,8",
    macro: {
      src: "/images/before-after/light-macro.webp",
      alt: "макро: глаз с ресницами и текстура кожи под жёстким светом",
      width: 900,
      height: 720,
      position: "50% 42%",
    },
    frame: {
      src: "/images/before-after/light-frame.webp",
      alt: "тот же кадр целиком: половина лица в тени, палец у губ",
      width: 1200,
      height: 960,
      position: "52% 45%",
    },
  },
};

export function serviceMedia(id: string): Media | undefined {
  return SERVICE_MEDIA[id];
}

export function masterMedia(id: string): Media | undefined {
  return MASTER_MEDIA[id];
}

export function caseMedia(id: string): ScaleMedia | undefined {
  return CASE_MEDIA[id];
}
