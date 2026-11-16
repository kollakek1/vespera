import type { ReactNode } from "react";

import { STUDIO_CONTACTS } from "@/lib/studio";

/**
 * Пустое состояние каталога: услуги и мастера приходят из админки, поэтому
 * «пусто» — это не ошибка, а пауза в обновлении. Блок не исчезает: объясняем,
 * что происходит, и даём телефон вместо тупика.
 */
export function CatalogEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="border-t border-line py-10">
      <p className="max-w-[34rem] text-pretty text-body text-text-muted">{children}</p>
      <p className="mt-4 text-small text-text-muted">
        <a
          href={`tel:${STUDIO_CONTACTS.phoneHref}`}
          className="min-h-11 text-text underline decoration-line-strong decoration-1 underline-offset-4 transition-colors duration-[240ms] ease-brand hover:decoration-accent-text"
        >
          {STUDIO_CONTACTS.phone}
        </a>
      </p>
    </div>
  );
}
