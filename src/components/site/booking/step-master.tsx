"use client";

import type { StudioMaster } from "@/lib/studio";
import { mastersForService } from "@/components/site/catalog";
import { pluralize } from "@/components/ui/format";

interface StepMasterProps {
  /** Каталог из `studio-store`. */
  masters: StudioMaster[];
  serviceId: string;
  value: string | null;
  onChange: (masterId: string) => void;
}

export function StepMaster({ masters, serviceId, value, onChange }: StepMasterProps) {
  const available = mastersForService(masters, serviceId);

  return (
    <fieldset className="min-w-0">
      <legend className="text-micro font-medium uppercase text-text-muted">
        02 · Выберите мастера
      </legend>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {available.map((master) => (
          <label
            key={master.id}
            className="group flex min-h-[88px] cursor-pointer items-start gap-4 border border-line px-4 py-4 transition-colors duration-[240ms] ease-brand hover:bg-surface-hover has-[:checked]:border-accent-text has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-[var(--color-focus)]"
          >
            <input
              type="radio"
              name="booking-master"
              value={master.id}
              checked={value === master.id}
              onChange={() => onChange(master.id)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="mt-1 grid size-4 shrink-0 place-items-center rounded-full border border-control-border transition-colors duration-[240ms] ease-brand peer-checked:border-accent-text peer-checked:[&>span]:bg-accent-text"
            >
              <span className="size-2 rounded-full bg-transparent transition-colors duration-[240ms] ease-brand" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-body leading-tight text-text">{master.name}</span>
              <span className="mt-1 block text-small text-text-muted">{master.role}</span>
              <span className="mt-1 block text-micro font-medium uppercase tabular-nums text-text-muted">
                {master.years} {pluralize(master.years, ["год", "года", "лет"])}
              </span>
            </span>
          </label>
        ))}
      </div>

      {available.length === 0 ? (
        <p className="mt-4 text-small text-text-muted">
          Для этой практики сейчас нет мастера. Выберите другую или позвоните нам — подскажем,
          кто принимает.
        </p>
      ) : null}
    </fieldset>
  );
}
