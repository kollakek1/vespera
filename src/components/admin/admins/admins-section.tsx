"use client";

import { useCallback, useState } from "react";

import {
  OWNER_ONLY_MESSAGE,
  adminClient,
  isUnauthorized,
  type AdminAccount,
  type AdminPasswordPayload,
  type CreateAdminPayload,
  type UpdateAdminPayload,
} from "@/lib/admin-client";
import { AdminButton, Skeleton, type ToastMessage } from "@/components/admin/admin-ui";
import { AdminFormDialog, AdminPasswordDialog, DeactivateAdminDialog } from "./admin-dialogs";
import { AdminsList } from "./admins-list";
import { adminAccountsMessage } from "./admins-errors";
import { useAdminAccounts } from "./use-admin-accounts";

type ToastTone = ToastMessage["tone"];

export interface AdminsSectionProps {
  currentAdminId: string | null;
  onToast: (tone: ToastTone, text: string) => void;
  onUnauthorized: () => void;
}

type FormState = { mode: "create" } | { mode: "edit"; admin: AdminAccount } | null;

function AdminsSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-7 w-44" />
      <div className="mt-3 border-y border-line">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-16 border-b border-line last:border-b-0" />
        ))}
      </div>
    </div>
  );
}

/**
 * Раздел «Администраторы» — только владелец.
 * Мутации без оптимизма: сначала ответ сервера, потом перезапрос списка.
 */
export function AdminsSection({ currentAdminId, onToast, onUnauthorized }: AdminsSectionProps) {
  const data = useAdminAccounts({ enabled: true, onUnauthorized });
  const { refresh } = data;

  const [form, setForm] = useState<FormState>(null);
  const [passwordTarget, setPasswordTarget] = useState<AdminAccount | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminAccount | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const createAdmin = useCallback(
    async (payload: CreateAdminPayload) => {
      try {
        const response = await adminClient.createAdmin(payload);
        setForm(null);
        onToast("success", `Администратор «${response.admin.name}» создан`);
        refresh();
      } catch (caught: unknown) {
        if (isUnauthorized(caught)) onUnauthorized();
        throw caught;
      }
    },
    [onToast, onUnauthorized, refresh],
  );

  const updateAdmin = useCallback(
    async (id: string, payload: UpdateAdminPayload) => {
      try {
        await adminClient.updateAdmin(id, payload);
        setForm(null);
        onToast("success", "Изменения сохранены");
        refresh();
      } catch (caught: unknown) {
        if (isUnauthorized(caught)) onUnauthorized();
        throw caught;
      }
    },
    [onToast, onUnauthorized, refresh],
  );

  const changePassword = useCallback(
    async (id: string, payload: AdminPasswordPayload) => {
      try {
        const response = await adminClient.setAdminPassword(id, payload);
        setPasswordTarget(null);
        onToast(
          "success",
          id === currentAdminId
            ? "Пароль изменён"
            : `Пароль для «${response.admin.name}» обновлён`,
        );
        refresh();
      } catch (caught: unknown) {
        if (isUnauthorized(caught)) onUnauthorized();
        throw caught;
      }
    },
    [currentAdminId, onToast, onUnauthorized, refresh],
  );

  const activate = useCallback(
    async (admin: AdminAccount) => {
      if (busyId !== null) return;
      setBusyId(admin.id);
      try {
        await adminClient.updateAdmin(admin.id, { active: true });
        onToast("success", `Доступ для «${admin.name}» включён`);
        refresh();
      } catch (caught: unknown) {
        if (isUnauthorized(caught)) {
          onUnauthorized();
          return;
        }
        onToast("error", adminAccountsMessage(caught, "Не удалось изменить доступ"));
      } finally {
        setBusyId(null);
      }
    },
    [busyId, onToast, onUnauthorized, refresh],
  );

  const confirmDeactivate = useCallback(async () => {
    const target = deactivateTarget;
    if (!target || busyId !== null) return;

    setBusyId(target.id);
    try {
      await adminClient.deactivateAdmin(target.id);
      setDeactivateTarget(null);
      onToast("success", `Доступ для «${target.name}» отключён`);
      refresh();
    } catch (caught: unknown) {
      if (isUnauthorized(caught)) {
        onUnauthorized();
        return;
      }
      setDeactivateTarget(null);
      onToast("error", adminAccountsMessage(caught, "Не удалось отключить доступ"));
    } finally {
      setBusyId(null);
    }
  }, [busyId, deactivateTarget, onToast, onUnauthorized, refresh]);

  const loading = data.status === "loading" && data.admins.length === 0;
  const forbidden = data.status === "error" && data.error === OWNER_ONLY_MESSAGE;

  return (
    <div className="flex flex-col gap-6">
      <header className="min-w-0">
        <p className="text-micro font-medium uppercase text-text-muted">Команда</p>
        <h2 className="mt-1 font-display text-h3 font-light text-text">Администраторы</h2>
        {forbidden ? null : (
          <p className="mt-2 max-w-[62ch] text-[13px] text-text-muted">
            Кто входит в консоль студии. Владелец управляет доступами, ролями и паролями. Менеджер
            видит календарь и записи, но не этот раздел.
          </p>
        )}
      </header>

      {data.status === "error" ? (
        <div className="border border-line bg-surface px-4 py-4">
          <p role="alert" className="text-[14px] text-text">
            {data.error ?? "Не удалось загрузить список администраторов"}
          </p>
          {forbidden ? (
            <p className="mt-2 text-[13px] text-text-muted">
              Календарь и записи доступны как обычно — вернитесь в раздел «Календарь».
            </p>
          ) : (
            <AdminButton size="sm" className="mt-3" onClick={refresh}>
              Повторить
            </AdminButton>
          )}
        </div>
      ) : null}

      {loading ? (
        <AdminsSkeleton />
      ) : data.status === "ready" ? (
        <AdminsList
          admins={data.admins}
          currentAdminId={currentAdminId}
          busyId={busyId}
          onCreate={() => setForm({ mode: "create" })}
          onEdit={(admin) => setForm({ mode: "edit", admin })}
          onPassword={setPasswordTarget}
          onActivate={(admin) => {
            void activate(admin);
          }}
          onDeactivate={setDeactivateTarget}
        />
      ) : null}

      {form ? (
        <AdminFormDialog
          key={form.mode === "edit" ? form.admin.id : "new-admin"}
          admin={form.mode === "edit" ? form.admin : null}
          onClose={() => setForm(null)}
          onCreate={createAdmin}
          onUpdate={updateAdmin}
        />
      ) : null}

      {passwordTarget ? (
        <AdminPasswordDialog
          key={passwordTarget.id}
          admin={passwordTarget}
          isSelf={passwordTarget.id === currentAdminId}
          onClose={() => setPasswordTarget(null)}
          onSubmit={changePassword}
        />
      ) : null}

      <DeactivateAdminDialog
        target={deactivateTarget}
        busy={busyId === deactivateTarget?.id}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={() => {
          void confirmDeactivate();
        }}
      />
    </div>
  );
}
