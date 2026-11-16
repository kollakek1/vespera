# Админ-панель VESPERA — контракт API

Серверная часть админки: вход по паролю, календарь месяца, список броней,
смена статусов и ручная запись. Никакой внешней БД и сервисов — данные лежат в
`data/bookings.json`, логика — в `src/lib/booking.ts` и `src/lib/admin-api.ts`.

- Базовый префикс: `/api/admin`
- Формат: JSON, `Content-Type: application/json`
- Часовой пояс: `Europe/Moscow` (UTC+3 круглый год)
- Все ответы — с `cache-control: no-store`
- Авторизация: HttpOnly cookie `vespera_admin`, проверяется в каждом роуте
  (`requireAdmin`), middleware/Proxy не используется

## Переменные окружения

Файл `.env.local` в корне проекта (в git не попадает: `.gitignore → .env*`):

| Переменная | Назначение | Требование |
| --- | --- | --- |
| `ADMIN_EMAIL` | email первого владельца | по умолчанию `admin@vespera.studio` |
| `ADMIN_PASSWORD` | пароль первого владельца (только bootstrap) | минимум 12 символов |
| `ADMIN_SESSION_SECRET` | ключ подписи cookie (HMAC-SHA256) | минимум 16 символов |

Если `ADMIN_SESSION_SECRET` нет или он короче — **fail closed**: админ-роуты отвечают
`500 not_configured` с понятным текстом, а сайт и публичная запись работают как обычно.
Смена `ADMIN_SESSION_SECRET` разлогинивает всех администраторов.
После правки `.env.local` сервер нужно перезапустить.

Администраторов может быть несколько, у каждого свой пароль и роль. Владелец создаётся
из `ADMIN_EMAIL`/`ADMIN_PASSWORD` один раз, дальше переменные не используются.
Подробности, роли и управление — `docs/admins.md`.

---

## POST /api/admin/auth — вход

```bash
curl -i -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vespera.studio","password":"<пароль>"}'
```

`email` можно не передавать — тогда ищется владелец по `ADMIN_EMAIL`
(старая форма из одного поля продолжает работать).

**200** — cookie выставлена:

```
HTTP/1.1 200 OK
set-cookie: vespera_admin=eyJzdWIiOiJhZG0tazNtOXgycXAiLCJyb2xlIjoib3duZXIiLCJleHAiOjE3OTUzNTkzNTR9.2xmDuqK7...; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800
```

```json
{
  "ok": true,
  "authenticated": true,
  "expiresAt": "2026-11-22T14:55:54.808Z",
  "admin": { "id": "adm-k3m9x2qp", "email": "admin@vespera.studio", "name": "Владелец", "role": "owner" }
}
```

