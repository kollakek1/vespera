import type { StudioMaster, StudioService } from "@/lib/studio";

/**
 * Поиск по каталогу, который пришёл с сервера.
 *
 * Раньше эти функции жили в `@/lib/studio` и смотрели в seed-константы: правка
 * в админке на них не влияла. Теперь единственный источник — массивы из пропсов,
 * поэтому сравнение идёт по `id` и по `slug` (внешние ссылки используют оба).
 */

export function findService(
  services: readonly StudioService[],
  idOrSlug: string | null | undefined,
): StudioService | undefined {
  const key = (idOrSlug ?? "").trim().toLowerCase();
  if (!key) return undefined;
  return services.find(
    (service) => service.id.toLowerCase() === key || service.slug.toLowerCase() === key,
  );
}

export function findMaster(
  masters: readonly StudioMaster[],
  idOrSlug: string | null | undefined,
): StudioMaster | undefined {
  const key = (idOrSlug ?? "").trim().toLowerCase();
  if (!key) return undefined;
  return masters.find(
    (master) => master.id.toLowerCase() === key || master.slug.toLowerCase() === key,
  );
}

/** Мастера, которые делают услугу. */
export function mastersForService(
  masters: readonly StudioMaster[],
  serviceId: string,
): StudioMaster[] {
  return masters.filter((master) => master.serviceIds.includes(serviceId));
}

/** Суммарная длительность набора услуг — для сборных ритуалов. */
export function totalDuration(services: readonly StudioService[]): number {
  return services.reduce((sum, service) => sum + service.durationMin, 0);
}

/** Суммарная цена набора услуг — запасной вариант, если у ритуала нет своей цены. */
export function totalPrice(services: readonly StudioService[]): number {
  return services.reduce((sum, service) => sum + service.priceRub, 0);
}
