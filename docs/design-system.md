# VESPERA — дизайн-система и арт-дирекшн

Документ для вёрстки лендинга `/`. Источник истины по концепции — `BRIEF.md`; расхождений нет, здесь только уточнения до пикселя.

**Как пользоваться:** токены из §1 копируются в `globals.css` целиком. Всё остальное — правила применения. Если значение не описано — значит берётся ближайший токен, а не «на глаз».

**Три запрета, которые дороже всего стоят:**
1. Второй акцентный цвет. Только `ember` и его три производных оттенка (они нужны для контраста, не для красоты).
2. Скругления больше `2px` у карточек, полей и кнопок. `999px` — только пилюли-теги.
3. `box-shadow` как способ сделать глубину. Глубина делается волосяной линией, поверхностью и светом.

---

## 1. Токены

### 1.1 Блок `@theme` (копировать в `src/app/globals.css`)

```css
@import "tailwindcss";

/* ─────────────────────────────────────────────────────────────
   VESPERA / Obsidian Milk
   ───────────────────────────────────────────────────────────── */
@theme {
  /* 1. Палитра BRIEF — единственные «сырые» цвета */
  --color-ink: #0b0809;
  --color-plum: #181016;
  --color-smoke: #2a1e25;
  --color-milk: #f4efe7;
  --color-sand: #ded3c4;
  --color-ember: #e8794a;
  --color-pearl: #e8e1f0;

  /* 2. Производные ember: только состояния и контраст */
  --color-ember-light: #f08a5e; /* hover заливки · 8.07:1 с ink */
  --color-ember-press: #d2603a; /* active заливки · 5.20:1 с ink */
  --color-ember-deep: #a6431e;  /* текст на молоке · 5.33:1 */

  /* 3. Семантика — тёмная тема по умолчанию */
  --color-bg: var(--color-ink);
  --color-surface: var(--color-plum);
  --color-surface-hover: var(--color-smoke);
  --color-text: var(--color-milk);              /* 17.43:1 */
  --color-text-muted: #8a8279;                  /* sand 60% над ink · 5.27:1 */
  --color-text-disabled: rgb(244 239 231 / 0.38);
  --color-accent: var(--color-ember);           /* заливка CTA */
  --color-accent-hover: var(--color-ember-light);
  --color-accent-press: var(--color-ember-press);
  --color-accent-text: var(--color-ember);      /* текст/цифра · 6.90:1 */
  --color-on-accent: var(--color-ink);          /* ink на ember · 6.90:1 */
  --color-focus: var(--color-ember);
  --color-line: rgb(244 239 231 / 0.14);        /* декоративная волосяная */
  --color-line-strong: rgb(244 239 231 / 0.24); /* усиленный разделитель */
  --color-control-border: rgb(244 239 231 / 0.40); /* граница контролов · 3.41:1 */

  /* 4. Бумажная тема (молочные секции) */
  --color-paper: var(--color-milk);
  --color-paper-surface: #eae3d8;               /* ink на ней · 15.65:1 */
  --color-paper-hover: #e1d9cc;
  --color-paper-text: var(--color-ink);
  --color-paper-muted: #5a5754;                 /* 6.27:1 на milk */
  --color-paper-line: rgb(11 8 9 / 0.14);
  --color-paper-line-strong: rgb(11 8 9 / 0.24);
  --color-paper-control-border: rgb(11 8 9 / 0.48); /* 3.42:1 на milk */

  /* 5. Типографика — флюидная шкала */
  --text-display: clamp(3.2rem, 11vw, 11rem);
  --text-display--line-height: 0.92;
  --text-display--letter-spacing: -0.03em;

  --text-h1: clamp(2.6rem, 6vw, 5rem);
  --text-h1--line-height: 0.96;
  --text-h1--letter-spacing: -0.03em;

  --text-h2: clamp(2rem, 4vw, 3.4rem);
  --text-h2--line-height: 1;
  --text-h2--letter-spacing: -0.02em;

  --text-h3: clamp(1.3rem, 2vw, 1.8rem);
  --text-h3--line-height: 1.12;
  --text-h3--letter-spacing: -0.01em;

  --text-lead: clamp(1.125rem, 1.6vw, 1.375rem);
  --text-lead--line-height: 1.5;

  --text-body: clamp(1rem, 1.15vw, 1.125rem);
  --text-body--line-height: 1.62;

  --text-small: 0.8125rem;
  --text-small--line-height: 1.5;

  --text-micro: 0.6875rem;
  --text-micro--line-height: 1.2;
  --text-micro--letter-spacing: 0.18em;

  --text-quote: clamp(1.5rem, 2.4vw, 2.25rem);
  --text-quote--line-height: 1.24;
  --text-quote--letter-spacing: 0.005em;

  --text-price: 1.25rem;
  --text-price--line-height: 1.2;

  /* 6. Вертикальный ритм и поля */
  --spacing-section: clamp(96px, 12vw, 200px);
  --spacing-section-sm: clamp(64px, 8vw, 120px);
  --spacing-gutter: clamp(20px, 5vw, 80px);
  --spacing-stack: clamp(32px, 4vw, 56px);
  --spacing-block: clamp(24px, 3vw, 40px);
  --spacing-inline: clamp(16px, 2vw, 24px);
  --spacing-hair: 1px;

  /* 7. Радиусы — только три */
  --radius-card: 2px;
  --radius-field: 2px;
  --radius-pill: 999px;

  /* 8. Контейнеры и меры строки */
  --container-page: 90rem;      /* 1440 — ширина контента, поля снаружи */
  --container-measure: 34rem;   /* 544 — тело, ≈58–64 знака */
  --container-form: 40rem;      /* 640 — колонка записи */
  --container-note: 22rem;      /* 352 — правые примечания */

  /* 9. Брейкпоинты: 360 / 768 / 1024 / 1440 / 1920 */
  --breakpoint-xs: 22.5rem;
  --breakpoint-3xl: 120rem;

  /* 10. Движение */
  --ease-brand: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-brand-in: cubic-bezier(0.64, 0, 0.78, 0);
  --ease-loop: cubic-bezier(0.65, 0, 0.35, 1);
  --animate-marquee: marquee 48s linear infinite;
}

/* Шрифты приходят из next/font переменными — поэтому inline */
@theme inline {
  --font-display: var(--font-unbounded);
  --font-sans: var(--font-onest);
  --font-quote: var(--font-cormorant);
  --default-font-family: var(--font-onest);
}

/* Гарантия базы: preflight берёт --default-font-family, но правило ниже
   снимает вопросы при смене темы и при отключённом preflight */
@layer base {
  body {
    font-family: var(--font-sans);
    background: var(--color-bg);
    color: var(--color-text);
  }
}

/* Бумажная тема: переопределяем семантику, компоненты не меняются */
[data-theme="paper"] {
  --color-bg: var(--color-milk);
  --color-surface: var(--color-paper-surface);
  --color-surface-hover: var(--color-paper-hover);
  --color-text: var(--color-ink);
  --color-text-muted: var(--color-paper-muted);
  --color-text-disabled: rgb(11 8 9 / 0.38);
  --color-accent-text: var(--color-ember-deep);
  --color-focus: var(--color-ember-deep);
  --color-line: var(--color-paper-line);
  --color-line-strong: var(--color-paper-line-strong);
  --color-control-border: var(--color-paper-control-border);
}

/* Не-неймспейсные токены: в v4 у z-index и длительностей нет утилит */
:root {
  --z-base: 0;
  --z-sticky: 10;      /* стек услуг: 10 + i */
  --z-progress: 30;
  --z-nav: 50;
  --z-lantern: 55;
  --z-grain: 60;
  --z-toast: 70;
  --z-intro: 100;

  --dur-micro: 120ms;
  --dur-base: 240ms;
  --dur-large: 420ms;
  --dur-reveal: 700ms;
  --dur-intro: 900ms;
  --dur-marquee: 48s;

  --stack-top: 112px;   /* верх первого липкого слота */
  --stack-step: 18px;   /* сдвиг каждого следующего */

  --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

@keyframes marquee {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}
```

### 1.2 Как это устроено

| Правило | Значение |
| --- | --- |
| Палитровые классы (`bg-ink`, `text-sand`) | Только внутри §8 (артефакты) и 3D-фолбэка. В компонентах — семантические |
| Семантические классы | `bg-bg`, `bg-surface`, `text-text`, `text-text-muted`, `text-accent-text`, `border-line`, `border-control-border` |
| Прозрачность через слэш (`border-line/50`) | Запрещено: `--color-line` уже альфа. Меняй на `line-strong` или `control-border` |
| `--color-pearl` | Только в градиентах и в 3D. Никогда не текст и не заливка |
| `--color-smoke` | Только hover-подложки и 3D. Как граница даёт 1.25:1 — не годится |
| `--color-accent` | Заливка. Для текста и цифр — `--color-accent-text` (на бумаге темнее) |
| `--color-focus` | На заливке `ember` кольцо невидимо → там `ink`/`milk` с offset |

