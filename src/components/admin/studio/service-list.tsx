"use client";

import type { StudioMaster, StudioService } from "@/lib/admin-client";
import { AdminButton } from "@/components/admin/admin-ui";
import { cn } from "@/components/ui/cn";
import { formatMoney, plural } from "@/components/admin/dates";

interface ServiceListProps {
  services: StudioService[];
  masters: StudioMaster[];
  busyId: string | null;
  onCreate: () => void;
  onEdit: (service: StudioService) => void;
  onDelete: (service: StudioService) => void;
}

/** Одна сетка на заголовок и строки: колонки не разъезжаются. */
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_96px_120px_96px_168px]";

function ServiceRow({
  service,
  index,
  masterCount,
  busy,
  onEdit,
  onDelete,
}: {
  service: StudioService;
  index: number;
  masterCount: number;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-line px-3 py-3 last:border-b-0",
        "transition-colors duration-[120ms] hover:bg-surface-hover",
        COLUMNS,
        "md:items-center md:gap-y-0",
      )}
    >
      <div className="col-span-2 min-w-0 md:col-span-1 md:col-start-1 md:row-start-1">
        <p className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-micro tabular-nums text-text-muted">
            {String(index).padStart(2, "0")}
          </span>
          <span className="truncate text-[14px] text-text" title={service.name}>
            {service.name}
          </span>
        </p>
        <p className="mt-1 text-[12px] tabular-nums text-text-muted md:hidden">
          {service.durationMin} мин · {formatMoney(service.priceRub)} · {masterCount}{" "}
          {plural(masterCount, ["мастер", "мастера", "мастеров"])}
        </p>
      </div>

      <span className="hidden text-right text-[13px] tabular-nums text-text-muted md:col-start-2 md:row-start-1 md:block">
        {service.durationMin} мин
      </span>
      <span className="hidden text-right text-[13px] tabular-nums text-text md:col-start-3 md:row-start-1 md:block">
        {formatMoney(service.priceRub)}
      </span>
      <span className="hidden text-right text-[13px] tabular-nums text-text-muted md:col-start-4 md:row-start-1 md:block">
        {masterCount}
      </span>

      <div className="col-span-2 flex flex-wrap justify-end gap-1.5 md:col-span-1 md:col-start-5 md:row-start-1">
        <AdminButton size="sm" variant="subtle" onClick={onEdit} disabled={busy}>
          Изменить
        </AdminButton>
        <AdminButton size="sm" variant="danger" onClick={onDelete} disabled={busy} aria-busy={busy}>
          Удалить
        </AdminButton>
      </div>
    </li>
  );
}

export function ServiceList({
  services,
  masters,
  busyId,
  onCreate,
  onEdit,
  onDelete,
}: ServiceListProps) {
  const masterCountFor = (serviceId: string) =>
    masters.filter((master) => master.serviceIds.includes(serviceId)).length;

  return (
    <section aria-labelledby="studio-services-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="studio-services-title" className="font-display text-h3 font-light text-text">
            Услуги
          </h2>
          <p className="mt-1 text-[13px] tabular-nums text-text-muted">
            {services.length} {plural(services.length, ["услуга", "услуги", "услуг"])}
          </p>
        </div>
        <AdminButton size="sm" variant="ghost" onClick={onCreate}>
          Добавить услугу
        </AdminButton>
      </header>

      {services.length === 0 ? (
        <div className="mt-3 border border-line bg-surface px-4 py-6 text-center">
          <p className="text-[13px] text-text">
            Пока нет услуг — гость не увидит их в записи.
          </p>
          <AdminButton className="mt-3" size="sm" onClick={onCreate}>
            Добавить услугу
          </AdminButton>
        </div>
      ) : (
        <ul className="mt-3 border-y border-line">
          <li
            aria-hidden="true"
            className={cn(
              "hidden border-b border-line px-3 py-2 text-micro font-medium uppercase text-text-muted",
              "md:grid md:items-center md:gap-x-3",
              COLUMNS,
            )}
          >
            <span>Услуга</span>
            <span className="text-right">Время</span>
            <span className="text-right">Цена</span>
            <span className="text-right">Мастеров</span>
            <span />
          </li>

          {services.map((service, index) => (
            <ServiceRow
              key={service.id}
              service={service}
              index={index + 1}
              masterCount={masterCountFor(service.id)}
              busy={busyId === service.id}
              onEdit={() => onEdit(service)}
              onDelete={() => onDelete(service)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
