/**
 * Адрес сайта для canonical, OG, robots, sitemap и JSON-LD.
 *
 * `vespera.studio` пока не подключён, поэтому хардкод домена врал бы.
 * Приоритет: явный `NEXT_PUBLIC_SITE_URL` → production-URL Vercel → текущий деплой.
 * Значение читается только на сервере (metadata, robots, sitemap, JSON-LD).
 */
const FALLBACK_URL = "https://vespera-lovat.vercel.app";

function normalize(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim().length > 0) return normalize(explicit);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel && vercel.trim().length > 0) return normalize(vercel);

  return FALLBACK_URL;
}

export const SITE_NAME = "VESPERA";
export const SITE_TAGLINE = "Красота после заката";
export const SITE_DESCRIPTION =
  "Студия вечерних ритуалов в Столярном переулке. Один мастер, один гость, девяносто минут тишины. Запись ежедневно с 12:00 до 22:00.";
