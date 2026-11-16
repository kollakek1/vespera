/**
 * Общие помощники админских роутов каталога: единые ответы об ошибках,
 * ответы про конфликты удаления и инвалидация страниц после мутации.
 */

import { revalidatePath } from "next/cache";

import type { FutureBookingRef } from "./admin-api";
import { errorResponse } from "./booking";
import type { StudioWriteFailure } from "./studio-store";

export type StudioSubject = "service" | "master";

const SUBJECT_LABEL: Record<StudioSubject, string> = {
  service: "услуга",
  master: "мастер",
};

/** Единый маппинг неудачной записи каталога в HTTP-ответ. */
export function studioFailureResponse(failure: StudioWriteFailure, subject: StudioSubject): Response {
  const label = SUBJECT_LABEL[subject];

  switch (failure.reason) {
    case "not_found":
      return errorResponse(404, "not_found", `Такая ${label} не найдена`);

    case "slug_taken":
      return errorResponse(409, "slug_taken", `slug «${failure.slug ?? ""}» уже занят`, {
        details: { slug: failure.slug },
      });

    case "service_ids_invalid": {
      const invalid = failure.invalidIds ?? [];
      const message = `Нет таких услуг: ${invalid.join(", ")}`;
      return errorResponse(400, "invalid_request", `Проверьте serviceIds мастера — ${message}`, {
        details: {
          fields: [{ field: "serviceIds", message }],
          invalidIds: invalid,
        },
      });
    }

    case "masters_without_services": {
      const masters = failure.masters ?? [];
      const names = masters.map((master) => master.name).join(", ");
      return errorResponse(
        409,
        "masters_without_services",
        `Удаление оставит мастеров без услуг (${names}). Сначала назначьте им другие услуги`,
        { details: { masters } },
      );
    }
  }
}

/**
 * Удаление при живых будущих бронях запрещено: гость придёт, а услуги
 * или мастера в расписании уже нет.
 */
export function deleteConflictResponse(
  subject: StudioSubject,
  bookings: readonly FutureBookingRef[],
): Response {
  const codes = bookings.map((booking) => booking.code);
  const noun = subject === "service" ? "услугу" : "мастера";
  return errorResponse(
    409,
    "delete_conflict",
    `Нельзя удалить ${noun}: есть будущие записи (${codes.join(", ")}). Отмените или перенесите их`,
    { details: { bookings } },
  );
}

/**
 * После любой правки каталога сбрасываем кэш страниц: лендинг и админка
 * должны увидеть новые услуги/цены без ребилда.
 */
export function revalidateStudio(): void {
  for (const path of ["/", "/admin"]) {
    try {
      revalidatePath(path);
    } catch (error) {
      // Инвалидация — оптимизация, а не инвариант: данные уже записаны.
      console.warn(`[admin-studio] не удалось инвалидировать ${path}`, error);
    }
  }
}
