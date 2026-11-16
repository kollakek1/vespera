"use client";

import type { StudioService } from "@/lib/studio";
import { CatalogEmpty } from "@/components/site/catalog-empty";
import { formatPrice } from "@/components/ui/format";

interface StepServiceProps {
  /** Каталог из `studio-store`, не seed-константы. */
  services: StudioService[];
  value: string | null;
  onChange: (serviceId: string) => void;
}

export function StepService({ services, value, onChange }: StepServiceProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-micro font-medium uppercase text-text-muted">
        01 · Выберите услугу
      </legend>

      {services.length === 0 ? (
        <CatalogEmpty>
          Каталог обновляется. Позвоните — примем запись вручную и подберём время.
        </CatalogEmpty>
      ) : (
        <div className="mt-4 border-t border-line">
          {services.map((service) => (
            <label
              key={service.id}
              className="group md:px-2 flex min-h-[64px] cursor-pointer items-center gap-4 border-b border-line py-4 transition-colors duration-[240ms] ease-brand hover:bg-surface-hover has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[-2px] has-[:focus-visible]:outline-[var(--color-focus)]"
            >
              <input
                type="radio"
                name="booking-service"
                value={service.id}
                checked={value === service.id}
                onChange={() => onChange(service.id)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="grid size-4 shrink-0 place-items-center rounded-full border border-control-border transition-colors duration-[240ms] ease-brand peer-checked:border-accent-text peer-checked:[&>span]:bg-accent-text"
              >
                <span className="size-2 rounded-full bg-transparent transition-colors duration-[240ms] ease-brand" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-body leading-tight text-text">{service.name}</span>
                <span className="mt-1 block text-small tabular-nums text-text-muted">
                  {service.durationMin} мин
                </span>
              </span>

              <span className="whitespace-nowrap text-price tabular-nums text-text">
                {formatPrice(service.priceRub)}
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