Свойства cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=604800` (7 дней),
`Secure` добавляется в production. Значение — `base64url(payload).base64url(hmac)`,
payload: `{ "sub": "<adminId>", "role": "owner|manager", "email": "…", "exp": <unix-секунды> }`.
Старые cookie без `sub` недействительны — нужно войти заново.

**401** — неверный пароль. Деталей нет ни при пустом, ни при неверном пароле:

```json
{ "ok": false, "error": "unauthorized", "message": "Неверный пароль" }
```

**429** — больше 5 попыток с одного IP за 10 минут (заголовок `Retry-After` в секундах):

```json
{
  "ok": false,
  "error": "rate_limited",
  "message": "Слишком много попыток входа. Попробуйте через 9 мин.",
  "details": { "retryAfterSec": 512 }
}
```

**500** — не настроены env:

```json
{
  "ok": false,
  "error": "not_configured",
  "message": "Админка не настроена: ADMIN_SESSION_SECRET не задан или короче 16 символов. Добавьте ADMIN_PASSWORD и ADMIN_SESSION_SECRET в .env.local и перезапустите сервер"
}
```

## GET /api/admin/auth — проверка сессии

```bash
curl http://localhost:3000/api/admin/auth -b cookies.txt
```

```json
{
  "authenticated": true,
  "admin": { "id": "adm-k3m9x2qp", "email": "admin@vespera.studio", "name": "Владелец", "role": "owner" }
}
```

Без cookie, с истёкшей подписью или с отозванным доступом —
`{ "authenticated": false, "admin": null }` (`200`), без `401`.
Это единственный админ-роут, который отвечает `200` без сессии: интерфейсу нужно
понимать, показывать форму входа или кабинет.

## DELETE /api/admin/auth — выход

```bash
curl -X DELETE http://localhost:3000/api/admin/auth -b cookies.txt
```

```
set-cookie: vespera_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0
```

```json
{ "ok": true, "authenticated": false }
```

Все остальные роуты ниже без валидной cookie отвечают `401`:

```json
{ "ok": false, "error": "unauthorized", "message": "Требуется вход в админку" }
```

---

## GET /api/admin/bookings — список за диапазон

| Параметр | Обяз. | Значение |
| --- | --- | --- |
| `from` | да | `YYYY-MM-DD`, включительно |
| `to` | да | `YYYY-MM-DD`, включительно |
| `masterId` | нет | `all` (по умолчанию) или `id`/`slug` мастера |
| `status` | нет | `all` (по умолчанию), `confirmed`, `completed`, `cancelled`, `no_show` |

Максимум — **62 дня включительно**. Больше, перевёрнутый диапазон или битые даты → `400`.

```bash
curl "http://localhost:3000/api/admin/bookings?from=2026-11-18&to=2026-11-18" -b cookies.txt
```

```json
{
  "ok": true,
  "from": "2026-11-18",
  "to": "2026-11-18",
  "masterId": "all",
  "status": "all",
  "timezone": "Europe/Moscow",
  "bookings": [
    {
      "code": "VSP-GTWK",
      "status": "confirmed",
      "date": "2026-11-18",
      "time": "18:00",
      "durationMin": 75,
      "priceRub": 9500,
      "name": "Гостья",
      "phone": "+79031112233",
      "email": "guest@example.com",
      "comment": "тест",
      "note": null,
      "createdBy": "public",
      "createdAt": "2026-11-15T14:55:55.121Z",
      "service": { "id": "svc-makeup", "slug": "light-and-shadow", "name": "Свет и тень" },
      "master": {
        "id": "ms-eva",
        "slug": "eva-kim",
        "name": "Ева Ким",
        "role": "макияж, свет"
      },
      "history": [{ "at": "2026-11-15T14:55:55.121Z", "status": "confirmed", "by": "public" }]
    }
  ],
  "summary": {
    "total": 1,
    "byStatus": { "confirmed": 1, "completed": 0, "cancelled": 0, "no_show": 0 },
    "revenueRub": 9500
  },
  "masters": [
    { "id": "ms-alisa", "slug": "alisa-vetrova", "name": "Алиса Ветрова" },
    { "id": "ms-marina", "slug": "marina-dorn", "name": "Марина Дорн" },
    { "id": "ms-timur", "slug": "timur-aslanov", "name": "Тимур Асланов" },
    { "id": "ms-eva", "slug": "eva-kim", "name": "Ева Ким" }
  ]
}
```

Правила ответа:

- сортировка — по дате, затем по времени, затем по коду;
- `summary.total` — все брони периода после фильтров (включая отменённые);
- `summary.revenueRub` — только `confirmed` + `completed` (по `priceRub` записи);
- `phone` — целиком, без маски: это админский роут;
- в списке та же полная карточка, что и в детали (включая `history`) — один тип на все экраны.

**400** — параметры:

```json
{ "ok": false, "error": "invalid_request", "message": "Диапазон не длиннее 62 дней. Выберите меньший период" }
```

`unknown_master` — если `masterId` не из справочника.

---

## GET /api/admin/calendar — сетка месяца

| Параметр | Обяз. | Значение |
| --- | --- | --- |
| `month` | да | `YYYY-MM`, например `2026-11` |
| `masterId` | нет | `all` (по умолчанию) или `id`/`slug` мастера |

```bash
curl "http://localhost:3000/api/admin/calendar?month=2026-11&masterId=all" -b cookies.txt
```

```json
{
  "ok": true,
  "month": "2026-11",
  "masterId": "all",
  "timezone": "Europe/Moscow",
  "days": [
    {
      "date": "2026-11-20",
      "weekday": 5,
      "isWorkingDay": true,
      "bookingsCount": 1,
      "cancelledCount": 1,
      "loadPercent": 13,
      "revenueRub": 9500,
      "mastersOnDuty": [{ "id": "ms-eva", "slug": "eva-kim", "name": "Ева Ким" }]
    }
  ],
  "summary": {
    "total": 3,
    "byStatus": { "confirmed": 1, "completed": 0, "cancelled": 1, "no_show": 1 },
    "revenueRub": 9500,
    "workingDays": 30,
    "loadPercent": 0
  },
  "masters": [
    { "id": "ms-alisa", "slug": "alisa-vetrova", "name": "Алиса Ветрова" }
  ]
}
```

Как считаются поля дня:

| Поле | Формула |
| --- | --- |
| `weekday` | `0` — воскресенье … `6` — суббота |
| `mastersOnDuty` | мастера (с учётом фильтра), у которых этот день недели рабочий; массив `{id, slug, name}` |
| `isWorkingDay` | `mastersOnDuty.length > 0` |
| `bookingsCount` | брони дня со статусом `confirmed` + `completed` |
| `cancelledCount` | отменённые брони дня (отдельно, чтобы не искажать загрузку) |
| `loadPercent` | `занятые минуты / (600 × mastersOnDuty.length) × 100`, округление, потолок 100 |
| `revenueRub` | сумма `priceRub` по `confirmed` + `completed` |

`summary` за месяц: `total` и `byStatus` — все брони месяца после фильтра,
`revenueRub` — по визитам, `workingDays` — сколько дней месяца имеют смену,
`loadPercent` — занятые минуты / доступные минуты месяца (тоже `600 × смены`).
`no_show` в нагрузку и выручку не входит.

`days` всегда содержит все календарные дни месяца (28–31), в порядке возрастания.

**400** — `Месяц в формате YYYY-MM, например 2026-11` или `unknown_master`.

---

## GET /api/admin/bookings/{code} — карточка брони

```bash
curl http://localhost:3000/api/admin/bookings/VSP-GTWK -b cookies.txt
```

```json
{
  "ok": true,
  "timezone": "Europe/Moscow",
  "booking": {
    "code": "VSP-GTWK",
    "status": "completed",
    "date": "2026-11-18",
    "time": "18:00",
    "durationMin": 75,
    "priceRub": 9500,
    "name": "Гостья",
    "phone": "+79031112233",
    "email": "guest@example.com",
    "comment": "тест",
    "note": "Пришла вовремя",
    "createdBy": "public",
    "createdAt": "2026-11-15T14:55:55.121Z",
    "service": { "id": "svc-makeup", "slug": "light-and-shadow", "name": "Свет и тень" },
    "master": {
      "id": "ms-eva",
      "slug": "eva-kim",
      "name": "Ева Ким",
      "role": "макияж, свет"
    },
    "history": [
      { "at": "2026-11-15T14:55:55.121Z", "status": "confirmed", "by": "public" },
      { "at": "2026-11-15T14:55:57.576Z", "status": "completed", "by": "admin" }
    ]
  }
}
```

- `400` — код не похож на `VSP-XXXX`;
- `404` — `{ "ok": false, "error": "not_found", "message": "Бронь с таким кодом не найдена" }`.

---

## PATCH /api/admin/bookings/{code} — статус и заметка

```bash
curl -X PATCH http://localhost:3000/api/admin/bookings/VSP-GTWK \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"status":"completed","note":"Пришла вовремя"}'
```

| Поле | Обяз. | Значение |
| --- | --- | --- |
| `status` | да | `confirmed`, `completed`, `cancelled`, `no_show` |
| `note` | нет | строка ≤ 1000; `null` — стереть; не передано — не менять |

**200** — возвращается полная карточка (как в разделе выше), в `history` добавляется
строка `{ at, status, by: "admin" }`. Если статус не изменился (правили только заметку),
история не растёт.

**400** — недопустимый переход:

```json
{
  "ok": false,
  "error": "invalid_transition",
  "message": "Нельзя перевести бронь из статуса «завершена» в «отменена»"
}
```

**404** — неизвестный код.

**409** — возврат в `confirmed`, когда слот уже заняли (`cancelled → confirmed` или
`no_show → confirmed`). Сначала нужно отменить чужую бронь:

```json
{
  "ok": false,
  "error": "slot_taken",
  "message": "Это время уже занято другой бронью: сначала отмените её"
}
```

### Модель статусов

| Статус | Значит | Занимает слот | В выручке |
| --- | --- | --- | --- |
| `confirmed` | запись действует | **да** | да |
| `completed` | визит состоялся | нет (время прошло) | да |
| `cancelled` | отменена | нет | нет |
| `no_show` | гость не пришёл | нет | нет |

Разрешённые переходы (плюс «тот же статус» — no-op):

```
confirmed → completed | cancelled | no_show
completed → confirmed          (исправить ошибочную отметку, слот проверяется)
no_show   → confirmed          (гость всё-таки пришёл, слот проверяется)
cancelled → confirmed          (ошибочная отмена, слот проверяется)
cancelled → completed/no_show  — запрещено (визита не было)
```

Отмена **освобождает слот**: публичная `GET /api/booking/availability` учитывает
только `confirmed`. То же для `no_show` и `completed`. Это проверено и на записях
старого формата (до появления админки).

---

## POST /api/admin/bookings — ручная запись

Телефонный звонок или walk-in. Поля те же, что у публичной записи, плюс два админских.

```bash
curl -X POST http://localhost:3000/api/admin/bookings \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{
    "serviceId": "svc-makeup",
    "masterId": "ms-eva",
    "date": "2026-11-15",
    "time": "18:30",
    "name": "Walk-in",
    "phone": "+7 916 777-88-99",
    "source": "admin",
    "note": "Записали по телефону"
  }'
