import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";

import { getCatalog } from "@/lib/studio-store";

import { siteUrl } from "./_seo/site";

/**
 * Дата релиза — запасной вариант, если каталог ещё ни разу не менялся.
 * Никакого `new Date()` на запрос: карта меняется только вместе с каталогом,
 * иначе поисковик видит «страница обновляется постоянно».
 */
const RELEASE_DATE = new Date("2026-11-16T00:00:00.000Z");

/**
 * Дата редакции политики конфиденциальности. Она не зависит от каталога:
 * текст меняется редко, и поисковик не должен видеть «правку» на каждом релизе.
 */
const PRIVACY_REVISED_AT = new Date("2026-11-16T00:00:00.000Z");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Кеш на час: карта остаётся ISR, а не динамической ради одной даты.
  "use cache";
  cacheLife("hours");

  let lastModified = RELEASE_DATE;

  try {
    const catalog = await getCatalog();
    const updatedAt = catalog.updatedAt ? new Date(catalog.updatedAt) : null;
    if (updatedAt && !Number.isNaN(updatedAt.getTime())) lastModified = updatedAt;
  } catch {
    // Хранилище недоступно — отдаём дату релиза: карта не должна падать.
  }

  return [
    {
      url: siteUrl(),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl()}/privacy`,
      lastModified: PRIVACY_REVISED_AT,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
