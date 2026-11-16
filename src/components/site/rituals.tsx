"use client";

import type { StudioRitual, StudioService } from "@/lib/studio";
import { RITUAL_META } from "@/content/site";
import { requestBooking, useScrollToSection } from "@/hooks/use-scroll-to-section";
import { AnchorLink } from "@/components/ui/anchor-link";
import { CatalogEmpty } from "@/components/site/catalog-empty";
import { findService, totalDuration, totalPrice } from "@/components/site/catalog";
import { formatPrice, pluralize } from "@/components/ui/format";
import { isPlainLeftClick } from "@/components/ui/plain-click";
import { SectionHeader } from "@/components/ui/section-header";

interface RitualsProps {
  rituals: StudioRitual[];
  /** Каталог: названия и длительность практик берём из него, а не из копирайта. */
  services: StudioService[];
}

export function Rituals({ rituals, services }: RitualsProps) {
  const scrollToSection = useScrollToSection();

  return (
    <section id="rituals" aria-labelledby="rituals-title" className="bg-bg px-gutter py-section">
      <div className="mx-auto max-w-page">
        <SectionHeader
          id="rituals-title"
          index="03"
          eyebrow="Ритуалы"
          title={rituals.length === 3 ? "Три сценария" : "Сценарии"}
          note="Собираем под вас: кожа, свет, форма."
        />

        {rituals.length === 0 ? (
          <div className="mt-stack">
            <CatalogEmpty>
              Ритуалы обновляются. Позвоните — соберём сценарий под ваш вечер.
            </CatalogEmpty>
          </div>
        ) : (
          <ol className="mt-stack">
            {rituals.map((ritual, index) => {
              const meta = RITUAL_META[ritual.id];
              // Состав ритуала описан в RITUAL_META; если услугу убрали из каталога,
              // она просто выпадает — обещать снятое с записи нельзя.
              const included = (meta?.serviceIds ?? ritual.serviceIds)
                .map((id) => findService(services, id))
                .filter((service): service is StudioService => Boolean(service));

              const duration = totalDuration(included);
              // Нет ни одной доступной практики — не называем цену пакета.
              const price = included.length === 0 ? 0 : meta?.priceRub ?? totalPrice(included);
              const format =
                included.length > 0
                  ? `${included.length} ${pluralize(included.length, [
                      "ПРАКТИКА",
                      "ПРАКТИКИ",
                      "ПРАКТИК",
                    ])} · ${duration} МИН`
                  : null;

              const serviceId = ritual.serviceIds[0];

              return (
                <li key={ritual.id} className="border-t border-line transition-colors duration-[240ms] ease-brand hover:border-line-strong">
                  <a
                    href="#booking"
                    onClick={(event) => {
                      if (!isPlainLeftClick(event)) return;
                      event.preventDefault();
                      if (serviceId) requestBooking({ serviceId });
                      scrollToSection("booking");
                    }}
                    className="group grid grid-cols-[3.25rem_1fr] items-start gap-x-inline gap-y-4 py-10 md:grid-cols-12 md:py-[72px]"
                  >
                    <span className="font-display text-h1 font-extralight tracking-[-0.04em] tabular-nums text-accent-text md:col-span-2">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="col-start-2 md:col-span-5 md:col-start-3">
                      <h3 className="text-pretty font-display text-h3 font-normal">{ritual.name}</h3>
                      {format ? (
                        <p className="mt-2 text-micro font-medium uppercase tabular-nums text-text-muted">
                          {format}
                        </p>
                      ) : null}
                      {included.length > 0 ? (
                        <p className="mt-3 text-small text-text-muted">
                          {included.map((service) => service.name).join(" · ")}
                        </p>
                      ) : null}
                    </div>

                    <p className="col-start-2 max-w-[30rem] text-body text-text-muted md:col-span-3 md:col-start-8">
                      {ritual.description}
                    </p>

                    <div className="col-start-2 flex items-baseline justify-between gap-4 md:col-span-2 md:col-start-11 md:flex-col md:items-end md:gap-2">
                      <span className="whitespace-nowrap text-price tabular-nums">
                        {price > 0 ? formatPrice(price) : "по запросу"}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-text-muted transition-transform duration-[240ms] ease-brand group-hover:translate-x-1.5 group-hover:text-accent-text"
                      >
                        →
                      </span>
                    </div>
                  </a>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-block flex flex-wrap items-center justify-between gap-6">
          <p className="max-w-[30rem] text-small text-text-muted">
            Ритуал — это сборка из практик. Меняем состав, если у кожи или глаз другой сценарий.
          </p>
          <AnchorLink
            href="#booking"
            className="group inline-flex min-h-[44px] items-center gap-2 text-small underline decoration-line-strong decoration-1 underline-offset-4 transition-colors duration-[240ms] ease-brand hover:decoration-accent-text"
          >
            Собрать свой ритуал
            <span
              aria-hidden="true"
              className="transition-transform duration-[240ms] ease-brand group-hover:translate-x-1"
            >
              →
            </span>
          </AnchorLink>
        </div>
      </div>
    </section>
  );
}