### 1.3 Бюджет акцента (проверка по скриншоту)

Площадь экрана 1440×900 = 1 296 000 px². Лимит BRIEF — 5–7%.

| Носитель акцента | Площадь | Доля |
| --- | --- | --- |
| CTA hero (236×56) | 13 216 | 1.0% |
| Активный шаг + прогресс записи | 4 800 | 0.4% |
| Три номера ритуалов | 15 000 | 1.2% |
| Код брони `VSP-XXXX` | 2 400 | 0.2% |
| Hover-состояния (по одному в кадре) | ≤ 8 000 | 0.6% |
| **Итого в худшем кадре** | | **≈ 3.4%** |

Остальное — `milk`, `sand`, `ember`-свет в 3D и ореол курсора (не считается: размытие, не заливка).

---

## 2. Типографика

Подключение: `next/font/google`, `display: "swap"`, `variable`, `subsets: ["cyrillic", "latin"]`.
`Unbounded` — 200/300/400; `Onest` — 300/400/500; `Cormorant_Garamond` — 300 italic.

### 2.1 Уровни

| Уровень | Шрифт / вес | Размер | LH | Tracking | Max-width | Где |
| --- | --- | --- | --- | --- | --- | --- |
| `display` | Unbounded 300 | `clamp(3.2rem, 11vw, 11rem)` | 0.92 | −0.03em | 8 колонок | Только Hero |
| `h1` | Unbounded 300 | `clamp(2.6rem, 6vw, 5rem)` | 0.96 | −0.03em | 18ch | Манифест |
| `h2` | Unbounded 300 | `clamp(2rem, 4vw, 3.4rem)` | 1.0 | −0.02em | 18ch (≈820px) | Заголовки секций |
| `h3` | Unbounded 400 | `clamp(1.3rem, 2vw, 1.8rem)` | 1.12 | −0.01em | 24ch | Услуги, ритуалы, карточки |
| `lead` | Onest 300 | `clamp(1.125rem, 1.6vw, 1.375rem)` | 1.5 | 0 | 40rem | Вступление hero, лид шага |
| `body` | Onest 400 | `clamp(1rem, 1.15vw, 1.125rem)` | 1.62 | 0 | **34rem** | Абзацы, описания |
| `small` | Onest 400 | `0.8125rem` (13px) | 1.5 | 0 | 30rem | Мета, подписи, ошибки |
| `micro` | Onest 500 | `0.6875rem` (11px) | 1.2 | **0.18em** UPPER | — | Eyebrow, индексы, метки полей |
| `quote` | Cormorant 300 italic | `clamp(1.5rem, 2.4vw, 2.25rem)` | 1.24 | +0.005em | 22ch | Врезки, подпись футера |
| `price` | Onest 400 + `tabular-nums` | `1.25rem` | 1.2 | 0 | — | Цены, итог |

### 2.2 Правила

- **Body:** 45–75 знаков. `34rem` при 18px = 58–64 знака. Шире — только `lead` (до 40rem).
- **Cormorant italic** — максимум 2 строки, не больше 90 знаков, никогда не body и не UI. Допустим в: манифесте (1 врезка), подписи футера, крупной цитате над маркизой. Не в карточках услуг.
- **`font-variant-numeric: tabular-nums`** обязательно на: ценах, длительности, таймслотах, шагах, коде брони, датах. Иначе цифры «прыгают».
- **Uppercase micro:** после текста добавить `margin-right: -0.18em`, чтобы трекинг не ломал выравнивание по правому краю.
- **Веса:** 500 в Onest — только для micro и активных меток. 400 — body. 300 — только `lead` и manifesto. Никакого 600+.
- **`font-display` не используется для кириллических абзацев** — только для 1–3 слов заголовка.

### 2.3 Переносы

| Элемент | Правило |
| --- | --- |
| Hero «КРАСОТА ПОСЛЕ ЗАКАТА» | Всегда 3 строки вручную: `КРАСОТА<br/>ПОСЛЕ<br/>ЗАКАТА`. Без `balance` — композиция важнее |
| Манифест | `<br/>` после каждой фразы на ≥1024, `text-wrap: balance` ниже. Максимум 3 строки |
| H2 секций | `text-wrap: balance`, `hyphens: none`, `max-width: 18ch`. Никогда не более 3 строк |
| H3 карточек | `text-wrap: pretty`, `hyphens: none`, 1–2 строки |
| Body | `text-wrap: pretty`; `hyphens: auto` только `<768` (атрибут `lang="ru"` уже стоит) |
| Цены / мета | `white-space: nowrap` — цена и единица не разрываются |

Запрещено: `letter-spacing` на body, `text-transform` на h1–h3, `text-shadow`.

---

## 3. Layout

### 3.1 Контейнер и сетка

```
<section class="px-gutter">            ← внешние поля
  <div class="mx-auto max-w-page">     ← контент ≤ 1440
```

| Вьюпорт | Поле `gutter` | Контент | Колонок | Gutter сетки | Ширина колонки |
| --- | --- | --- | --- | --- | --- |
| 360 | 20 | 320 | 4 | 16 | 68 |
| 768 | 38 | 691 | 8 | 24 | 65 |
| 1024 | 51 | 922 | 12 | 24 | 55 |
| 1440 | 72 | 1296 | 12 | 24 | 86 |
| 1920 | 80 | 1440 | 12 | 24 | 98 |

- Сетка: `display: grid; grid-template-columns: repeat(var(--cols), minmax(0,1fr)); column-gap: var(--grid-gap)`. `--cols`: 4 → 8 (≥768) → 12 (≥1024). `--grid-gap`: 16 → 24.
- Элемент, выходящий за контейнер (галерея мастеров, маркиза): `margin-inline: calc(var(--spacing-gutter) * -1); width: calc(100% + var(--spacing-gutter) * 2)`. `100vw` не использовать — даёт горизонтальный скролл при видимом скроллбаре.
- Горизонтальный скролл запрещён: любой full-bleed элемент — в `overflow-x: clip` на `<main>`.

### 3.2 Вертикальный ритм

| Токен | Значение | Где |
| --- | --- | --- |
| `--spacing-section` | `clamp(96px, 12vw, 200px)` | Паддинг секции сверху и снизу |
| `--spacing-section-sm` | `clamp(64px, 8vw, 120px)` | Внутренние крупные блоки (манифест → врезка) |
| `--spacing-stack` | `clamp(32px, 4vw, 56px)` | Заголовок секции → контент |
| `--spacing-block` | `clamp(24px, 3vw, 40px)` | Между смысловыми блоками |
| `--spacing-inline` | `clamp(16px, 2vw, 24px)` | Между элементами в строке |

Правило: расстояние между секциями одинаковое. Единственное исключение — Booking получает `padding-top: var(--spacing-section)` + 24px из-за смены темы на бумагу.

### 3.3 Волосяные линии

- Спецификация: `1px solid var(--color-line)` (`#2c2828` над ink, 1.37:1). Усиленная: `line-strong` (1.92:1).
- **Только декор.** Граница поля ввода и фокус — не `line`, а `control-border` (3.41:1) и `focus`.
- Одна линия между двумя блоками. Двойная (2px) запрещена — стык делается одной линией на контейнере.
- Линии без скруглений, от края до края своего блока. В сетке — по границе колонки, не «под текстом».
- Вертикальные линии — только в ритуалах (разделение колонок) и в маркизе (между отзывами). Больше нигде.

### 3.4 Зерно

- Один слой на страницу: `position: fixed; inset: 0; background-image: var(--grain); background-size: 180px 180px; opacity: 0.04; pointer-events: none; z-index: var(--z-grain)`.
- Без `mix-blend-mode`: на 4% разница overlay/multiply не читается, а полноэкранный blend-слой стоит кадров. Плотность одна для тёмных и бумажных секций.
- Опция для ≥1024 и мощных GPU: `mix-blend-mode: overlay; opacity: 0.035`. Отключается при `prefers-reduced-data` и в Lighthouse-прогоне не влияет на LCP (слой не в первом кадре).
- Слой не анимируется, не попадает в `will-change`, не пересоздаётся при скролле. Тосты (`z 70`) и интро (`z 100`) выше зерна — оно их не накрывает.
- Слой не должен создавать stacking context над sticky-стеком услуг: `z 60` выше карточек намеренно (плёнка поверх всего), но `pointer-events: none` обязателен.

### 3.5 Поведение по ширине