```

| Поле | Обяз. | Правила |
| --- | --- | --- |
| `serviceId`, `masterId` | да | `id` или `slug` |
| `date`, `time` | да | `YYYY-MM-DD`, `HH:mm` |
| `name`, `phone` | да | как в публичной записи, телефон нормализуется к `+7XXXXXXXXXX` |
| `email`, `comment` | нет | как в публичной записи |
| `source` | нет | если передано — только `"admin"` |
| `note` | нет | ≤ 1000 символов |

Отличия от публичной записи:

- **лид-тайм 2 часа не действует** — можно записать «на сейчас»;
- с админской cookie публичный `GET /api/booking/availability` тоже показывает слоты
  ближе двух часов: форма ручной записи и API не расходятся;
- прошедшее время по-прежнему запрещено (`slot_in_past`, «Это время уже прошло»);
- цена и длительность берутся из справочника, а не из тела;
- в записи `createdBy: "admin"`, `history[0].by = "admin"`, заметка сохраняется.

**201:**

```json
{
  "ok": true,
  "code": "VSP-XYAQ",
  "booking": {
    "code": "VSP-XYAQ",
    "status": "confirmed",
    "date": "2026-11-15",
    "time": "18:30",
    "durationMin": 75,
    "priceRub": 9500,
    "name": "Walk-in",
    "phone": "+79167778899",
    "email": null,
    "comment": null,
    "note": "Записали по телефону",
    "createdBy": "admin",
    "createdAt": "2026-11-15T14:56:01.204Z",
    "service": { "id": "svc-makeup", "slug": "light-and-shadow", "name": "Свет и тень" },
    "master": { "id": "ms-eva", "slug": "eva-kim", "name": "Ева Ким", "role": "макияж, свет" },
    "history": [{ "at": "2026-11-15T14:56:01.204Z", "status": "confirmed", "by": "admin" }]
  }
}
```

**400** — `invalid_slot` (вне окна 12:00–22:00 или не по сетке 30 минут), `slot_in_past`
(время прошло), `unknown_service`, `unknown_master`, `day_off`, `master_not_assigned`.
**409** — `slot_taken`. **413** — тело больше 32 КБ.

---

## Модель данных

`data/bookings.json` расширен обратно совместимо:

```json
{
  "version": 1,
  "bookings": [
    {
      "code": "VSP-GTWK",
      "status": "confirmed",
      "serviceId": "svc-makeup",
      "masterId": "ms-eva",
      "date": "2026-11-18",
      "time": "18:00",
      "durationMin": 75,
      "priceRub": 9500,
      "name": "Гостья",
      "phone": "+79031112233",
      "email": "guest@example.com",
      "comment": "тест",
      "createdAt": "2026-11-15T14:55:55.121Z",
      "note": null,
      "createdBy": "public",
      "history": [{ "at": "2026-11-15T14:55:55.121Z", "status": "confirmed", "by": "public" }]
    }
  ]
}
```

Новые поля: `note` (`string | null`), `createdBy` (`"public" | "admin"`),
`history` (`{ at, status, by }[]`, `by` — `"public" | "admin"`).

**Старые записи читаются.** При чтении `booking-store` нормализует их:
`note → null`, `createdBy → "public"`, `history → [{ at: createdAt, status, by: "public" }]`.
Файл перезапишется в новом формате при первой же мутации.

Публичный `GET /api/booking/{code}` **не отдаёт** `note` и `history`
(и не отдаёт `email`/`comment`), телефон по-прежнему замаскирован.

## Ограничения

- Пароль один, без ролей и без «пользователей». Логина нет.
- Throttle логина — in-memory, 5/10 минут на IP; сбрасывается при перезапуске.
  IP берётся из `X-Forwarded-For` / `X-Real-IP`, поэтому нужен доверенный прокси.
- CSRF: cookie `SameSite=Lax` + отсутствие CORS-разрешений на админ-роуты. Никаких
  cross-site POST/PATCH с cookie браузер не отправит.
- Запись в файл — та же, что у публичной: in-process mutex, атомарный `rename`,
  бэкап `.bak`, fail-safe чтение.
- Диапазон списка — 62 дня; для больших периодов UI должен листать месяцами.
- `completed`/`no_show` не занимают слот: если отметить будущую бронь как завершённую,
  её время снова станет доступным публично. Это осознанное поведение модели.

## Очистка тестовых данных

```bash
rm -rf data/bookings.json data/bookings.json.bak
```

```powershell
Remove-Item data/bookings.json, data/bookings.json.bak -ErrorAction SilentlyContinue
```

Каталог `data/` вернётся сам при первой записи. Для изолированных прогонов можно
увести хранилище в другое место:

```bash
VESPERA_DATA_DIR=.tmp-admin-e2e npm run dev
```

---

## Каталог услуг и мастеров

Услуги и мастера редактируются отдельным набором роутов `/api/admin/studio/**`:
создание, правка и удаление. Удаление физическое, история броней сохраняется снапшотами
названий. Контракт, конфликты и сброс к дефолтам — `docs/studio-management.md`.

## Администраторы и роли

Список администраторов, роли `owner`/`manager`, создание, правка, деактивация и пароли —
`/api/admin/admins/**`. Контракт, гарды и восстановление доступа — `docs/admins.md`.

## Как зайти в админку

- **Адрес:** `/admin`
- **Вход:** email + пароль администратора (первый владелец — `ADMIN_EMAIL`/`ADMIN_PASSWORD`)
- **Ключ сессии:** `ADMIN_SESSION_SECRET` в `.env.local` (hex, 64 символа)
- **Срок сессии:** 7 дней, затем нужно войти заново
- Локально: `npm run dev`, открыть `http://localhost:3000/admin`

Пароль и ключ лежат только в `.env.local` — этот файл в `.gitignore` (`.env*`)
и не должен попадать в репозиторий. Для продакшена сгенерируйте собственную пару
значений и добавьте `Secure` автоматически (уже включён при `NODE_ENV=production`).

> Пароль уже один раз попадал в документацию и в логи сессии, поэтому его
> нужно считать скомпрометированным: сгенерируйте новый `ADMIN_PASSWORD`
> (и при желании новый `ADMIN_SESSION_SECRET`, что разлогинит все сессии).
