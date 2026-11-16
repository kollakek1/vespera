# Администраторы и роли VESPERA

Раньше в админку входили одним паролем из env. Теперь администраторы — это документ
`admins` в слое хранения (файл `data/admins.json` локально, строка `admins` в Postgres
на Vercel), у каждого свой пароль и роль.

- Вход: `POST /api/admin/auth` с `{ email, password }`
- Сессия: HttpOnly cookie `vespera_admin` с HMAC-подписью, 7 дней
- Роли: `owner` (всё, включая администраторов) и `manager` (записи, календарь, каталог)
- Пароли: только scrypt-хэши, открытый пароль не хранится и не логируется

## Модель

```json
{
  "version": 1,
  "updatedAt": "2026-11-16T09:00:00.000Z",
  "admins": [
    {
      "id": "adm-k3m9x2qp",
      "email": "admin@vespera.studio",
      "name": "Владелец",
      "role": "owner",
      "active": true,
      "passwordHash": "scrypt$16384$8$1$<saltB64>$<hashB64>",
      "createdAt": "2026-11-16T09:00:00.000Z",
      "createdBy": null,
      "lastLoginAt": "2026-11-16T09:05:12.000Z"
    }
  ]
}
```

| Поле | Смысл |
| --- | --- |
| `id` | `adm-` + 8 символов, неизменяем |
| `email` | всегда в нижнем регистре, уникален |
| `role` | `owner` или `manager` |
| `active` | `false` = доступ отозван, но запись и аудит остаются |
| `passwordHash` | `scrypt$N$r$p$salt$hash`; параметры в записи, чтобы их можно было поднять позже |
| `createdBy` | `id` создателя; `null` — владелец создан bootstrap'ом |
| `lastLoginAt` | обновляется при каждом успешном входе |

Наружу (`GET /api/admin/admins`, `GET /api/admin/auth`) уходит только `{id, email, name, role,
active, createdAt, createdBy, lastLoginAt}` — без хэша.

## Первый владелец (bootstrap)

Документа нет → при первой попытке входа он создаётся из env:

| Переменная | По умолчанию | Требование |
| --- | --- | --- |
| `ADMIN_EMAIL` | `admin@vespera.studio` | валидный email |
| `ADMIN_PASSWORD` | — | ≥ 12 символов |
| `ADMIN_SESSION_SECRET` | — | ≥ 16 символов, нужен всегда |

```bash
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vespera.studio","password":"<ADMIN_PASSWORD>"}'
```

Владелец создаётся **один раз**. Дальше `ADMIN_PASSWORD` не используется вовсе:
сменить пароль владельца через env нельзя — только через API/`docs/admins.md → восстановление`.
Если `ADMIN_PASSWORD` нет и документа тоже нет — `500 not_configured`.

## Роли

| Действие | owner | manager |
| --- | --- | --- |
| Брони, календарь, ручная запись | ✅ | ✅ |
| Каталог услуг и мастеров | ✅ | ✅ |
| `GET/POST/PATCH/DELETE /api/admin/admins/**` | ✅ | ❌ `403 forbidden` |
| Смена своего пароля | ✅ | ✅ |
| Сброс чужого пароля | ✅ | ❌ `403` |

Роль берётся из документа, а не из токена: понижение применяется в пределах 5 секунд
(см. «Сессия и кэш»).

## Вход

`POST /api/admin/auth` `{ email, password }` → `200` + `set-cookie`:

```json
{
  "ok": true,
  "authenticated": true,
  "expiresAt": "2026-11-23T09:05:12.000Z",
  "admin": { "id": "adm-k3m9x2qp", "email": "admin@vespera.studio", "name": "Владелец", "role": "owner" }
}
```

- `email` можно не передавать — тогда ищем владельца по `ADMIN_EMAIL` (старая однопольная
  форма продолжает работать, пока UI не обновлён).
- Неверная пара, неизвестный email и неактивный админ отвечают одинаково:
  `401 { "error": "unauthorized", "message": "Неверный email или пароль" }`.
  Время ответа выравнивается хэшем-заглушкой, чтобы нельзя было перебирать email по таймингу.
- `429 rate_limited` + `Retry-After`: 5 попыток / 10 минут **на IP** и 5 попыток / 10 минут
  **на пару email**. Успешный вход сбрасывает счётчик email.

`GET /api/admin/auth` → `{ authenticated, admin: {id,email,name,role} | null }`.
`DELETE /api/admin/auth` → сброс cookie.

## Управление администраторами (только owner)

### Список

```bash
curl http://localhost:3000/api/admin/admins -b cookies.txt
```

```json
{ "ok": true, "admins": [ { "id": "adm-k3m9x2qp", "email": "admin@vespera.studio", "name": "Владелец", "role": "owner", "active": true, "createdAt": "…", "createdBy": null, "lastLoginAt": "…" } ] }
```

### Создание

```bash
curl -X POST http://localhost:3000/api/admin/admins \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"email":"marina@vespera.studio","name":"Марина","role":"manager","password":"<не короче 12>"}'
```