| Ширина | Что меняется |
| --- | --- |
| 360 | 4 колонки, поля 20, hero в одну колонку, орб за заголовком 260px, все CTA на всю ширину (56px) |
| 768 | 8 колонок, hero: текст 1–5, орб справа 390px, услуги без sticky, мастера 2 карточки в кадре |
| 1024 | 12 колонок, включаются sticky-услуги, магнитные кнопки, курсор-фонарь, 4 карточки мастеров в скролле |
| 1440 | Контент 1296, орб 700, услуги 340px высотой, booking 7+4 колонки |
| 1920 | Контент фиксируется на 1440 по центру, поля 80+, орб 820, типографика упирается в clamp-максимумы |

---

## 4. Компоненты

Общие правила: фокус — `outline: 2px solid var(--color-focus); outline-offset: 3px` (никогда `outline: none` без замены). Тач-таргет ≥ 44×44. Переходы — `var(--dur-base) var(--ease-brand)` если не указано иное.

### 4.0 TopBar (часть Hero, не отдельная секция)

- Высота 72, фиксированный, `z-index: var(--z-nav)`. Фон: `transparent` до 40px скролла, дальше `bg-bg` (не полупрозрачный — стекломорфизм запрещён) + `border-bottom: line`.
- Слева — wordmark `VESPERA` Unbounded 300, 15px, tracking 0.42em, `margin-right: -0.42em`.
- Справа — телефон `small` (скрыт <1024) + Ghost-кнопка `sm` «Записаться».
- Ссылка «К содержанию» — первый элемент в `<body>`, видимая при фокусе, 44px, `bg-surface`.

### 4.1 Button

Анатомия: `inline-flex; align-items:center; justify-content:center; gap:12px; border-radius:2px; border:1px solid transparent; font: Onest 400; letter-spacing:0.01em; white-space:nowrap`.

| Размер | Высота | Padding X | Шрифт | Где |
| --- | --- | --- | --- | --- |
| `lg` | 56 | 32 | 15px | Hero, финал записи |
| `md` | 48 | 24 | 14px | По умолчанию |
| `sm` | 40 (+ `::after` до 44) | 16 | 13px | TopBar, футер; только ≥1024 |

**Primary** — `bg-accent`, `text-on-accent`.

| Состояние | Спецификация |
| --- | --- |
| rest | `background: var(--color-accent)` #E8794A, текст `#0B0809` (6.90:1) |
| hover | `background: var(--color-accent-hover)` #F08A5E (8.07:1) · 240ms · стрелка `translateX(4px)` |
| active | `background: var(--color-accent-press)` #D2603A (5.20:1), `transform: scale(0.985)` · 120ms |
| focus-visible | `outline: 2px solid var(--color-text); outline-offset: 3px` (кольцо ember на ember не видно) |
| disabled | `background: rgb(244 239 231 / 0.10)`, `color: rgb(244 239 231 / 0.38)`, `cursor: not-allowed`, без hover-реакции |

**Ghost** — прозрачный фон, `border: 1px solid var(--color-control-border)` (3.41:1), `text-text`.

| Состояние | Спецификация |
| --- | --- |
| rest | граница 0.40 молока, текст `milk` |
| hover | `background: var(--color-surface)` #181016 + `border-color: rgb(244 239 231 / 0.56)` |
| active | `background: var(--color-surface-hover)` + `scale(0.985)` |
| focus-visible | `outline: 2px solid var(--color-focus)` offset 3 (6.90:1 на ink) |
| disabled | `color: var(--color-text-disabled)`, граница `line` |

**Link** — без рамки. `text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; text-decoration-color: var(--color-line-strong)`. Hover: подчёркивание `accent-text`, текст без изменений. Focus: `outline: 2px solid focus` offset 4. Стрелка `→` 16px, `translateX(4px)` на hover.

### 4.2 MagneticCTA

- Обёртка `<span class="inline-block">` вокруг Primary `lg`. Смещение считается по курсору: `dx = (pointerX − centerX) * 0.12`, ограничение **±8px** по каждой оси.
- Spring: `stiffness: 150, damping: 15, mass: 0.5`. Возврат — 420ms `--ease-brand`.
- Включается только при `@media (hover: hover) and (pointer: fine) and (min-width: 1024px)` и вне `prefers-reduced-motion`.
- Фокус-кольцо остаётся на `<button>`, трансформ — на обёртке. Кнопка не «уезжает» из-под пальца клавиатуры.
- Внутренний текст не трансформируется отдельно — иначе двоится в движении.

### 4.3 Eyebrow

```
[ 24×1 hairline ]  gap 12  [ ТЕКСТ 11px / 500 / 0.18em / UPPER ]  gap 8  [ ● 4px accent ]
```

- Цвет: `--color-text-muted` (5.27:1) на тёмном, `--color-paper-muted` (6.27:1) на бумаге.
- Точка `ember` — опциональна, максимум одна на секцию.
- Формат для секций: `02 — УСЛУГИ`. Для hero: `VESPERA · BEAUTY STUDIO · MOSCOW` (без индекса).
- Высота строки 12, `display:flex; align-items:center`.

### 4.4 SectionHeader

| Слот | Правило |
| --- | --- |
| Линия сверху | `1px line`, полная ширина контейнера, `margin-bottom: 24px` |
| Eyebrow | Левая колонка, cols 1–3 |
| H2 | cols 1–7, `margin-top: 20px`, `max-width: 18ch` |
| Note | cols 9–12, `small`, `text-muted`, `max-width: var(--container-note)`, выравнивание по базовой линии H2 |
| Отступ до контента | `var(--spacing-stack)` |

Мобайл: note уходит под H2, `margin-top: 16px`, `max-width: 100%`.

### 4.5 ServiceCard (sticky)

| Параметр | Десктоп ≥1024 | Мобайл/планшет |
| --- | --- | --- |
| Высота | `clamp(280px, 34vw, 380px)` | auto (media-полоса 140px) |
| Padding | 32 | 20 |
| Радиус | 2 | 2 |
| Фон | `surface` + `border 1px line` | то же |
| Media | справа, 34% ширины (cols 9–12), full height | снизу, 140px, full width |

Сетка карточки (12 колонок): индекс `micro` cols 1; h3 cols 2–5; мета (длительность) cols 6–7; цена cols 8 (справа, `text-right`); media cols 9–12.

Состояния:

| Состояние | Что происходит |
| --- | --- |
| rest | media `opacity: 0.35`, `filter: saturate(0.85)` — «растворено» в карточке |
| hover | media `opacity: 1`, `scale: 1.03` внутри `overflow:hidden` · 420ms `ease-brand`; цена → `accent-text`; строка сдвигается на 2px влево |
| focus-visible | кольцо `focus` на всей карточке (карточка — `<a>` на booking с предвыбранной услугой) |
| active | `background: surface-hover` |
| stack (скролл) | `scale: 1 − 0.035 × depth`, `opacity: 1 − 0.15 × depth`, `depth = 0..2` |

Sticky: `top: calc(var(--stack-top) + var(--i) * var(--stack-step))`, `z-index: calc(var(--z-sticky) + var(--i))`. Мобайл: `position: static`, между карточками `1px line`.

### 4.6 RitualCard

Не карточка — строка-разворот. Сетка 12: номер cols 1–2, название cols 3–7, описание cols 8–10, мета/цена cols 11–12.

| Элемент | Спецификация |
| --- | --- |
| Номер | `font-display`, `--text-h1`, вес **200**, `accent-text`, `tabular-nums`, tracking −0.04em |
| Название | `h3`, вес 400 |
| Описание | `body`, `max-width: 30rem`, `text-muted` |
| Мета | `micro`, `muted`: «120 МИН · 18 000 ₽» |
| Разделитель | `1px line` сверху, `padding-block: 72` (мобайл 40) |
| Hover | Линия над строкой → `line-strong`; номер не меняется (остаётся `accent-text`); стрелка `→` +6px |
| Фокус | Кольцо на `<a>`-обёртке всей строки |

Мобайл: номер остаётся крупным слева, текст в колонку, мета под описанием.

### 4.7 MasterCard

| Параметр | Значение |
| --- | --- |
| Ширина | `clamp(248px, 24vw, 340px)` |
| Плита | `aspect-ratio: 3/4`, `border 1px line`, radius 2 |
| Внутренние отступы текста | 16 сверху, 0 по бокам |
| Имя | 18px / Onest 500 / 1.3 |
| Роль | `small`, `muted` |
| Стаж | `micro`, `muted`, `tabular-nums`: «11 ЛЕТ» |

Поведение: плита `scale: 1.03` (700ms), мета-блок `opacity 0→1` + `translateY(8px→0)` (240ms, delay 60ms). `:focus-visible` = hover-состояние. Клик — предвыбор мастера в записи (scroll к `#booking`). Мобайл: мета видна всегда, hover отключён.

### 4.8 BeforeAfterSlider

