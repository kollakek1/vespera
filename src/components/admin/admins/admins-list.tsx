"use client";

import type { AdminAccount } from "@/lib/admin-client";
import { cn } from "@/components/ui/cn";
import { AdminButton } from "@/components/admin/admin-ui";
import { formatLastLogin, plural } from "@/components/admin/dates";

interface AdminsListProps {
  admins: AdminAccount[];
  currentAdminId: string | null;
  busyId: string | null;
  onCreate: () => void;
  onEdit: (admin: AdminAccount) => void;
  onPassword: (admin: AdminAccount) => void;
  onActivate: (admin: AdminAccount) => void;
  onDeactivate: (admin: AdminAccount) => void;
}

/** Одна сетка на заголовок и строки: колонки не разъезжаются. */
const COLUMNS = "lg:grid-cols-[minmax(0,1fr)_104px_112px_152px_260px]";

function RoleLabel({ role }: { role: AdminAccount["role"] }) {
  return (
    <span className={cn("text-[13px]", role === "owner" ? "text-text" : "text-text-muted")}>
      {role === "owner" ? "Владелец" : "Менеджер"}
    </span>
  );
}

function StatusLabel({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px]",
        active ? "text-text" : "text-text-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-pill", active ? "bg-accent" : "bg-line-strong")}
      />
      {active ? "Активен" : "Отключён"}
    </span>
  );
}

function AdminRow({
  admin,
  isSelf,
  busy,
  onEdit,
  onPassword,
  onActivate,
  onDeactivate,
}: {
  admin: AdminAccount;
  isSelf: boolean;
  busy: boolean;
  onEdit: () => void;
  onPassword: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  return (
    <li
      className={cn(
        "flex flex-col border-b border-line px-3 py-3 transition-colors duration-[120ms] hover:bg-surface-hover last:border-b-0",
        "lg:grid lg:items-center lg:gap-x-3 lg:py-3",
        COLUMNS,
      )}
    >
      <div className="min-w-0">
        <p className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[14px] text-text" title={admin.name}>
            {admin.name}
          </span>
          {isSelf ? (
            <span className="shrink-0 text-micro uppercase text-text-muted">вы</span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-text-muted" title={admin.email}>
          {admin.email}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 lg:mt-0 lg:block">
        <span className="text-[12px] text-text-muted lg:hidden">Роль:</span>
        <RoleLabel role={admin.role} />
        <span aria-hidden="true" className="text-text-muted lg:hidden">
          ·
        </span>
        <span className="lg:hidden">
          <StatusLabel active={admin.active} />
        </span>
      </div>

      <div className="hidden lg:col-start-3 lg:block">
        <StatusLabel active={admin.active} />
      </div>

      <p className="mt-1 text-[12px] tabular-nums text-text-muted lg:col-start-4 lg:mt-0 lg:text-[13px]">
        <span className="lg:hidden">Последний вход: </span>
        {formatLastLogin(admin.lastLoginAt)}
      </p>

      <div className="mt-3 flex flex-wrap justify-end gap-1.5 lg:col-start-5 lg:mt-0">
        {isSelf ? (
          <AdminButton size="sm" variant="subtle" onClick={onPassword} disabled={busy}>
            Сменить пароль
          </AdminButton>
        ) : (
          <>
            <AdminButton size="sm" variant="subtle" onClick={onEdit} disabled={busy}>
              Изменить
            </AdminButton>
            <AdminButton size="sm" variant="subtle" onClick={onPassword} disabled={busy}>
              Пароль
            </AdminButton>
            {admin.active ? (
              <AdminButton size="sm" variant="danger" onClick={onDeactivate} disabled={busy}>
                Отключить
              </AdminButton>
            ) : (
              <AdminButton size="sm" variant="subtle" onClick={onActivate} disabled={busy} aria-busy={busy}>
                Включить
              </AdminButton>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function AdminsList({
  admins,
  currentAdminId,
  busyId,
  onCreate,
  onEdit,
  onPassword,
  onActivate,
  onDeactivate,
}: AdminsListProps) {
  return (
    <section aria-labelledby="admins-list-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="admins-list-title" className="font-display text-h3 font-light text-text">
            Доступ в консоль
          </h2>
          <p className="mt-1 text-[13px] tabular-nums text-text-muted">
            {admins.length} {plural(admins.length, ["человек", "человека", "человек"])}
          </p>
        </div>
        <AdminButton size="sm" variant="ghost" onClick={onCreate}>
          Добавить администратора
        </AdminButton>
      </header>

      {admins.length === 0 ? (
        <div className="mt-3 border border-line bg-surface px-4 py-6 text-center">
          <p className="text-[13px] text-text">Список пуст — добавьте первого администратора.</p>
          <AdminButton className="mt-3" size="sm" onClick={onCreate}>
            Добавить администратора
          </AdminButton>
        </div>
      ) : (
        <ul className="mt-3 border-y border-line">
          <li
            className={cn(
              "hidden border-b border-line px-3 py-2 text-micro font-medium uppercase text-text-muted",
              "lg:grid lg:items-center lg:gap-x-3",
              COLUMNS,
            )}
          >
            <span>Администратор</span>
            <span>Роль</span>
            <span>Статус</span>
            <span>Последний вход</span>
            <span />
          </li>

          {admins.map((admin) => (
            <AdminRow
              key={admin.id}
              admin={admin}
              isSelf={admin.id === currentAdminId}
              busy={busyId === admin.id}
              onEdit={() => onEdit(admin)}
              onPassword={() => onPassword(admin)}
              onActivate={() => onActivate(admin)}
              onDeactivate={() => onDeactivate(admin)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