`201 { ok: true, admin }`. `role` по умолчанию `manager`; `createdBy` = id владельца.
`409 email_taken` — email уже занят (регистр не важен). `400` — email/имя/пароль не прошли
валидацию (`details.fields`).

### Правка

`PATCH /api/admin/admins/{id}` — `{ name?, email?, role?, active? }`, все поля необязательны,
пустое тело → `400`.

```bash
curl -X PATCH http://localhost:3000/api/admin/admins/adm-k3m9x2qp \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"role":"manager"}'
```

Ошибки:

| Код | Когда |
| --- | --- |
| `404 not_found` | нет такого id |
| `409 email_taken` | новый email уже используется |
| `400 last_owner` | это последний активный владелец, а его понижают или деактивируют |
| `400 self_deactivate` | попытка деактивировать себя |

### Деактивация

`DELETE /api/admin/admins/{id}` — ставит `active: false`, ничего не удаляет.
Те же гарды `last_owner` и `self_deactivate`. Активный админ может вернуться через
`PATCH { "active": true }`.

### Пароли

`POST /api/admin/admins/{id}/password` `{ password, currentPassword? }`.

- **Свой пароль** (`{id}` = текущий админ): `currentPassword` обязателен, иначе `400`.
- **Чужой пароль**: только owner, `currentPassword` не нужен. Manager получит `403`.

```bash
curl -X POST http://localhost:3000/api/admin/admins/adm-k3m9x2qp/password \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"currentPassword":"<старый>","password":"<новый, ≥ 12>"}'
```

После смены старый пароль перестаёт работать (следующий вход → `401`). Уже выданные
сессии другого админа при этом не отзываются — для немедленного отзыва деактивируйте его.

## Пароли: как хранятся

`node:crypto.scrypt` с `N=16384, r=8, p=1`, соль 16 байт, ключ 64 байта, сравнение через
`timingSafeEqual`. Формат `scrypt$N$r$p$saltB64$hashB64` — параметры в самой строке,
поэтому их можно поднять без миграции формата. Пароль нигде не логируется и не возвращается.

Требования: 12–200 символов. Больше ограничений нет (это внутренний инструмент).

## Сессия и кэш

Токен: `base64url({ sub, role, email, exp }).HMAC-SHA256`, 7 дней.

- `sub` — id администратора; `requireAdmin` проверяет, что он **существует и активен**.
- Роль берётся из документа, а не из токена: смена роли применяется в пределах 5 секунд.
- Результат проверки кэшируется на 5 секунд на инстанс. Деактивация отзывает доступ
  почти сразу (≤ 5 c), а не через неделю.
- Испорченный документ `admins` закрывает панель (`500`), а не открывает доступ.
- **Старые cookie** (payload `{ role: "admin" }` без `sub`) недействительны — после
  обновления нужно войти заново. Это ожидаемо.

## Восстановление доступа

Если пароль владельца утерян или документ повреждён:

1. Убедитесь, что в окружении заданы `ADMIN_EMAIL` и `ADMIN_PASSWORD` (≥ 12 символов)
   и `ADMIN_SESSION_SECRET`.
2. Удалите документ администраторов:
   - файлы: `rm data/admins.json data/admins.json.bak`
   - Postgres: `DELETE FROM vespera_documents WHERE name = 'admins';`
3. Войдите с `ADMIN_EMAIL` + `ADMIN_PASSWORD` — владелец создастся заново.
   Остальные администраторы при этом **не восстанавливаются**, их нужно добавить снова.
4. Смените пароль владельца через `POST /api/admin/admins/{id}/password` и уберите
   `ADMIN_PASSWORD` из прод-окружения, если он там больше не нужен (но тогда потеря
   документа снова потребует ручного вмешательства).

Тот же приём — штатный сброс: после удаления документа доступ снова определяется env.

## Vercel и Postgres

Документ живёт в том же слое хранения, что брони и каталог (`docs/storage.md`):
`DATABASE_URL` есть → таблица `vespera_documents`, иначе `data/admins.json`.
На Vercel ФС только для чтения, поэтому база обязательна.

Проверить список администраторов в базе:

```sql
SELECT item->>'email' AS email, item->>'role' AS role, item->>'active' AS active,
       item->>'lastLoginAt' AS last_login
FROM vespera_documents, jsonb_array_elements(data->'admins') AS item
WHERE name = 'admins';
```

## Ограничения

- Нет истории изменений администраторов (только `createdBy` и `lastLoginAt`).
- Нет восстановления пароля по email — только сброс владельцем или процедура выше.
- Смена пароля не отзывает уже выданные сессии этого администратора; деактивация — отзывает (≤ 5 c).
- Bootstrap создаёт владельца только когда документа **нет**. Повреждённый документ
  не пересоздаётся автоматически: панель отдаёт `500` и доступ не открывает, пока файл
  (или строку в базе) не удалят вручную — это защита от подмены «сбросом».
- Rate limit хранится в памяти инстанса: на Vercel при нескольких инстансах лимит
  действует на каждый отдельно.