| Параметр | Значение |
| --- | --- |
| Пропорции | 5:4 (≥768), 4:5 (<768) |
| Ширина | 6 колонок (≈636 при 1440) |
| Ручка | 44×44, `bg milk`, `border 1px line-strong`, radius 2, две вертикальные насечки 1×12 внутри |
| Линия сравнения | 1px `rgb(244 239 231 / 0.9)`, full height |
| Метки | «ДО» / «ПОСЛЕ» — `micro`, 1px border, padding 6/10, `bg ink/60`, отступ 16 от углов |
| Курсор | `ew-resize` на всей области |

Состояния: rest 50%; hover — ручка `scale: 1.06` (240ms); dragging — без transitions, `cursor: grabbing`; focus-visible — кольцо `focus` вокруг ручки, offset 4.

Клавиатура: `←/→` ±2%, `Shift + ←/→` ±10%, `Home` 0%, `End` 100%. ARIA — см. §9.

### 4.9 TestimonialMarquee

- Лента: `display:flex`, `gap: 48`, элементы `min-width: 320px; max-width: 420px`. Между элементами — `1px line` вертикально, высота 120.
- Скорость: полный цикл **48s**, `linear`, `translate3d(0 → −50%)`. Контент дублируется, копия `aria-hidden="true"`.
- Пауза: `:hover`, `:focus-within` и кнопка «Пауза» 44×44 в правом верхнем углу (обязательна для WCAG 2.2.2).
- Маска краёв: `mask-image: linear-gradient(90deg, transparent 0, #000 80px, #000 calc(100% - 80px), transparent 100%)`.
- Текст отзыва: `body` (18px), не Cormorant. Подпись: `small` + `micro` услуга.
- `<768`: элементы 280px, скорость 64s (короче путь — та же линейная скорость).

### 4.10 Field (Input / Select / DatePicker / SlotPicker)

Общая анатомия: label `micro` UPPER (`margin-bottom: 8px`) → контрол → сообщение (`small`, `margin-top: 6px`).

| Параметр | Значение |
| --- | --- |
| Высота | 52 (3.25rem) |
| Фон | `transparent` |
| Граница | только нижняя, `1px solid var(--color-control-border)`; боков и верха нет |
| Радиус | 2 (для focus-кольца) |
| Текст | 16px (iOS не зумит) |
| Placeholder | `text-muted` (не светлее) |
| Padding | `8px 0` |

**Input.** Состояния: rest — нижняя граница `control-border`; hover — `line-strong`; focus — `border-bottom: 2px solid var(--color-focus)` + `outline: 2px solid var(--color-focus); outline-offset: 4px`; error — `border-bottom: 2px solid var(--color-accent-text)` + сообщение `accent-text` 13px; disabled — текст `text-disabled`, граница `line`; filled — граница `control-border`, текст `text`.

**Select.** Нативный `<select>` с `appearance: none`, `padding-right: 36`, шеврон 12×12 (`stroke: currentColor`, 1px) справа. Опции — системные (не стилизуем).

**DatePicker.** Два режима:
- `<768`: горизонтальная лента 14 дней, карточка 64×80, `scroll-snap-type: x mandatory`, выбранная — `bg ink`, текст `milk`, radius 2. Внутри: день недели `micro`, число 20px `tabular-nums`.
- `≥768`: календарь-месяц. Ячейка 44×44, `gap: 4`, 7 колонок (итого 332). Дни недели — `micro` muted. Кнопки навигации 44×44 по краям шапки. Недоступные дни — `text-disabled`, `aria-disabled`. Выбранный — `bg ink`, текст `milk`.
- Пустые слоты дня: под календарём `small` muted «Свободных окон нет — посмотрите соседние даты.»

**SlotPicker.** 20 стартов 12:00–21:30. Сетка 4 колонки (≥768) / 3 (<768), `gap: 8`, кнопка `min-height: 48`, radius 2, `tabular-nums`.
Группы с подзаголовком `micro` muted: `ДЕНЬ 12:00–14:30` (6), `ВЕЧЕР 15:00–17:30` (6), `ПОЗДНИЙ ВЕЧЕР 18:00–21:30` (8). Слоты, недоступные из-за длительности услуги, не показываются (не дизейблятся) — иначе экран превращается в решето.

| Состояние | Спецификация |
| --- | --- |
| rest | `border 1px line-strong`, текст `text` |
| hover | `border-color: control-border`, фон `surface` |
| selected | `bg ink`, `text milk`, граница `ink` |
| disabled | `text-disabled`, `border line`, `cursor: not-allowed` |
| loading | 6 скелетонов 48px, `bg surface-hover`, без шиммера |

### 4.11 Stepper

- `<ol>` из 4 шагов: `01 Услуга · 02 Мастер · 03 Время · 04 Контакты`.
- Шаг: номер `micro tabular` + название `small`. Активный — номер `accent-text`, название `500`. Пройденный — `text`, кликабелен (44px высота). Будущий — `text-muted`, не кликабелен.
- Соединитель: `1px line`, `flex: 1`, `margin-inline: 12px`.
- Под рядом — прогресс 2px, `bg accent-text`, `scaleX(step/4)` слева, 420ms `ease-brand`.
- Мобайл: строка «ШАГ 2 ИЗ 4 — МАСТЕР» + тот же прогресс-бар.
- ARIA: `<ol>`, активный `aria-current="step"`, пройденные — `<button>`.

### 4.12 BookingSummary

| Параметр | Значение |
| --- | --- |
| Ширина | 416 (4 колонки при 1440), `max-width: 100%` |
| Позиция | `sticky; top: 96px` |
| Фон | `transparent` на бумаге + `1px border-line`, radius 2 |
| Padding | 28 |
| Строка | `micro` label muted сверху, значение `small` text; `margin-bottom: 16` |
| Итог | отделён `1px line`, цена `text-price tabular`, справа |
| Примечание | `small` muted: «Оплата в студии. Отмена — за 6 часов.» |

Мобайл (<1024): не sticky, свёрнут в 2 строки (`Ритуал кожи · 19:00 · 12 000 ₽`) с кнопкой «Детали» (44px), раскрывается вниз на 240ms.

### 4.13 Toast / Success

**Toast** — `position: fixed; bottom: 24; left: 24; max-width: 360; z-index: var(--z-toast)`. Фон `ink`, `1px line-strong`, radius 2, padding `16px 20px`, текст `small`. Появление: `opacity 0→1`, `translateY(12→0)`, 240ms. Уход: 180ms. Автоскрытие 8s. `role="status" aria-live="polite"`. Ошибка — левая граница 2px `accent` (не красный фон).

**Success** — заменяет тело формы (не тост):
- Заголовок `h3`: «Запись принята».
- Код: Unbounded 300, 32px, tracking 0.06em, в рамке `1px line-strong`, padding `20px 24px`, `tabular-nums`.
- Текст `body`: «Мы позвоним для подтверждения. Если планы изменятся — +7 495 000-00-00.»
- Кнопка Ghost: «Записать ещё».
- Фокус переводится на заголовок (`tabIndex={-1}`), объявление через `aria-live="polite"`.

### 4.14 Footer

Сетка 12 (≥1024): wordmark cols 1–4, часы 5–6, адрес 7–8, контакты 9–10, соцсети 11–12. `border-top: 1px line`. Padding: `clamp(64px, 8vw, 120px)` сверху, 32 снизу.

| Элемент | Спецификация |
| --- | --- |
| Wordmark | Unbounded 300, 32px, tracking 0.28em |
| Слоган | `quote` Cormorant italic 300, 20px (1.25rem — единственный размер вне шкалы, подпись), `text-muted` |
| Заголовки колонок | `micro` muted: ЧАСЫ / АДРЕС / КОНТАКТЫ / СВЯЗЬ |
| Ссылки | `small`, underline `line-strong`, hover `accent-text` |
| Print-строка | `1px line` сверху, `micro` muted, uppercase, `tabular-nums`: «© 2026 VESPERA · МОСКВА · ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ» |

Мобайл: 2 колонки (wordmark на всю ширину), print-строка в 2 строки.

### 4.15 Состояния загрузки и пустоты (обязательные)

| Место | Empty | Loading | Error |
| --- | --- | --- | --- |
| Слоты дня | «На этот день окон нет. Посмотрите соседние даты.» + 2 кнопки-даты | 6 скелетонов | «Не удалось загрузить окна. Повторить» (Link) |
| Мастера | — | 4 скелетона плит 3:4 | — |
| Отправка брони | — | кнопка: текст меняется на «Отправляем…», `aria-busy="true"`, прогресс-точка 3px `accent` | «Это время только что заняли. Выберите другое.» + переход на шаг 3 |

---

## 5. Секции

Общая последовательность: Intro → Hero → Manifesto → Services → Rituals → Masters → Before/After → Testimonials → Booking → Footer.
Тёмные: Hero, Services, Rituals, Masters, Before/After, Testimonials, Footer. Бумажные: **Manifesto** и **Booking**. Итого ink ≈ 75–80% площади (две бумажные секции из десяти).

