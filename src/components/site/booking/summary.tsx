"use client";

import type { StudioMaster, StudioService } from "@/lib/studio";
import { findMaster, findService } from "@/components/site/catalog";
import { formatPrice } from "@/components/ui/format";
import { formatDateLong } from "./dates";

interface SummaryProps {
  services: StudioService[];
  masters: StudioMaster[];
  serviceId: string | null;
  masterId: string | null;
  date: string | null;
  time: string | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-micro font-medium uppercase text-text-muted">{label}</dt>
      <dd className="mt-1 text-small text-text">{value}</dd>
    </div>
  );
}

function resolve(
  services: StudioService[],
  masters: StudioMaster[],
  serviceId: string | null,
  masterId: string | null,
  date: string | null,
  time: string | null,
) {
  const service = findService(services, serviceId);
  const master = findMaster(masters, masterId);
  return {
    service,
    master,
    price: service ? formatPrice(service.priceRub) : "—",
    compact: [service?.name ?? "Услуга", time ?? "время", service ? formatPrice(service.priceRub) : "—"].join(" · "),
    date: date ? formatDateLong(date) : "Не выбрана",
    time: time ?? "Не выбрано",
  };
}

/** Сводка для десктопа: липкая колонка справа. */
export function Summary({ services, masters, serviceId, masterId, date, time }: SummaryProps) {
  const summary = resolve(services, masters, serviceId, masterId, date, time);

  return (
    <aside
      aria-label="Ваша запись"
      className="border border-line p-5 md:p-7 lg:sticky lg:top-24"
    >
      <p className="text-micro font-medium uppercase text-text-muted">Ваша запись</p>

      <dl className="mt-6 grid grid-cols-1 gap-4">
        <Row label="Услуга" value={summary.service?.name ?? "Не выбрана"} />
        <Row label="Мастер" value={summary.master?.name ?? "Не выбран"} />
        <Row label="Дата" value={summary.date} />
        <Row label="Время" value={summary.time} />
      </dl>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-4">
        <span className="text-micro font-medium uppercase text-text-muted">Итого</span>
        <span className="text-price tabular-nums text-text" aria-live="polite">
          {summary.price}
        </span>
      </div>

      <p className="mt-4 text-small text-text-muted">Оплата в студии. Отмена — за 6 часов.</p>
    </aside>
  );
}

/** Мобильная сводка: две строки над кнопкой, детали раскрываются. */
export function SummaryBar({ services, masters, serviceId, masterId, date, time }: SummaryProps) {
  const summary = resolve(services, masters, serviceId, masterId, date, time);

  return (
    <details className="border border-line px-4 lg:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-small text-text marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="truncate">{summary.compact}</span>
        <span className="shrink-0 text-micro font-medium uppercase text-text-muted">Детали</span>
      </summary>
      <dl className="grid grid-cols-2 gap-3 border-t border-line py-3">
        <Row label="Мастер" value={summary.master?.name ?? "Не выбран"} />
        <Row label="Дата" value={summary.date} />
        <Row label="Время" value={summary.time} />
        <Row label="Итого" value={summary.price} />
      </dl>
    </details>
  );
}
