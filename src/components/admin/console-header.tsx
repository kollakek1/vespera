"use client";

import type { AdminMasterOption } from "@/lib/admin-client";
import { cn } from "@/components/ui/cn";
import { AdminButton, IconButton, Segmented, SelectInput, type SelectOption } from "@/components/admin/admin-ui";
import {
  formatDayLong,
  formatDayShort,
  formatMonthTitle,
  formatWeekdayShort,
  todayKey,
} from "@/components/admin/dates";

export type AdminView = "month" | "day";
export type AdminSection = "calendar" | "studio" | "admins";

export const STATUS_OPTIONS = [
  { value: "all", label: "Все статусы" },
  { value: "confirmed", label: "Подтверждены" },
  { value: "completed", label: "Завершены" },
  { value: "cancelled", label: "Отменены" },
  { value: "no_show", label: "Неявки" },
] as const;

interface ConsoleHeaderProps {
  section: AdminSection;
  view: AdminView;
  month: string;
  date: string;
  masterId: string;
  status: string;
  masters: AdminMasterOption[];
  /** Раздел «Администраторы» видят только владельцы. */
  canManageAdmins: boolean;
  onSection: (section: AdminSection) => void;
  onView: (view: AdminView) => void;
  onShift: (delta: number) => void;
  onToday: () => void;
  onMaster: (masterId: string) => void;
  onStatus: (status: string) => void;
  onManual: () => void;
  onLogout: () => void;
}

export function ConsoleHeader({
  section,
  view,
  month,
  date,
  masterId,
  status,
  masters,
  canManageAdmins,
  onSection,
  onView,
  onShift,
  onToday,
  onMaster,
  onStatus,
  onManual,
  onLogout,
}: ConsoleHeaderProps) {
  const today = todayKey();
  const isToday = view === "day" ? date === today : month === today.slice(0, 7);

  const sectionOptions: { value: AdminSection; label: string }[] = [
    { value: "calendar", label: "Календарь" },
    { value: "studio", label: "Студия" },
    ...(canManageAdmins
      ? [{ value: "admins" as const, label: "Администраторы" }]
      : []),
  ];

  const masterOptions: SelectOption[] = [
    { value: "all", label: "Все мастера" },
    ...masters.map((master) => ({ value: master.id, label: master.name, group: "Мастера" })),
  ];
  const statusOptions: SelectOption[] = STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-2.5 px-4 py-2.5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[13px] font-light uppercase tracking-[0.38em] -mr-[0.38em]">
              Vespera
            </span>
            <span className="text-micro font-medium uppercase text-text-muted">Console</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-micro font-medium uppercase text-text-muted tabular-nums sm:inline">
              {formatDayLong(today)}
            </span>
            <AdminButton size="sm" variant="subtle" onClick={onLogout}>
              Выйти
            </AdminButton>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Раздел консоли"
            value={section}
            options={sectionOptions}
            onChange={onSection}
          />

          {section === "calendar" ? (
            <>
              <Segmented
                label="Вид календаря"
                value={view}
                options={[
                  { value: "month", label: "Месяц" },
                  { value: "day", label: "День" },
                ]}
                onChange={onView}
              />

              <div className="flex items-center gap-1">
                <IconButton
                  aria-label={view === "month" ? "Предыдущий месяц" : "Предыдущий день"}
                  onClick={() => onShift(-1)}
                >
                  <span aria-hidden="true">←</span>
                </IconButton>
                <span
                  className={cn(
                    "truncate px-1 text-center text-small text-text first-letter:uppercase",
                    view === "month"
                      ? "min-w-[8.5rem]"
                      : "w-[7.5rem] sm:w-auto sm:min-w-[8.5rem]",
                    isToday && "text-accent-text",
                  )}
                >
                  {view === "month" ? (
                    formatMonthTitle(month)
                  ) : (
                    <>
                      <span className="sm:hidden">
                        {formatDayShort(date)}, {formatWeekdayShort(date)}
                      </span>
                      <span className="hidden sm:inline">{formatDayLong(date)}</span>
                    </>
                  )}
                </span>
                <IconButton
                  aria-label={view === "month" ? "Следующий месяц" : "Следующий день"}
                  onClick={() => onShift(1)}
                >
                  <span aria-hidden="true">→</span>
                </IconButton>
                <AdminButton size="sm" variant="ghost" onClick={onToday} className="ml-1">
                  Сегодня
                </AdminButton>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="admin-master-filter">
                  Мастер
                </label>
                <SelectInput
                  id="admin-master-filter"
                  value={masterId}
                  onChange={onMaster}
                  options={masterOptions}
                  className="h-9 w-[10rem] text-[13px]"
                />

                <label className="sr-only" htmlFor="admin-status-filter">
                  Статус
                </label>
                <SelectInput
                  id="admin-status-filter"
                  value={status}
                  onChange={onStatus}
                  options={statusOptions}
                  className="h-9 w-[10rem] text-[13px]"
                />

                <AdminButton variant="primary" size="md" onClick={onManual} className="w-full sm:w-auto">
                  Записать вручную
                </AdminButton>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