### 5.1 Intro

- Оверлей `position: fixed; inset: 0; background: ink; z-index: var(--z-intro)`.
- Центр: `VESPERA` Unbounded 200, 40px, tracking 0.42em, `margin-right: -0.42em`. Маска: `clip-path` снизу вверх.
- За словом — «призрак» орба: тот же градиент, что фолбэк (§7), 480px, `opacity 0 → 0.25`.
- Тайминг: 0–700 слово, 200–900 орб, 480–900 занавес вверх (`clip-path: inset(0 0 100% 0)`).
- Пропуск: клик, колесо, `Esc`, любой `keydown` → fade 180ms. Повторно в сессии не показывать (`sessionStorage`).
- `prefers-reduced-motion` — интро не рендерится вообще (не «ускоренно», а отсутствует).

### 5.2 Hero

```
┌──────────────────────────────────────────────────────────────────────────┐
│ VESPERA                                   12:00–22:00   +7 495 000-00-00 │ 72
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  VESPERA · BEAUTY STUDIO · MOSCOW                          ╭──────────╮   │
│                                                            │          │   │
│  КРАСОТА                                                   │  pearl   │   │
│  ПОСЛЕ                                                     │  Ø 700   │   │
│  ЗАКАТА                                                    │   x 66%   │   │
│                                                            ╰──────────╯   │
│  ┌────────────┐  ┌──────────┐              Красота после заката —       │
│  │ Записаться │  │  Услуги  │              студия вечерних ритуалов.    │
│  └────────────┘  └──────────┘              Один мастер, один гость.      │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ 12:00–22:00 · ЕЖЕДНЕВНО    СТОЛЯРНЫЙ ПЕР., 3    ─ отзывы ─▶ отзывы ─▶   │ 72
└──────────────────────────────────────────────────────────────────────────┘
   ← 1 ─────────── 7 →                                              ← 9 ─ 12 →
```

| Элемент | Позиция и размеры |
| --- | --- |
| Высота | `100svh`, минимум 640 |
| Eyebrow | top 152, cols 1–6 |
| Заголовок | cols 1–8, начало на 30svh, 3 строки `display` |
| Орб | центр 66% ширины / 44% высоты, Ø 700 (см. §7) |
| CTA | по низу заголовка + 64, `lg` primary 236×56 и ghost 176×56, gap 16 |
| Лид | cols 9–12, `lead`, выровнен по нижней трети CTA, `max-width: 22rem` |
| Нижняя строка | `position: absolute; bottom: 0; height: 72`, `border-top: line`, 3 зоны: часы, адрес, маркиза (ширина 420) |

Мобайл 360: орб 260px, центр 50%/28%, `opacity 0.55`, `z-index 0` (текст выше); заголовок начинается на 42svh; CTA — два на всю ширину, стек; нижняя строка скрывает маркизу, остаются часы и адрес в 2 строки; высота hero = `max(100svh, 600px)`.

### 5.3 Manifesto (бумага)

- `data-theme="paper"`, `padding-block: var(--spacing-section)`.
- Eyebrow `01 — МАНИФЕСТ` cols 1–3.
- Заявление: cols 4–12, `--text-h1`, вес 300, `max-width: 22ch`, три строки, пословное проявление по скроллу (opacity 0.18 → 1).
- Врезка Cormorant: cols 5–9, `--text-quote`, `margin-top: var(--spacing-section-sm)`, 2 строки максимум. Цвет `paper-muted` (6.27:1).
- Под врезкой — подпись `micro`: «— ОСНОВАТЕЛЬ, АЛИСА ВЕТРОВА».
- Текст: «Один мастер. Один гость. Девяносто минут тишины.» / врезка «Свет к вечеру становится мягче — и лицо тоже.»

### 5.4 Services

```
 02 — УСЛУГИ                                       Цены фиксированы.
 Шесть практик                                     Оплата в студии.
 ────────────────────────────────────────────────────────────────────
 ┌──────────────────────────────────────────────────────────────────┐ top 112  z 10
 │ 01  Ритуал кожи          90 мин   12 000 ₽   ░░░░░░ media ░░░░░░ │ h 340
 └──────────────────────────────────────────────────────────────────┘
 ┌──────────────────────────────────────────────────────────────────┐ top 130  z 11
 │ 02  Архитектура взгляда  60 мин    7 500 ₽   ░░░░░░ media ░░░░░░ │ scale .965
 └──────────────────────────────────────────────────────────────────┘
 ┌──────────────────────────────────────────────────────────────────┐ top 148  z 12
 │ 03  Стрижка как форма    60 мин    8 000 ₽   ░░░░░░ media ░░░░░░ │ scale .930
 └──────────────────────────────────────────────────────────────────┘
        … 04 / 05 / 06 уезжают под стек, opacity 1 − 0.15 × depth
```

- Обёртка: 6 `<li>` по `min-height: 62vh`; внутри каждого — sticky-карточка. Общая высота ≈ 372vh + 100vh.
- `<768`: sticky выключен, карточки идут списком с `1px line` между, media-полоса 140px.
- Индексы `01–06` — `micro` muted, фиксированная ширина 48, `tabular-nums`.
- Цена — `price`, `tabular-nums`, права́я граница колонки 8.
- Заголовок секции: «Шесть практик». Note справа: «Цены фиксированы. Оплата в студии.»

### 5.5 Rituals

- Три строки-разворота (не карточки), `padding-block: 72`, `border-top: 1px line`.
- Номера `01/02/03` в `--text-h1`, вес 200, `accent-text` — единственное место, где номер большой и цветной.
- Названия: «Тихий час» (120 мин, 18 000 ₽), «Свет и тень» (90 мин, 14 000 ₽), «Архитектура взгляда» (90 мин, 16 000 ₽).
- Ритуал — не та же услуга: это сборка из 2–3 практик, поэтому название может совпадать с услугой, а формат и цена — нет. В карточке это подписано строкой `micro`: «2 ПРАКТИКИ · 120 МИН».
- Внутри строки — 3 пункта состава, `small`, разделены `·` (не списком с маркерами).
- Hover: `border-top-color: line-strong`, стрелка +6px, фон строки остаётся `ink` (никаких подложек).
- Финальная строка секции: `Link` «Собрать свой ритуал →» → скролл к записи.

### 5.6 Masters

- Full-bleed горизонтальный скролл: `overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain`, `data-lenis-prevent`.
- `scroll-padding-left: var(--spacing-gutter)`; карточки 340, gap 24, первая выровнена по контейнеру.
- Заголовок секции + 2 кнопки-стрелки 44×44 справа (disabled при крае).
- Под лентой — прогресс 1px `line-strong` с бегунком `accent` шириной 25%.
- Drag: pointer events, `cursor: grab/grabbing`, отключён при `(pointer: coarse)` — там нативный скролл.
- Правая маска 120px, чтобы карточки «уходили в темноту».
- Мобайл: карточки 248, мета всегда видна, стрелки скрыты.

### 5.7 Before / After

- Две плиты: cols 1–6 и 7–12, gap 24, `aspect-ratio: 5/4` (≥768), `4/5` (<768).
- Над плитой: `micro` «01 · РИТУАЛ КОЖИ · 8 НЕДЕЛЬ», справа — подпись `small` muted.
- Под плитой: `small` «Съёмка при одном свете, без ретуши.» — обязательная честная подпись.
- Обе плиты — независимые слайдеры, начальная позиция 50%, синхронизация не нужна.
- Мобайл: плиты друг под другом, gap 32.

### 5.8 Testimonials

- Над лентой — одна Cormorant-строка: «Тишина, к которой возвращаются.» (`--text-quote`, по центру, `max-width: 20ch`).
- Лента во всю ширину, высота 220, `border-block: 1px line`.
- 6 отзывов, у каждого: текст `body` 18px (≤180 знаков), имя `small` 500, услуга `micro` muted.
- Пауза при hover/focus + кнопка «Пауза» 44×44.
- `prefers-reduced-motion`: статичный ряд с горизонтальным скроллом и snap, без дубля.

### 5.9 Booking (бумага)

