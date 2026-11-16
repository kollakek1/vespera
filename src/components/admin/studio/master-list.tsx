"use client";

import type { StudioMaster, StudioService } from "@/lib/admin-client";
import { WEEKDAY_LABELS, type Weekday } from "@/lib/studio";
import { AdminButton } from "@/components/admin/admin-ui";
import { cn } from "@/components/ui/cn";
import { plural } from "@/components/admin/dates";

const DAY_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

interface MasterListProps {
  masters: StudioMaster[];
  services: StudioService[];
  busyId: string | null;
  onCreate: () => void;
  onEdit: (master: StudioMaster) => void;
  onDelete: (master: StudioMaster) => void;
}

function MasterServices({
  serviceIds,
  services,
}: {
  serviceIds: string[];
  services: StudioService[];
}) {
  if (serviceIds.length === 0) {
    return <p className="text-[12px] text-text-muted">Услуги не выбраны</p>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Услуги мастера">
      {serviceIds.map((id) => {
        const service = services.find((item) => item.id === id);
        return (
          <li
            key={id}
            className={cn(
              "inline-flex items-center rounded-pill border px-2 py-0.5 text-[12px]",
              service ? "border-line-strong text-text" : "border-line text-text-muted",
            )}
          >
            {service?.name ?? id}
            {!service ? (
              <span className="ml-1.5 text-micro uppercase text-text-muted">нет в каталоге</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function WorkingDays({ days }: { days: Weekday[] }) {
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Рабочие дни">
      {DAY_ORDER.map((day) => {
        const active = days.includes(day);
        return (
          <li
            key={day}
            className={cn(
              "inline-flex h-6 min-w-8 items-center justify-center border px-1 text-[11px]",
              active ? "border-line-strong bg-surface text-text" : "border-line text-text-disabled",
            )}
          >
            <span aria-hidden="true">{WEEKDAY_LABELS[day]}</span>
            <span className="sr-only">
              {WEEKDAY_LABELS[day]} — {active ? "рабочий" : "выходной"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function MasterCard({
  master,
  services,
  busy,
  onEdit,
  onDelete,
}: {
  master: StudioMaster;
  services: StudioService[];
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex min-w-0 flex-col border border-line bg-bg p-4 transition-colors duration-[120ms] hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] text-text">{master.name}</p>
          <p className="truncate text-[13px] text-text-muted">{master.role || "—"}</p>
        </div>
        <span className="shrink-0 text-micro uppercase tabular-nums text-text-muted">
          {master.years} лет
        </span>
      </div>

      <div className="mt-3">
        <MasterServices serviceIds={master.serviceIds} services={services} />
      </div>

      <div className="mt-3">
        <WorkingDays days={master.workingDays} />
      </div>

      <div className="mt-auto flex flex-wrap justify-end gap-1.5 pt-4">
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

export function MasterList({ masters, services, busyId, onCreate, onEdit, onDelete }: MasterListProps) {
  return (
    <section aria-labelledby="studio-masters-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="studio-masters-title" className="font-display text-h3 font-light text-text">
            Мастера
          </h2>
          <p className="mt-1 text-[13px] tabular-nums text-text-muted">
            {masters.length} {plural(masters.length, ["мастер", "мастера", "мастеров"])}
          </p>
        </div>
        <AdminButton size="sm" variant="ghost" onClick={onCreate}>
          Добавить мастера
        </AdminButton>
      </header>

      {masters.length === 0 ? (
        <div className="mt-3 border border-line bg-surface px-4 py-6 text-center">
          <p className="text-[13px] text-text">
            Пока нет мастеров — гость не сможет выбрать, к кому записаться.
          </p>
          <AdminButton className="mt-3" size="sm" onClick={onCreate}>
            Добавить мастера
          </AdminButton>
        </div>
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {masters.map((master) => (
            <MasterCard
              key={master.id}
              master={master}
              services={services}
              busy={busyId === master.id}
              onEdit={() => onEdit(master)}
              onDelete={() => onDelete(master)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
