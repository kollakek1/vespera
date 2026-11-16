"use client";

import { useCallback, useState } from "react";

import {
  adminClient,
  adminErrorMessage,
  isUnauthorized,
  readDeleteConflict,
  type MasterPayload,
  type ServicePayload,
  type StudioMaster,
  type StudioService,
} from "@/lib/admin-client";
import { AdminButton, Skeleton, type ToastMessage } from "@/components/admin/admin-ui";
import { formatStamp } from "@/components/admin/dates";
import {
  DeleteConflictDialog,
  DeleteConfirmDialog,
  type DeleteConflictState,
  type DeleteTarget,
} from "./delete-dialog";
import { MasterFormDialog } from "./master-form-dialog";
import { MasterList } from "./master-list";
import { ServiceFormDialog } from "./service-form-dialog";
import { ServiceList } from "./service-list";
import { useStudioData } from "./use-studio-data";

type ToastTone = ToastMessage["tone"];

export interface StudioSectionProps {
  onToast: (tone: ToastTone, text: string) => void;
  onUnauthorized: () => void;
}

type ServiceFormState = { mode: "create" } | { mode: "edit"; service: StudioService } | null;
type MasterFormState = { mode: "create" } | { mode: "edit"; master: StudioMaster } | null;

function StudioSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-7 w-40" />
        <div className="mt-3 border-y border-line">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-14 border-b border-line last:border-b-0" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-7 w-36" />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </div>
    </div>
  );
}

/**
 * Раздел «Студия»: услуги и мастера каталога.
 * Мутации без оптимизма: сначала ответ сервера, потом перезапрос каталога.
 */
export function StudioSection({ onToast, onUnauthorized }: StudioSectionProps) {
  const data = useStudioData({ enabled: true, onUnauthorized });

  const [serviceForm, setServiceForm] = useState<ServiceFormState>(null);
  const [masterForm, setMasterForm] = useState<MasterFormState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [conflict, setConflict] = useState<DeleteConflictState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { refresh } = data;

  const submitService = useCallback(
    async (payload: ServicePayload, id: string | null) => {
      try {
        const response = id
          ? await adminClient.updateService(id, payload)
          : await adminClient.createService(payload);
        setServiceForm(null);
        onToast(
          "success",
          id
            ? `Услуга «${response.service.name}» сохранена`
            : `Услуга «${response.service.name}» создана`,
        );
        refresh();
      } catch (caught: unknown) {
        if (isUnauthorized(caught)) onUnauthorized();
        throw caught;
      }
    },
    [onToast, onUnauthorized, refresh],
  );

  const submitMaster = useCallback(
    async (payload: MasterPayload, id: string | null) => {
      try {
        const response = id
          ? await adminClient.updateMaster(id, payload)
          : await adminClient.createMaster(payload);
        setMasterForm(null);
        onToast(
          "success",
          id
            ? `Мастер «${response.master.name}» сохранён`
            : `Мастер «${response.master.name}» создан`,
        );
        refresh();
      } catch (caught: unknown) {
        if (isUnauthorized(caught)) onUnauthorized();
        throw caught;
      }
    },
    [onToast, onUnauthorized, refresh],
  );

  const confirmDelete = useCallback(async () => {
    const target = deleteTarget;
    if (!target || deleteBusy) return;

    setDeleteBusy(true);
    setBusyId(target.id);
    try {
      if (target.kind === "service") await adminClient.deleteService(target.id);
      else await adminClient.deleteMaster(target.id);

      setDeleteTarget(null);
      onToast("success", target.kind === "service" ? "Услуга удалена" : "Мастер удалён");
      refresh();
    } catch (caught: unknown) {
      if (isUnauthorized(caught)) {
        onUnauthorized();
        return;
      }

      const result = readDeleteConflict(caught);
      if (result) {
        setDeleteTarget(null);
        setConflict(
          result.kind === "bookings"
            ? { kind: "bookings", name: target.name, bookings: result.bookings }
            : { kind: "masters", name: target.name, masters: result.masters },
        );
        return;
      }

      onToast("error", adminErrorMessage(caught, "Не удалось удалить"));
    } finally {
      setDeleteBusy(false);
      setBusyId(null);
    }
  }, [deleteTarget, deleteBusy, onToast, onUnauthorized, refresh]);

  const loading = data.status === "loading" && data.services.length === 0 && data.masters.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-micro font-medium uppercase text-text-muted">Каталог</p>
          <h2 className="mt-1 font-display text-h3 font-light text-text">Студия</h2>
          <p className="mt-2 max-w-[62ch] text-[13px] text-text-muted">
            Услуги и мастера, которых видит гость. Изменения сразу попадают в запись, удаление
            окончательное.
          </p>
        </div>
        {data.updatedAt ? (
          <p className="text-[12px] tabular-nums text-text-muted">
            обновлено {formatStamp(data.updatedAt)}
          </p>
        ) : null}
      </header>

      {data.status === "error" ? (
        <div className="border border-line bg-surface px-4 py-3">
          <p role="alert" className="text-[13px] text-text">
            {data.error ?? "Не удалось загрузить каталог"}
          </p>
          <AdminButton size="sm" className="mt-3" onClick={data.refresh}>
            Повторить
          </AdminButton>
        </div>
      ) : null}

      {loading ? (
        <StudioSkeleton />
      ) : (
        <>
          <ServiceList
            services={data.services}
            masters={data.masters}
            busyId={busyId}
            onCreate={() => setServiceForm({ mode: "create" })}
            onEdit={(service) => setServiceForm({ mode: "edit", service })}
            onDelete={(service) =>
              setDeleteTarget({ kind: "service", id: service.id, name: service.name })
            }
          />

          <MasterList
            masters={data.masters}
            services={data.services}
            busyId={busyId}
            onCreate={() => setMasterForm({ mode: "create" })}
            onEdit={(master) => setMasterForm({ mode: "edit", master })}
            onDelete={(master) => setDeleteTarget({ kind: "master", id: master.id, name: master.name })}
          />
        </>
      )}

      {serviceForm ? (
        <ServiceFormDialog
          key={serviceForm.mode === "edit" ? serviceForm.service.id : "new-service"}
          service={serviceForm.mode === "edit" ? serviceForm.service : null}
          onClose={() => setServiceForm(null)}
          onSubmit={submitService}
        />
      ) : null}

      {masterForm ? (
        <MasterFormDialog
          key={masterForm.mode === "edit" ? masterForm.master.id : "new-master"}
          master={masterForm.mode === "edit" ? masterForm.master : null}
          services={data.services}
          onClose={() => setMasterForm(null)}
          onSubmit={submitMaster}
        />
      ) : null}

      <DeleteConfirmDialog
        target={deleteTarget}
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          void confirmDelete();
        }}
      />

      <DeleteConflictDialog conflict={conflict} onClose={() => setConflict(null)} />
    </div>
  );
}