```
┌────────────────────────────────────────────────────────────────────────────┐  milk
│ 07 — ЗАПИСЬ                                                                │
│ Запись                                            Свободное окно — 90 мин.  │
│ ────────────────────────────────────────────────────────────────────────── │
│ 01 Услуга ──── 02 Мастер ──── 03 Время ──── 04 Контакты                    │
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                                                            │
│ ┌──────────────────────────────────────────┐  ┌──────────────────────────┐ │
│ │ 01 · ВЫБЕРИТЕ УСЛУГУ                     │  │ ВАША ЗАПИСЬ              │ │
│ │ ○ Ритуал кожи        90 мин  12 000 ₽    │  │ Услуга  Ритуал кожи      │ │
│ │ ○ Архитектура взгляда 60 мин  7 500 ₽    │  │ Мастер  Алиса Ветрова    │ │
│ │ ○ Стрижка как форма   60 мин  8 000 ₽    │  │ Дата    14 ноября, пт    │ │
│ │ ○ Свет и тень         75 мин  9 500 ₽    │  │ Время   19:00            │ │
│ │ ○ Маникюр-минимализм  60 мин  5 500 ₽    │  │ ─────────────────────    │ │
│ │ ○ Массаж лица и шеи   45 мин  6 500 ₽    │  │ Итого   12 000 ₽         │ │
│ │                                          │  │ Оплата в студии.         │ │
│ │ [ Далее → ]                              │  │ Отмена — за 6 часов.     │ │
│ └──────────────────────────────────────────┘  └──────────────────────────┘ │
│        cols 1–7 (max-w 640)                        cols 9–12 (416) sticky  │
└────────────────────────────────────────────────────────────────────────────┘
```

- Шаги: 01 Услуга → 02 Мастер → 03 Дата и время → 04 Контакты. Один шаг на экран, без «Назад» в браузере (состояние в URL-хеше не нужно).
- Колонки: форма cols 1–7 (`max-width: var(--container-form)`), сводка cols 9–12, `sticky top: 96`.
- Шаг 3: календарь (≥768) / лента дат (<768) слева, слоты справа под календарём — в пределах той же колонки.
- Шаг 4: имя, телефон, комментарий (опционально, 3 строки, `max-height: 96`), чекбокс согласия 44×44, honeypot-поле скрыто (`position:absolute; left:-9999px`, `aria-hidden`, `tabindex=-1`).
- Инлайн-валидация: на `blur` после первого ввода, не на каждый символ. Ошибка — под полем, `aria-live="polite"`.
- Кнопка шага — Primary `lg`, справа; «Назад» — Link слева (кроме шага 1).
- Мобайл: сводка сворачивается в 2 строки над кнопкой, шаг занимает всю ширину, CTA на всю ширину.

### 5.10 Footer

См. §4.14. Дополнительно: фон `ink`, верхняя граница `line`, над print-строкой — `margin-top: 64`.

Копирайт-тексты секций (единый источник, чтобы не выдумывали):

| Секция | Eyebrow | H2 | Note |
| --- | --- | --- | --- |
| Hero | `VESPERA · BEAUTY STUDIO · MOSCOW` | `КРАСОТА ПОСЛЕ ЗАКАТА` | — |
| Manifesto | `01 — МАНИФЕСТ` | — | — |
| Services | `02 — УСЛУГИ` | `Шесть практик` | `Цены фиксированы. Оплата в студии.` |
| Rituals | `03 — РИТУАЛЫ` | `Три сценария` | `Собираем под вас: кожа, свет, форма.` |
| Masters | `04 — МАСТЕРА` | `Четыре человека` | `Больше не берём — иначе теряется смысл.` |
| Before/After | `05 — ДО И ПОСЛЕ` | `Один свет` | `Без ретуши. Между кадрами — восемь недель.` |
| Testimonials | — | — | `Тишина, к которой возвращаются.` (Cormorant) |
| Booking | `07 — ЗАПИСЬ` | `Запись` | `Свободное окно — 90 минут.` |

---

## 6. Движение

Базовые кривые: `--ease-brand` для всего интерфейсного, `--ease-brand-in` только для уходов, `--ease-loop` для петель. Длительности — 120/240/420/700/900.

| # | Элемент | Триггер | Свойство | from → to | Dur | Delay | Easing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Intro · wordmark | load | clip-path + opacity | `inset(0 0 100% 0)`/0 → `inset(0)`/1 | 700 | 0 | brand |
| 2 | Intro · орб-призрак | load | scale + opacity | 0.92/0 → 1/0.25 | 700 | 200 | brand |
| 3 | Intro · занавес | load | clip-path | `inset(0)` → `inset(0 0 100% 0)` | 420 | 480 | brand-in |
| 4 | Intro · пропуск | click/wheel/Esc | opacity | 1 → 0 | 180 | 0 | linear |
| 5 | Hero · eyebrow | после интро | opacity + y | 0/12 → 1/0 | 420 | 0 | brand |
| 6 | Hero · слово | после интро | y + clip-path | 110%/`inset(0 0 100% 0)` → 0/`inset(0)` | 700 | i×70 | brand |
| 7 | Hero · лид/CTA | после интро | opacity + y | 0/16 → 1/0 | 420 | 420 | brand |
| 8 | Hero · орб (скролл) | scroll 0→100svh | scale + y | 1/0 → 0.82/−40px | scrub | 0 | linear |
| 9 | Hero · орб (курсор) | pointermove | rotation.x/.y | 0 → ±0.12 / ±0.18 rad | lerp 0.05 | 0 | — |
| 10 | Курсор-фонарь | pointermove | translate | — | lerp 0.12 | 0 | — |
| 11 | Курсор-фонарь | первый ввод / уход | opacity | 0 → 1 / 1 → 0 | 240 | 0 | brand |
| 12 | MagneticCTA | pointermove ≤120px | x, y | 0 → clamp ±8px | spring 150/15/0.5 | — | — |
| 13 | MagneticCTA | pointerleave | x, y | текущее → 0 | 420 | 0 | brand |
| 14 | Manifesto · слово | scroll progress | opacity | 0.18 → 1 | 240 | 0 | linear |
| 15 | ServiceCard | скролл стека | scale | 1 → `1 − 0.035·depth` | scrub | 0 | linear |
| 16 | ServiceCard | то же | opacity | 1 → `1 − 0.15·depth` | scrub | 0 | linear |
| 17 | ServiceCard · media | hover | opacity + scale | 0.35/1 → 1/1.03 | 420 | 0 | brand |
| 18 | ServiceCard · цена | hover | color | muted → accent-text | 240 | 0 | brand |
| 19 | MasterCard · плита | hover | scale | 1 → 1.03 | 700 | 0 | brand |
| 20 | MasterCard · мета | hover | opacity + y | 0/8 → 1/0 | 240 | 60 | brand |
| 21 | BeforeAfter · ручка | drag | left | — | 0 | 0 | linear |
| 22 | BeforeAfter · метки | drag | opacity | 0.6 → 1 на активной | 120 | 0 | linear |
| 23 | Маркиза | loop | translate3d | 0 → −50% | 48s | 0 | linear |
| 24 | Маркиза · пауза | hover/focus/кнопка | play-state | running → paused | — | 0 | — |
| 25 | Booking · контент шага | смена шага | opacity + y | 0/8 → 1/0 | 240 | 0 | brand |
| 26 | Stepper · прогресс | смена шага | scaleX | prev → next | 420 | 0 | brand |
| 27 | Summary · значение | изменение | opacity | 0.4 → 1 | 240 | 0 | brand |
| 28 | Toast | show / hide | opacity + y | 0/12 → 1/0 | 240 / 180 | 0 | brand |
| 29 | TopBar · фон | scroll > 40 | background-color | transparent → ink | 240 | 0 | linear |
| 30 | Прогресс страницы | scroll | scaleX | 0 → 1 | 0 | 0 | linear |

**Stagger:** 40–70 мс. Больше 90 мс — очередь воспринимается как лаг.
**Правило прерывания:** hover-переходы прерываются без отката (новое значение стартует от текущего). Reveal-анимации не прерываются — досчитываются.

### 6.1 `prefers-reduced-motion: reduce`

| Что было | Что становится |
| --- | --- |
| Intro (900 мс) | Не рендерится. Сразу Hero в финальном состоянии |
| Hero · слова, eyebrow, CTA | Все элементы статичны, `opacity: 1`, `translateY: 0` |
| Скролл-связка орба | Орб статичен: фиксированный масштаб 1, без параллакса |
| 3D-сцена | Полностью заменяется CSS-градиентом (§7.6) |
| Курсор-фонарь | Не создаётся в DOM |
| MagneticCTA | Кнопка не смещается, hover = смена цвета |
| Manifesto · пословное | Весь текст сразу `opacity: 1` |
| ServiceCard · стек | Sticky сохраняется (это layout), scale/opacity фиксированы 1 |
| BeforeAfter | Работает (это управление, не декор), но без `scale` ручки |
| Маркиза | Останавливается, превращается в горизонтальный скролл с snap и видимой полосой |
| Смена шага booking | Без `y`, только `opacity` 120 мс |
| Все переходы цвета | Сохраняются (не считаются motion) |

Дополнительно: `scroll-behavior: auto` вместо `smooth`; Lenis не инициализируется.

---

## 7. 3D-объект: жемчужина

Один объект на всю страницу, только в Hero. Всё остальное — CSS.

