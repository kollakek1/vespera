import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import {
  buildCalendarDay,
  mastersWorkingOn,
  monthDateKeys,
  monthRange,
  parseMonthKey,
  summarizeCalendar,
  type CalendarDay,
} from "@/lib/admin-api";
import { masterFilterOptions } from "@/lib/booking-view";
import { errorResponse, jsonResponse, weekdayOfDateKey } from "@/lib/booking";
import { listBookings } from "@/lib/booking-store";
import { findMaster, getMasters, type StudioMasterRecord } from "@/lib/studio-store";
import { TIMEZONE } from "@/lib/studio";
import { storageFailureResponse, storageSafe } from "@/lib/storage/http";

/**
 * GET /api/admin/calendar?month=YYYY-MM&masterId=all
 *
 * Сетка месяца: по каждому дню нагрузка, количество записей, выручка и кто на смене.
 * Нагрузка = занятые минуты / (600 минут × число мастеров на смене).
 */

const querySchema = z.object({
  month: z.string({ error: "Укажите месяц в формате YYYY-MM" }),
  masterId: z.string().trim().optional(),
});

export async function GET(request: Request): Promise<Response> {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    month: searchParams.get("month") ?? undefined,
    masterId: searchParams.get("masterId") ?? undefined,
  });
  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Проверьте параметры запроса",
      {
        details: {
          fields: parsed.error.issues.map((issue) => ({
            field: issue.path.map(String).join("."),
            message: issue.message,
          })),
        },
      },
    );
  }

  const month = parseMonthKey(parsed.data.month);
  if (!month) {
    return errorResponse(400, "invalid_request", "Месяц в формате YYYY-MM, например 2026-11");
  }

  const masterParam = (parsed.data.masterId ?? "all").trim().toLowerCase();
  const filterAll = masterParam === "" || masterParam === "all";

  // Фильтр по конкретному мастеру: каталог читается из хранилища.
  let master: StudioMasterRecord | null = null;
  if (!filterAll) {
    const resolved = await storageSafe(
      findMaster(masterParam),
      "[admin/calendar]",
      "Не удалось загрузить календарь. Попробуйте ещё раз",
    );
    if (resolved instanceof Response) return resolved;
    if (!resolved) {
      return errorResponse(400, "unknown_master", "Такого мастера нет в расписании");
    }
    master = resolved;
  }

  const stored = await listBookings().catch((error: unknown) =>
    storageFailureResponse(error, "[admin/calendar] не удалось прочитать хранилище", "Сервис временно недоступен. Попробуйте ещё раз"),
  );
  if (stored instanceof Response) return stored;

  const { from, to } = monthRange(month);
  const monthBookings = stored.filter((booking) => {
    if (booking.date < from || booking.date > to) return false;
    if (master && booking.masterId !== master.id) return false;
    return true;
  });

  // Все мастера — только активные: архивный не создаёт ёмкость в знаменателе нагрузки.
  const workingMasters = master
    ? [master]
    : await getMasters().catch((error: unknown) =>
        storageFailureResponse(
          error,
          "[admin/calendar]",
          "Не удалось загрузить календарь. Попробуйте ещё раз",
        ),
      );
  if (workingMasters instanceof Response) return workingMasters;

  const keys = monthDateKeys(month);

  const days: CalendarDay[] = [];
  for (const date of keys) {
    // Даты построены из валидного месяца, поэтому день недели всегда есть.
    const weekday = weekdayOfDateKey(date);
    if (weekday === null) continue;

    const dayBookings = monthBookings.filter((booking) => booking.date === date);
    days.push(
      buildCalendarDay({
        date,
        weekday,
        bookings: dayBookings,
        mastersOnDuty: mastersWorkingOn(workingMasters, weekday),
      }),
    );
  }

  const masterOptions = await masterFilterOptions().catch((error: unknown) =>
    storageFailureResponse(error, "[admin/calendar]", "Не удалось загрузить список мастеров"),
  );
  if (masterOptions instanceof Response) return masterOptions;

  return jsonResponse({
    ok: true,
    month: parsed.data.month.trim(),
    masterId: master?.id ?? "all",
    timezone: TIMEZONE,
    days,
    summary: summarizeCalendar(days, monthBookings),
    masters: masterOptions,
  });
}
