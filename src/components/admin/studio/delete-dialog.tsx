"use client";

import type { FutureBookingRef } from "@/lib/admin-client";
import { AdminButton, ConfirmDialog, Modal } from "@/components/admin/admin-ui";
import { formatDayShort } from "@/components/admin/dates";

export interface DeleteTarget {
  kind: "service" | "master";
  id: string;
  name: string;
}

export type DeleteConflictState =
  | { kind: "bookings"; name: string; bookings: FutureBookingRef[] }
  | { kind: "masters"; name: string; masters: string[] };

interface DeleteConfirmDialogProps {
  target: DeleteTarget | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ target, busy, onCancel, onConfirm }: DeleteConfirmDialogProps) {
  const noun = target?.kind === "master" ? "мастера" : "услугу";

  return (
    <ConfirmDialog
      open={target !== null}
      title={target?.kind === "master" ? "Удалить мастера?" : "Удалить услугу?"}
      text={target ? `Удалить ${noun} «${target.name}»? Действие необратимо.` : ""}
      confirmLabel="Удалить"
      busyLabel="Удаляем…"
      busy={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

interface DeleteConflictDialogProps {
  conflict: DeleteConflictState | null;
  onClose: () => void;
}

/**
 * `409 delete_conflict`: удаление блокируют будущие брони или мастера,
 * которые ведут услугу. Показываем, что именно мешает.
 */
export function DeleteConflictDialog({ conflict, onClose }: DeleteConflictDialogProps) {
  const isBookings = conflict?.kind === "bookings";

  return (
    <Modal
      open={conflict !== null}
      onClose={onClose}
      title={isBookings ? "Сначала отмените эти записи" : "Нельзя удалить услугу"}
      description={
        conflict
          ? isBookings
            ? `«${conflict.name}» нельзя удалить: на неё ещё есть подтверждённые записи. Отмените или перенесите их — и повторите.`
            : `Услуга используется мастерами: ${conflict.masters.join(", ")}. Сначала переназначьте им другие услуги.`
          : undefined
      }
      className="sm:max-w-lg"
    >
      {conflict?.kind === "bookings" ? (
        <>
          <ul className="border border-line">
            <li
              aria-hidden="true"
              className="hidden border-b border-line px-3 py-2 text-micro font-medium uppercase text-text-muted sm:grid sm:grid-cols-[5.5rem_5rem_1fr_auto] sm:gap-3"
            >
              <span>Код</span>
              <span>Дата</span>
              <span>Гость</span>
              <span>Время</span>
            </li>
            {conflict.bookings.map((booking) => (
              <li
                key={booking.code}
                className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-line px-3 py-2.5 text-[13px] last:border-b-0 sm:grid-cols-[5.5rem_5rem_1fr_auto] sm:items-center"
              >
                <span className="font-medium tabular-nums text-text">{booking.code}</span>
                <span className="tabular-nums text-text-muted">{formatDayShort(booking.date)}</span>
                <span className="col-span-2 truncate text-text-muted sm:col-span-1">{booking.name}</span>
                <span className="row-start-1 justify-self-end tabular-nums text-text-muted sm:row-auto">
                  {booking.time}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[12px] text-text-muted">
            Код ищется в календаре: откройте день записи и отмените её, либо перенесите гостя на другое
            время.
          </p>
        </>
      ) : null}

      <div className="mt-6 flex justify-end">
        <AdminButton variant="primary" onClick={onClose}>
          Понятно
        </AdminButton>
      </div>
    </Modal>
  );
}
