# Хранение данных VESPERA — файлы и Postgres

Данные студии — два документа: `bookings` (брони) и `studio` (услуги и мастера).
**Где** они лежат, решает драйвер; `booking-store` и `studio-store` о нём ничего не знают
кроме двух методов.

```ts
// src/lib/storage/types.ts
getDocument<T>(name): Promise<T | null>
withLockedDocument<T, R>(name, (current) => Promise<{ next: T; result: R }>): Promise<R>
```

## Выбор драйвера

`src/lib/storage/index.ts` смотрит на env в таком порядке:

| Переменная | Примечание |
| --- | --- |
| `DATABASE_URL` | основной вариант (Vercel/Neon) |
| `POSTGRES_URL` | альтернатива, если так настроено в окружении |
| `NEON_DATABASE_URL` | ещё одно распространённое имя |

Есть любая из них → Postgres, нет ни одной → файлы в `data/`. Отсутствие env не ошибка:
приложение просто работает локально. Драйверы подгружаются лениво, поэтому
`@neondatabase/serverless` не попадает в бандл, пока Postgres не используется.

Логирование: файловый драйвер пишет `[storage:file]` при восстановлении из `.bak`,
Postgres-ошибки всплывают как `500 server_error` в ответе и полным текстом в логах.

## Файловый драйвер (локальная разработка, e2e)

- `data/bookings.json`, `data/studio.json`; каталог — `VESPERA_DATA_DIR` или `<cwd>/data`.
- Каждая мутация: читаем документ → применяем изменение в JS → пишем **временный файл
  и `rename`** (читатель никогда не видит половину JSON).
- Перед перезаписью предыдущая валидная версия уходит в `<name>.json.bak`.
- Битый основной файл → читаем `.bak`; битые оба → `null`, и модель подставляет дефолты.
- Очередь на каждый документ (promise-цепочка): две мутации не переплетаются,
  разные документы друг друга не блокируют.
- Поскольку это ФС процесса, при нескольких инстансах (Vercel) запись **не** сериализуется —
  именно поэтому на Vercel нужен Postgres.

## Postgres-драйвер (Vercel + Neon)

```sql
CREATE TABLE IF NOT EXISTS vespera_documents (
  name text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Таблица создаётся один раз на процесс при первом обращении (`CREATE TABLE IF NOT EXISTS`),
при ошибке попытка повторяется на следующем запросе.

`withLockedDocument` — настоящая транзакция:

```sql
BEGIN;
SELECT pg_advisory_xact_lock(hashtext($1));          -- лок на документ до COMMIT
SELECT data FROM vespera_documents WHERE name = $1;
-- ... мутация в JS ...
INSERT INTO vespera_documents (name, data, updated_at)
VALUES ($1, $2::jsonb, now())
ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
COMMIT;
```

Одного `SELECT ... FOR UPDATE` недостаточно: пока строки нет, блокировать нечего, и два
первых запроса могли бы создать её одновременно. Advisory lock берётся **до** чтения и
сериализует весь цикл, включая вставку; снимается автоматически при `COMMIT`/`ROLLBACK`,
поэтому «зависнуть» на нём нельзя. Гонка за один слот между двумя лямбдами отсекается.

Соединение: `Pool` из `@neondatabase/serverless` с `max: 1` на инстанс (в serverless
больше и не нужно), `connectionTimeoutMillis: 10s`. Драйвер работает по WebSocket;
в Node 20+ `WebSocket` глобальный, отдельный пакет `ws` не нужен.

## Кэш

`studio-store` держит каталог в памяти **не дольше 1 секунды** и сбрасывает кэш после
любой записи. Этого достаточно, чтобы расчёт слотов не ходил в БД за каждым слотом,
и мало, чтобы админ увидел свою правку сразу. Между инстансами на Vercel кэш не общий —
источник правды всегда база.

## Как включить на Vercel

1. Создайте базу в Neon (или подключите интеграцию Neon к проекту Vercel).
2. В настройках проекта → Environment Variables добавьте `DATABASE_URL`
   (строка вида `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`).
   Для Preview/Production можно разные базы.
3. Redeploy. Таблица создастся сама при первом запросе.
4. Проверьте: `GET /api/admin/studio` под админом отдаёт каталог; в Neon в таблице
   `vespera_documents` появились строки `bookings` и `studio` (первая — после первой брони,
   вторая — после первой правки каталога; до этого работают seed-дефолты).

Локально с базой: `DATABASE_URL=... npm run dev`. Без переменной всё остаётся на файлах —
это штатный режим разработки.

## Как перенести текущие файлы в Postgres

```bash
# 1. взять JSON из файла и вставить одной строкой
psql "$DATABASE_URL" -c "
INSERT INTO vespera_documents (name, data)
VALUES ('bookings', '$(cat data/bookings.json | tr -d '\n')'::jsonb)
ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
"
```

То же для `studio` (файл `data/studio.json`). Формат документа внутри базы идентичен
файлу: `{ "version": 1, ... }` для броней и `{ "version": 1, "updatedAt": ..., "services": [...],
"masters": [...] }` для каталога — поэтому переносится как есть.

## Как посмотреть данные в Neon

SQL Editor в консоли Neon или `psql`:

```sql
-- размеры документов
SELECT name, jsonb_array_length(data->'bookings') AS bookings, updated_at
FROM vespera_documents WHERE name = 'bookings';

