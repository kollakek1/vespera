import Link from "next/link";
import type { ReactNode } from "react";

import { STUDIO_CONTACTS, STUDIO_HOURS } from "@/lib/studio";
import { Eyebrow } from "@/components/ui/eyebrow";

interface StatusScreenProps {
  /** Крупный знак: `404` или `500`. */
  code: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Кнопки страницы: у 404 — ссылки, у ошибки — reset. */
  actions: ReactNode;
}

/**
 * Общий каркас служебных экранов: тёмный обсидиан, волосяные линии,
 * жемчужина из CSS-фолбэка (никакой 3D-сцены — страница должна открываться
 * мгновенно и не тянуть three.js).
 */
export function StatusScreen({ code, eyebrow, title, description, actions }: StatusScreenProps) {
  return (
    <div className="flex min-h-svh flex-col bg-bg text-text">
      <header className="mx-auto flex w-full max-w-page items-center px-gutter py-6">
        <Link
          href="/"
          className="font-display text-[15px] font-light uppercase tracking-[0.42em] text-text transition-colors duration-[240ms] ease-brand hover:text-text-muted"
        >
          Vespera
        </Link>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-page flex-1 items-center px-gutter py-16 md:py-24">
        <div className="grid w-full grid-cols-1 items-center gap-y-10 md:grid-cols-12 md:gap-x-inline">
          <div className="md:col-span-7">
            <Eyebrow index={code}>{eyebrow}</Eyebrow>

            <p
              aria-hidden="true"
              className="mt-6 font-display text-[clamp(4rem,15vw,10rem)] font-extralight leading-[0.85] tracking-[-0.04em] tabular-nums text-text"
            >
              {code}
            </p>

            <h1 className="mt-8 max-w-[22ch] text-balance font-display text-h2 font-light">{title}</h1>

            <p className="mt-4 max-w-[28rem] text-pretty text-body text-text-muted">{description}</p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">{actions}</div>
          </div>

          <div className="order-first md:order-none md:col-span-4 md:col-start-9">
            <div className="mx-auto aspect-square w-[min(44vw,168px)] md:mx-0 md:w-full md:max-w-[300px]">
              <span className="orb-fallback block" aria-hidden="true" />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-page flex-col gap-2 px-gutter py-5 text-micro font-medium uppercase text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="tabular-nums">
            {STUDIO_HOURS.opensAt}–{STUDIO_HOURS.closesAt} · ежедневно
          </span>
          <a
            href={`tel:${STUDIO_CONTACTS.phoneHref}`}
            className="tabular-nums transition-colors duration-[240ms] ease-brand hover:text-text"
          >
            {STUDIO_CONTACTS.phone}
          </a>
        </div>
      </footer>
    </div>
  );
}
