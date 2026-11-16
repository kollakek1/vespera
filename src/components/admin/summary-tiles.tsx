import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { formatDayLong, formatMoney, formatMonthTitle } from "@/components/admin/dates";

interface SummaryTilesProps {
  view: "month" | "day";
  month: string;
  date: string;
  total: number;
  revenueRub: number;
  loadPercent: number;
  cancelled: number;
  noShow: number;
}

function Tile({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-between border border-line bg-bg p-3 md:p-4">
      <p className="text-micro font-medium uppercase text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-3 whitespace-nowrap font-sans text-[24px] font-medium leading-none tabular-nums md:text-[26px]",
          accent ? "text-accent-text" : "text-text",
        )}
      >
        {value}
      </p>
      <p className="mt-2 hidden truncate text-[12px] text-text-muted sm:block">{note}</p>
    </div>
  );
}

export function SummaryTiles({
  view,
  month,
  date,
  total,
  revenueRub,
  loadPercent,
  cancelled,
  noShow,
}: SummaryTilesProps) {
  const scope = view === "day" ? formatDayLong(date) : formatMonthTitle(month);

  return (
    <section
      aria-label="Сводка за период"
      className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3"
    >
      <Tile label="Записей" value={total} note={scope} />
      <Tile label="Выручка" value={formatMoney(revenueRub)} note="по визитам" />
      <Tile
        label="Загрузка"
        value={`${loadPercent}%`}
        note="от доступных минут"
        accent={loadPercent >= 80}
      />
      <Tile
        label="Отмен"
        value={cancelled}
        note={noShow > 0 ? `неявок: ${noShow}` : "за период"}
      />
    </section>
  );
}
