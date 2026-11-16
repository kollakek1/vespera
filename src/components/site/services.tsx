"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

import type { StudioService } from "@/lib/studio";
import { serviceMedia } from "@/components/site/media";
import { requestBooking, useScrollToSection } from "@/hooks/use-scroll-to-section";
import { CatalogEmpty } from "@/components/site/catalog-empty";
import { SectionHeader } from "@/components/ui/section-header";
import { formatPrice, pluralize } from "@/components/ui/format";
import { isPlainLeftClick } from "@/components/ui/plain-click";
import { useReducedMotionPreference } from "@/providers/reduced-motion-provider";

/** Заголовок честно называет количество: каталог редактируется в админке. */
function servicesTitle(count: number): string {
  if (count === 0) return "Практики";
  if (count === 6) return "Шесть практик";
  return `${count} ${pluralize(count, ["практика", "практики", "практик"])}`;
}

function ServiceCard({
  service,
  index,
  total,
  progress,
}: {
  service: StudioService;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const reduced = useReducedMotionPreference();
  const scrollToSection = useScrollToSection();
  const media = serviceMedia(service.id);

  // Глубина стопки зависит от числа карточек, а оно приходит из каталога.
  const depth = (value: number) => Math.min(2, Math.max(0, value * total - index));
  const scale = useTransform(progress, (value) => 1 - 0.035 * depth(value));
  const opacity = useTransform(progress, (value) => 1 - 0.15 * depth(value));

  const open = () => {
    requestBooking({ serviceId: service.id });
    scrollToSection("booking");
  };

  return (
    <motion.div style={reduced ? undefined : { scale, opacity }}>
      <a
        href="#booking"
        onClick={(event) => {
          if (!isPlainLeftClick(event)) return;
          event.preventDefault();
          open();
        }}
        aria-label={`${service.name}, ${service.durationMin} минут, ${formatPrice(service.priceRub)}. Записаться`}
        className="group relative block overflow-hidden rounded-card border border-line bg-surface transition-colors duration-[240ms] ease-brand hover:bg-surface-hover focus-visible:z-30 md:grid md:h-[clamp(280px,34vw,380px)] md:grid-cols-12"
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-5 md:col-span-8 md:grid-cols-8 md:items-center md:p-8">
          <span className="text-micro font-medium tabular-nums text-text-muted md:col-span-1">
            {String(index + 1).padStart(2, "0")}
          </span>

          <div className="min-w-0 transition-transform duration-[240ms] ease-brand group-hover:-translate-x-0.5 md:col-span-4">
            <h3 className="text-pretty font-display text-h3 font-normal">{service.name}</h3>
            <p className="mt-1 text-small text-text-muted md:hidden">{service.durationMin} мин</p>
          </div>

          <span className="hidden whitespace-nowrap text-small tabular-nums text-text-muted md:col-span-2 md:block">
            {service.durationMin} мин
          </span>

          <span className="whitespace-nowrap text-right text-price tabular-nums transition-colors duration-[240ms] ease-brand group-hover:text-accent-text md:col-span-1">
            {formatPrice(service.priceRub)}
          </span>
        </div>

        <div className="plate-kind relative h-[140px] overflow-hidden border-t border-line md:col-span-4 md:h-full md:border-l md:border-t-0">
          {media ? (
            <Image
              src={media.src}
              alt={`${service.name}: ${media.alt}`}
              fill
              sizes="(min-width: 768px) 34vw, 100vw"
              loading="lazy"
              style={{ objectPosition: media.position }}
              className="object-cover transition-[opacity,transform] duration-[420ms] ease-brand md:opacity-75 md:group-hover:scale-[1.03] md:group-hover:opacity-100"
            />
          ) : (
            <div
              className="plate-pearl absolute inset-0 scale-105 opacity-35 transition-[opacity,transform] duration-[420ms] ease-brand group-hover:scale-[1.08] group-hover:opacity-100"
              data-plate={index}
            />
          )}
        </div>
      </a>
    </motion.div>
  );
}

interface ServicesProps {
  /** Каталог из `studio-store`: секция ничего не знает про seed-константы. */
  services: StudioService[];
}

export function Services({ services }: ServicesProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      id="services"
      aria-labelledby="services-title"
      className="relative bg-bg px-gutter py-section"
    >
      <div className="mx-auto max-w-page">
        <SectionHeader
          id="services-title"
          index="02"
          eyebrow="Услуги"
          title={servicesTitle(services.length)}
          note="Цены фиксированы. Оплата в студии."
        />

        <ol ref={listRef} className="mt-stack">
          {services.length === 0 ? (
            <li>
              <CatalogEmpty>
                Каталог обновляется. Позвоните — подберём практику и время вручную.
              </CatalogEmpty>
            </li>
          ) : (
            services.map((service, index) => (
              <li
                key={service.id}
                className="md:sticky md:min-h-[62vh]"
                style={{ top: `calc(var(--stack-top) + ${index * 18}px)`, zIndex: 10 + index }}
              >
                <ServiceCard
                  service={service}
                  index={index}
                  total={services.length}
                  progress={scrollYProgress}
                />
              </li>
            ))
          )}
        </ol>
      </div>
    </section>
  );
}