### 7.1 Геометрия

| Параметр | Значение |
| --- | --- |
| База | `icosahedronGeometry` radius **1.35**, detail **20** (≈ 8 800 трис; на мобиле detail 12 ≈ 3 400) |
| Дисторсия | вершинный шейдер: смещение по нормали на `noise(p * 1.8 + t * 0.15) * 0.06` |
| Форма | почти сфера, «капля» только за счёт освещения — геометрию не вытягивать |
| Сегментация UV | не нужна, шейдер объектный |

### 7.2 Материал

`MeshTransmissionMaterial` (drei), параметры:

| Параметр | Desktop | Mobile |
| --- | --- | --- |
| `transmission` | 1 | 1 |
| `thickness` | 1.6 | 1.4 |
| `roughness` | 0.18 | 0.22 |
| `ior` | 1.48 | 1.48 |
| `chromaticAberration` | 0.35 | 0.2 |
| `anisotropicBlur` | 0.4 | 0.2 |
| `distortion` | 0.35 | 0.3 |
| `distortionScale` | 0.6 | 0.6 |
| `temporalDistortion` | 0.15 | 0.1 |
| `attenuationDistance` | 2.6 | 2.6 |
| `attenuationColor` | `#f4efe7` | `#f4efe7` |
| `iridescence` | 1 | 0.85 |
| `iridescenceIOR` | 1.35 | 1.35 |
| `iridescenceThicknessRange` | `[120, 520]` | `[120, 520]` |
| `clearcoat` | 1 | 1 |
| `clearcoatRoughness` | 0.25 | 0.3 |
| `samples` | 4 | 2 |
| `resolution` | 512 | 256 |

Запрещено: `metalness > 0`, эмиссия, `envMap` из внешнего HDR.

### 7.3 Свет

`<Environment resolution={256}>` c `Lightformer`, фон сцены прозрачный.

| Источник | Позиция | Цвет | Интенсивность | Размер |
| --- | --- | --- | --- | --- |
| Тёплый ключевой | `[-3, 2, 3]` | `#e8794a` | 2.4 | 3×3 |
| Молочный заполняющий | `[2.5, 1, -3]` | `#f4efe7` | 1.6 | 4×4 |
| Перламутровый контровой | `[0, -2, -4]` | `#e8e1f0` | 0.9 | 2×5 |
| Ambient | — | `#181016` | 0.12 | — |

Пыль: `Sparkles` count 120, scale `[6, 14]`, size 1.5–2.6, speed 0.25, opacity 0.35, color `#f4efe7`. На мобиле count 50, opacity 0.25.

### 7.4 Камера и размеры

`fov 32`, `near 0.1`, `far 20`. Canvas — весь hero (`position:absolute; inset:0`), `pointer-events:none` (указатель ловит секция).

| Вьюпорт | Distance | Orb scale | Смещение X (units) | Смещение Y | Видимый Ø (% высоты / px) |
| --- | --- | --- | --- | --- | --- |
| 360×800 | 9.0 | 0.62 | 0 | +0.75 | 32% / 260 |
| 768×1024 | 7.6 | 0.62 | 0 | +0.55 | 38% / 390 |
| 1024×768 | 6.6 | 0.95 | +1.10 | +0.10 | 67% / 516 |
| 1440×900 | 6.2 | 1.0 | +1.35 | 0 | 78% / 700 |
| 1920×1080 | 6.2 | 1.0 | +1.50 | 0 | 76% / 820 |

### 7.5 Поведение

| Вход | Реакция |
| --- | --- |
| Idle | Вращение `0.06 rad/s` вокруг Y, лёгкое покачивание X `±0.02 rad` (период 11s) |
| Курсор | `rotation.x += (pointerY * 0.12 − rx) * 0.05`, `rotation.y += (pointerX * 0.18 − ry) * 0.05` |
| Скролл hero | `scale 1 → 0.82`, `position.y 0 → −0.25` за 100svh |
| Уход из вьюпорта | `frameloop` останавливается (`IntersectionObserver`), сцена не тикает |
| `visibilitychange` | Пауза рендера |
| Первый кадр | `opacity 0 → 1` за 700ms после готовности текстуры (не дольше 1.2s; если дольше — показать фолбэк) |

Бюджет: `dpr={[1, 1.75]}`, chunk со сценой ≤ 350 KB gzip, ~60 fps на MacBook Air M1. Динамический импорт сцены после первого кадра.

### 7.6 Фолбэк (обязателен)

Условия: нет WebGL, `prefers-reduced-motion`, ошибка инициализации, первая загрузка на `saveData`/2G.

CSS-замена — круг диаметром как в таблице §7.4:

```css
.orb-fallback {
  border-radius: 50%;
  background:
    radial-gradient(38% 38% at 34% 28%, #fdf8f2 0%, rgba(232, 225, 240, 0.9) 22%,
                    rgba(232, 121, 74, 0.35) 46%, transparent 68%),
    radial-gradient(60% 60% at 68% 72%, #e8e1f0 0%, rgba(232, 225, 240, 0.22) 40%, transparent 70%),
    radial-gradient(circle at 50% 50%, #181016 0%, #0b0809 72%);
  filter: blur(1.5px) saturate(1.1);
  box-shadow: inset 0 0 80px rgba(232, 121, 74, 0.12);
}
```

Плюс зерно 3.5% поверх. Фолбэк не анимируется (допустим только `opacity` при появлении).

---

## 8. Изображения

Фото нет. Стоки запрещены. Весь визуальный контент — CSS/canvas-артефакты в стиле бренда. Пропорции и кроп заданы компонентами (§4).

### 8.1 Общий рецепт

Каждый артефакт = **фон** + 2–3 градиентных слоя + **зерно 6%** + **одна волосяная линия**. Никаких мягких «стеклянных» бликов, никаких скруглений.

Базовый слой для тёмных плит: `background: #181016` (plum) или `#0b0809`.

### 8.2 `plate-pearl` — медиа услуг

```css
.plate-pearl {
  background:
    radial-gradient(46% 46% at 30% 24%, rgba(244,239,231,0.55), transparent 62%),
    conic-gradient(from 210deg at 62% 58%,
      rgba(232,121,74,0.30) 0deg,
      rgba(232,225,240,0.42) 90deg,
      rgba(24,16,22,0) 165deg,
      rgba(244,239,231,0.20) 245deg,
      rgba(232,121,74,0.18) 330deg,
      rgba(232,121,74,0.30) 360deg),
    linear-gradient(160deg, #1c141a 0%, #0b0809 100%);
  filter: blur(0.5px) saturate(1.05);
}
```
Поверх — зерно 6% и внутренняя рамка `inset 0 0 0 1px rgba(244,239,231,0.10)`.
Вариация между 6 услугами: только сдвиг центра градиента (`at 30%/70%/50%`) и поворот conic на ±40°. Цвет не меняется.

### 8.3 `plate-tone` — до/после

**До** (приглушённое, холодное):
```css
.plate-tone--before {
  background:
    radial-gradient(58% 44% at 50% 32%, #5b4a44 0%, rgba(42,30,37,0.9) 46%, #0b0809 100%),
    linear-gradient(200deg, rgba(24,16,22,0.2), #0b0809);
}
```
**После** (тёплое, свет):
```css
.plate-tone--after {
  background:
    radial-gradient(58% 44% at 50% 32%, rgba(244,239,231,0.85) 0%, rgba(232,121,74,0.35) 38%, transparent 76%),
    radial-gradient(80% 80% at 30% 80%, rgba(232,225,240,0.18), transparent 60%),
    linear-gradient(180deg, #1a1218 0%, #0b0809 100%);
}
```
Геометрия пятна у обеих плит одна: центр `50% 32%`, радиусы `58% 44%`. Меняются только свет и температура — иначе сравнение не читается.

### 8.4 `plate-figure` — мастера

- Фон: `linear-gradient(180deg, #1b1319 0%, #0b0809 100%)`.
- Силуэт: эллипс `radial-gradient(closest-side at 50% 38%, rgba(244,239,231,0.16), transparent 78%)`, ширина 46% плиты, высота 62% — размытое «плечо».
- Горизонт: `1px solid rgba(244,239,231,0.14)` на 72% высоты, полная ширина.
- Поверх: зерно 6%, `mix-blend-mode: soft-light`.
- Различие мастеров: сдвиг света (центр эллипса 38%/46%/54%/62%), не оттенок.

### 8.5 `plate-paper` — деталь бумажных секций

- Фон `#f4efe7`, тонкая сетка: `repeating-linear-gradient(0deg, rgba(11,8,9,0.05) 0 1px, transparent 1px 24px)` + то же по X.
- Один круг-«штамп»: `border: 1px solid rgba(11,8,9,0.24)`, Ø 120, в правом верхнем углу, `rotate(-8deg)`, внутри `micro` «VESPERA · MOSCOW».
- Зерно 4% `multiply`.

