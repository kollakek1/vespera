import Link from "next/link";
import type { ReactNode } from "react";

import { FOOTER_PRINT, NAV_LINKS, SOCIAL_LINKS } from "@/content/site";
import { AnchorLink } from "@/components/ui/anchor-link";
import { STUDIO_CONTACTS, STUDIO_HOURS, STUDIO_TAGLINE } from "@/lib/studio";

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-micro font-medium uppercase text-text-muted">{title}</p>
      <div className="mt-3 flex flex-col text-small text-text">{children}</div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-bg px-gutter pb-8 pt-section">
      <div className="mx-auto max-w-page">
        <div className="grid grid-cols-2 gap-block md:grid-cols-12">
          <div className="col-span-2 md:col-span-4">
            <p className="font-display text-[32px] font-light uppercase tracking-[0.28em] -mr-[0.28em]">
              Vespera
            </p>
            <p className="mt-4 max-w-[22rem] font-quote text-[1.25rem] italic text-text-muted">
              {STUDIO_TAGLINE}
            </p>
          </div>

          <div className="md:col-span-2 md:col-start-5">
            <Column title="Часы">
              <p className="tabular-nums">
                {STUDIO_HOURS.opensAt}–{STUDIO_HOURS.closesAt}
              </p>
              <p className="mt-1 text-text-muted">Ежедневно</p>
            </Column>
          </div>

          <div className="md:col-span-2 md:col-start-7">
            <Column title="Адрес">
              <p>{STUDIO_CONTACTS.address}</p>
              <p className="mt-1 text-text-muted">{STUDIO_CONTACTS.addressNote}</p>
            </Column>
          </div>

          <div className="md:col-span-2 md:col-start-9">
            <Column title="Контакты">
              <a
                href={`tel:${STUDIO_CONTACTS.phoneHref}`}
                className="inline-flex min-h-11 items-center tabular-nums transition-colors duration-[240ms] ease-brand hover:text-accent-text"
              >
                {STUDIO_CONTACTS.phone}
              </a>
              <a
                href={`mailto:${STUDIO_CONTACTS.email}`}
                className="inline-flex min-h-11 items-center transition-colors duration-[240ms] ease-brand hover:text-accent-text"
              >
                {STUDIO_CONTACTS.email}
              </a>
            </Column>
          </div>

          <div className="md:col-span-2 md:col-start-11">
            <Column title="Связь">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center underline decoration-line-strong decoration-1 underline-offset-4 transition-colors duration-[240ms] ease-brand hover:decoration-accent-text"
                >
                  {social.label}
                </a>
              ))}
            </Column>
          </div>
        </div>

        <nav aria-label="Быстрые ссылки" className="mt-12 flex flex-wrap gap-x-6">
          {NAV_LINKS.map((link) => (
            <AnchorLink
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center text-small text-text-muted transition-colors duration-[240ms] ease-brand hover:text-text"
            >
              {link.label}
            </AnchorLink>
          ))}
          <AnchorLink
            href="#booking"
            className="inline-flex min-h-11 items-center text-small text-text-muted transition-colors duration-[240ms] ease-brand hover:text-text"
          >
            Запись
          </AnchorLink>
        </nav>

        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 text-micro font-medium uppercase tabular-nums text-text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6">
          <span>{FOOTER_PRINT}</span>
          <span className="flex flex-wrap items-center gap-x-6">
            <Link
              href="/privacy"
              className="inline-flex min-h-11 items-center underline decoration-line-strong decoration-1 underline-offset-4 transition-colors duration-[240ms] ease-brand hover:text-text hover:decoration-accent-text"
            >
              Политика конфиденциальности
            </Link>
            <span>Москва · Столярный переулок, 3</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