-- записи за день
SELECT item->>'code' AS code, item->>'time' AS time, item->>'status' AS status, item->>'name' AS name
FROM vespera_documents, jsonb_array_elements(data->'bookings') AS item
WHERE name = 'bookings' AND item->>'date' = '2026-12-03'
ORDER BY item->>'time';

-- каталог
SELECT jsonb_pretty(data) FROM vespera_documents WHERE name = 'studio';
```

`updated_at` — момент последней записи документа (полезно понять, чей инстанс писал).

## Откат

- **Postgres → файлы:** уберите `DATABASE_URL` из окружения и перезапустите.
  Приложение вернётся к `data/*.json`; данные из базы останутся в таблице, их можно
  выгрузить тем же `psql` и положить в файлы (`data/bookings.json` = `{"version":1,"bookings":[...]}`).
- **Файлы → Postgres:** см. раздел про перенос.
- **Сброс каталога к дефолтам:** удалить строку `studio`
  (`DELETE FROM vespera_documents WHERE name = 'studio';`) — следующий запрос отдаст seed
  из `src/lib/studio.ts`. Брони не трогаются.
- **Полный сброс тестовых броней:** `DELETE FROM vespera_documents WHERE name = 'bookings';`.

## Холодный старт и таймауты

Neon на бесплатном compute засыпает через несколько минут без запросов. Первый
запрос после паузы поднимает compute: это секунды, и соединение может не успеть
установиться. Раньше это выглядело как `Connection terminated due to connection
timeout` и `500` на первом запросе каждой холодной лямбды.

Что делает драйвер:

- **Таймаут соединения — 20 секунд** (`connectionTimeoutMillis`), а не 10: холодный
  compute просыпается дольше, чем живой.
- **До трёх повторов** с паузами 250 → 750 → 1500 мс (+ до 100 мс jitter).
  Итого максимум 4 попытки.
- **Повторяются только сетевые ошибки:** `connection terminated`, `connection timeout`,
  `timeout exceeded when trying to connect`, `socket hang up`, `ECONNRESET`,
  `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`, `EAI_AGAIN`, а также серверные
  `57P01/57P02/57P03` (сервер выключается/поднимается).
  Ошибки SQL, ограничений и бизнес-логики не повторяются никогда — они сразу уходят наверх.
- **Бюджет одной операции — 25 секунд** (`каждый` запрос к хранилищу). Если не уложились —
  драйвер бросает `StorageUnavailableError`, API отвечает `503` + `Retry-After: 2`
  с текстом «Сервис временно недоступен». Клиент может повторить.
- **Инициализация и прогрев — один промис на процесс**: `CREATE TABLE IF NOT EXISTS`
  и следом `SELECT 1`, оба с тем же ретраем. Параллельные запросы ждут один и тот же
  промис, а не создают таблицу наперегонки. При ошибке промис сбрасывается,
  и следующий запрос пробует снова.
- **Прогрев не заменяет транзакцию**: `withLockedDocument` берёт коннект, делает
  `BEGIN`, advisory lock, чтение, мутацию, `INSERT … ON CONFLICT DO UPDATE`, `COMMIT`.
  Повтор разрешён только до `BEGIN` или после явного `ROLLBACK`. После отправки
  `COMMIT` повтора нет: неизвестно, применилась ли запись, — лучше `503`, чем дубль.

Env для тонкой настройки (необязательные, читаются при старте процесса):

| Переменная | По умолчанию | Границы |
| --- | --- | --- |
| `STORAGE_CONNECT_TIMEOUT_MS` | `20000` | 1000–25000 |
| `STORAGE_OPERATION_BUDGET_MS` | `25000` | 5000–25000 |

Меньше делать не стоит: холодный Neon реально отвечает 2–5 секунд. Больше — нельзя,
иначе запрос повиснет дольше, чем живёт лямбда.

Если в логах массовые `503 storage_unavailable`:

1. Проверьте, что база не удалена и `DATABASE_URL` валиден.
2. Откройте консоль Neon: compute спит? Первый запрос его разбудит, но лучше
   **отключить autosuspend** в настройках проекта (Compute → Suspend delay) —
   на бесплатном плане это ограничено, на платном доступно.
3. Если нагрузка постоянная — перейти на платный compute с минимальным размером:
   он не засыпает, и таймауты уходят совсем.
4. Как временная мера — прогрев по крону (`/api/booking/availability` раз в 5 минут),
   но это лишние запросы и деньги; правильнее убрать autosuspend.

## Ограничения

- Один документ на тип данных: вся история броней пишется строкой один раз за мутацию.
  Для одной студии это нормально; при росте до тысяч записей нужна нормализованная схема.
- Транзакция держит соединение на время мутации (миллисекунды). Долгие операции внутри
  мутатора недопустимы — это заблокирует остальные записи документа.
- `pg_advisory_xact_lock` — на уровне всей базы: имя документа в хэше, коллизии хэшей
  теоретически возможны (два разных документа с одинаковым `hashtext`), но у нас их два.
- Файловый драйвер не рассчитан на несколько процессов/инстансов: только локально и в e2e.