### 8.6 Если появятся настоящие фото

- Только собственная съёмка, один свет, средний план, без улыбок в объектив.
- Обработка: `filter: grayscale(0.85) contrast(1.06) brightness(1.02)`, `mix-blend-mode: luminosity` над `plum`, сверху `rgba(232,121,74,0.06)`.
- Кроп: `object-fit: cover`, `object-position: 50% 32%` для портретов, `50% 50%` для макро.
- Форматы: `avif` + `webp`, `sizes` по брейкпоинтам, `priority` только для первого кадра hero (если фото появится).
- Тени и виньетки не накладывать — глубину даёт фон.

### 8.7 Пропорции

| Место | Ratio | Мин. ширина |
| --- | --- | --- |
| Медиа услуги (десктоп) | 34% ширины карточки × 100% высоты | 320 |
| Медиа услуги (мобайл) | 16:7 (лента 140) | 100% |
| Мастер | 3:4 | 248 |
| До/после | 5:4 (≥768) / 4:5 (<768) | 320 |
| Манифест-врезка | без изображения | — |

---

## 9. Доступность

### 9.1 Контраст (посчитано, WCAG 2.1)

| Пара | Ratio | Норма | Где |
| --- | --- | --- | --- |
| `#F4EFE7` на `#0B0809` | **17.43** | AA/AAA | body на тёмном |
| `#DED3C4` на `#0B0809` | **13.51** | AA/AAA | вторичный текст |
| `#8A8279` на `#0B0809` | **5.27** | AA | `text-muted` |
| `#8A8279` на `#181016` | **4.94** | AA | muted на карточке |
| `#E8794A` на `#0B0809` | **6.90** | AA | `accent-text`, цифры |
| `#0B0809` на `#E8794A` | **6.90** | AA | текст на primary |
| `#F4EFE7` на `#181016` | **16.32** | AA/AAA | текст на поверхности |
| `#0B0809` на `#F4EFE7` | **17.43** | AA/AAA | текст на бумаге |
| `#5A5754` на `#F4EFE7` | **6.27** | AA | muted на бумаге |
| `#5A5754` на `#EAE3D8` | **5.63** | AA | muted на paper-surface |
| `#A6431E` на `#F4EFE7` | **5.33** | AA | accent на бумаге |
| `#0B0809` на `#EAE3D8` | **15.65** | AA/AAA | текст на paper-surface |
| `rgb(244 239 231 / .14)` на `#0B0809` | 1.37 | — | **только декор** |
| `rgb(244 239 231 / .40)` на `#0B0809` | **3.41** | 1.4.11 | границы полей |
| `rgb(11 8 9 / .48)` на `#F4EFE7` | **3.42** | 1.4.11 | границы полей на бумаге |
| `#F4EFE7` на `#E8794A` | 2.53 | ✗ | **запрещено** (белый текст на ember) |

Зафиксировано: молочный текст на ember-кнопке не использовать никогда — только ink.

### 9.2 Фокус

- Единый стиль: `outline: 2px solid var(--color-focus); outline-offset: 3px; border-radius: inherit`.
- На тёмном `focus` = `ember` (6.90:1), на бумаге = `ember-deep` (5.33:1). На ember-заливке — `milk`/`ink` с offset 3.
- Никаких `box-shadow`-рингов: только `outline` (работает в forced-colors).
- Порядок табуляции = визуальный. Карточки услуг/мастеров/ритуалов — `<a>`/`<button>`, не `<div onclick>`.
- При `:focus-visible` на sticky-карточке — поднять её (`z-index`), чтобы кольцо не срезалось соседом.

### 9.3 Тач-таргеты

| Элемент | Размер |
| --- | --- |
| Кнопки | 48 (lg 56) |
| Пилюли слотов | 48 высота |
| Ячейка календаря | 44×44 |
| Ручка before/after | 44×44 |
| Кнопки навигации календаря/галереи | 44×44 |
| Ссылки в футере | 44 по высоте (`padding-block: 12`) |
| Чекбокс согласия | 24 визуально + 44 hit-area через `<label>` |
| Минимальный зазор между таргетами | 8 |

### 9.4 ARIA и клавиатура

**Форма записи**
- `<form noValidate>`; каждая группа — `<fieldset>` + `<legend class="micro">` (визуально = заголовок шага).
- Поля: `<label for>`, `aria-invalid="true"` при ошибке, `aria-describedby` на текст ошибки, ошибка в контейнере `role="alert"` (только после первой попытки).
- `aria-required="true"` у имени и телефона; согласие — нативный `checkbox` + `required`.
- Кнопка отправки: `aria-busy` во время запроса, `disabled` не используется (оставляем фокус).
- Смена шага: фокус на `<h3 tabindex="-1">` шага, объявление через `<p aria-live="polite" class="sr-only">Шаг 2 из 4. Мастер.</p>`.
- Слоты: `<div role="group" aria-labelledby>` на каждую группу, кнопки с `aria-pressed`.
- Итог: `aria-live="polite"` на блоке «Итого» — при смене услуги цена озвучивается.
- Успех: `role="status"` + фокус на заголовке. Код продублирован текстом (не только визуально).
- Honeypot: `aria-hidden="true"`, `tabindex="-1"`, `autocomplete="off"`.

**Before/After**
- Контейнер: `role="group"` + `aria-roledescription="сравнение до и после"`.
- Ручка: `role="slider"`, `tabindex="0"`, `aria-label="Позиция сравнения: до и после"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow`, `aria-valuetext="42 процента: до"`.
- Клавиши: `←/→` ±2, `Shift+←/→` ±10, `Home` 0, `End` 100, `PageUp/PageDown` ±25.
- Само изображение: `role="img"` + `aria-label`, декоративные слои `aria-hidden`.

**Маркиза**
- `role="region" aria-label="Отзывы"`; дубль контента `aria-hidden="true"`.
- Кнопка «Пауза»/«Продолжить» с `aria-pressed` — обязательна (2.2.2).
- Фокус внутри останавливает ленту.

**Общее**
- `lang="ru"`, `<main>`, один `<h1>` (hero), секции — `<section aria-labelledby>`. У манифеста визуальный уровень `h1`, но семантически это `<p class="text-h1">`: `<h1>` на странице один.
- Скрытый текст: класс `.sr-only` (не `display:none`).
- Иконки-стрелки — `aria-hidden="true"`, смысл в тексте.
- `forced-colors: active` — не отключать границы, полагаться на системные цвета.

---

## 10. Чек-лист приёмки дизайна

1. В `globals.css` нет ни одного hex вне `@theme`; в компонентах нет палитровых классов (`bg-ink`, `text-plum`) — только семантические.
2. Радиусы: 2px у карточек/полей/кнопок, `999px` только у тегов. Ни одного `rounded-lg` и выше.
3. Нет `box-shadow` нигде, кроме 3D/фолбэка. Глубина — линии и поверхности.
4. Один акцент. `ember` в кадре ≤ 7% площади; белого текста на ember нет (проверить кнопку «Записаться»).
5. Типографика: ровно 10 уровней из §2.1; body ≤ 34rem; h2 ≤ 18ch; `tabular-nums` на всех числах.
6. Переносы: hero — три строки вручную на всех ширинах; h2 — не более 3 строк на 360 и 1440.
7. Сетка: 4/8/12 колонок, поля 20/38/51/72/80, `column-gap` 16/24. Горизонтального скролла нет на 360/768/1024/1440/1920.
8. Sticky-стек услуг: 6 карточек, top 112 + 18·i, scale/opacity по depth, на `<768` выключен.
9. Курсор-фонарь и магнитные кнопки не работают на touch; смещение CTA ≤ 8px; фокус-кольцо не смещается.
10. `prefers-reduced-motion`: нет интро, нет 3D (фолбэк), нет маркизы-анимации, нет параллакса — проверено через DevTools emulation.
11. Фокус виден на каждом интерактивном элементе на обеих темах; контраст кольца ≥ 3:1.
12. Форма: все поля с label, ошибки связаны `aria-describedby`, шаги объявляются, honeypot скрыт и недоступен с клавиатуры.
13. Before/after: ручка 44×44, `role="slider"`, стрелки/Shift/Home/End работают, `aria-valuetext` в процентах.
14. Маркиза: пауза на hover, на focus и кнопкой; дубль `aria-hidden`.
15. Зерно: 3–4%, `pointer-events: none`, не накрывает тосты и не анимируется. Изображений-стоков и битых `img` нет.
16. Цифры и цены не переносятся на две строки; слово «₽» приклеено к числу `nowrap`.
17. На 1920 контент стоит на 1440 по центру, поля ≥ 80, типографика на clamp-максимумах, а не «растянута».
