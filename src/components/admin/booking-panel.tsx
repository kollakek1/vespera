"use client";

import { useCallback, useId, useState, type ReactNode } from "react";

import { STATUS_LABELS } from "@/lib/admin-api";
import type { AdminBookingView } from "@/lib/admin-client";
import { formatPhoneForDisplay } from "@/lib/booking";
import type { BookingStatus } from "@/lib/booking";
import { cn } from "@/components/ui/cn";
import {
  AdminButton,
  ConfirmDialog,
  IconButton,
  StatusBadge,
  TextArea,
} from "@/components/admin/admin-ui";
import { formatDayLong, formatMoney, formatStamp } from "@/components/admin/dates";
import { useDialogFocus } from "@/components/admin/use-dialog-focus";

interface BookingPanelProps {
  booking: AdminBookingView;
  variant: "aside" | "sheet";
  busy: boolean;
  onClose: () => void;
  onChangeStatus: (status: BookingStatus) => void | Promise<void>;
  onSaveNote: (note: string) => Promise<void>;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-micro font-medium uppercase text-text-muted">{label}</dt>
      <dd className="mt-1 text-[13px] text-text">{children}</dd>
    </div>
  );
}

function NoteEditor({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (note: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const changed = draft.trim() !== initial.trim();

  const submit = async () => {
    if (!changed || saving) return;
    setSaving(true);
    try {
      await onSave(draft.trim());
    } catch {
      // Ошибку уже показал родитель; черновик остаётся в поле.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label
        htmlFor="booking-note"
        className="block text-micro font-medium uppercase text-text-muted"
      >
        Внутренняя заметка
      </label>
      <TextArea
        id="booking-note"
        value={draft}
        maxLength={1000}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Видно только администратору"
        className="mt-1.5"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[12px] text-text-muted">{draft.length}/1000</span>
        <AdminButton
          size="sm"
          variant="ghost"
          onClick={submit}
          disabled={!changed || saving}
          aria-busy={saving}
        >
          {saving ? "Сохраняем…" : "Сохранить заметку"}
        </AdminButton>
      </div>
    </div>
  );
}

function PanelBody({
  booking,
  busy,
  onClose,
  onChangeStatus,
  onSaveNote,
  titleId,
}: Omit<BookingPanelProps, "variant"> & { titleId: string }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const noteKey = `${booking.code}:${booking.note ?? ""}`;

  const saveNote = useCallback((note: string) => onSaveNote(note), [onSaveNote]);

  const isCancelled = booking.status === "cancelled";
  const canReturn = booking.status === "completed" || booking.status === "no_show";

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
        <div className="min-w-0">
          <p id={titleId} className="font-display text-[20px] font-light tracking-[0.04em] text-text">
            {booking.code}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={booking.status} />
            {booking.createdBy === "public" ? (
              <span className="text-micro uppercase text-text-muted">с сайта</span>
            ) : (
              <span className="text-micro uppercase text-text-muted">вручную</span>
            )}
          </div>
        </div>
        <IconButton aria-label="Закрыть карточку" onClick={onClose} className="-mr-1 -mt-1 border-transparent">
          <span aria-hidden="true" className="relative block size-4">
            <span className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-current" />
            <span className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-current" />
          </span>
        </IconButton>
      </div>

      <div className="border-b border-line py-4">
        <div className="flex flex-wrap gap-2">
          {booking.status === "confirmed" ? (
            <>
              <AdminButton
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => onChangeStatus("completed")}
              >
                Завершить
              </AdminButton>
              <AdminButton size="sm" disabled={busy} onClick={() => onChangeStatus("no_show")}>
                Не пришёл
              </AdminButton>
              <AdminButton
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmCancel(true)}
                className="ml-auto"
              >
                Отменить
              </AdminButton>
            </>
          ) : null}

          {canReturn ? (
            <div className="flex flex-wrap items-center gap-3">
              <AdminButton
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => onChangeStatus("confirmed")}
              >
                Подтвердить
              </AdminButton>
              <span className="text-[12px] text-text-muted">вернёт слот в расписание</span>
            </div>
          ) : null}

          {isCancelled ? (
            <div className="flex flex-wrap items-center gap-3">
              <AdminButton
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => onChangeStatus("confirmed")}
              >
                Вернуть в расписание
              </AdminButton>
              <span className="text-[12px] text-text-muted">
                слот свободен — вернём, если время ещё не заняли
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-b border-line py-4">
        <Detail label="Услуга">{booking.service?.name ?? "—"}</Detail>
        <Detail label="Длительность">{booking.durationMin} мин</Detail>
        <Detail label="Мастер">{booking.master?.name ?? "—"}</Detail>
        <Detail label="Стоимость">{formatMoney(booking.priceRub)}</Detail>
        <Detail label="Дата">
          <span className="u-inline-block first-letter:uppercase">{formatDayLong(booking.date)}</span>
        </Detail>
        <Detail label="Время">
          <span className="tabular-nums">{booking.time}</span>
        </Detail>
      </div>

      <div className="grid gap-3 border-b border-line py-4">
        <Detail label="Гость">{booking.name}</Detail>
        <Detail label="Телефон">
          <a
            href={`tel:${booking.phone}`}
            className="tabular-nums underline decoration-line-strong decoration-1 underline-offset-4 transition-colors duration-[180ms] ease-brand hover:decoration-accent-text"
          >
            {formatPhoneForDisplay(booking.phone)}
          </a>
        </Detail>
        <Detail label="Почта">
          {booking.email ? (
            <a
              href={`mailto:${booking.email}`}
              className="break-all underline decoration-line-strong decoration-1 underline-offset-4 transition-colors duration-[180ms] ease-brand hover:decoration-accent-text"
            >
              {booking.email}
            </a>
          ) : (
            "—"
          )}
        </Detail>
        {booking.comment ? (
          <Detail label="Комментарий гостя">
            <span className="block border-l border-line pl-3 text-text-muted">{booking.comment}</span>
          </Detail>
        ) : null}
      </div>

      <div className="border-b border-line py-4">
        <NoteEditor key={noteKey} initial={booking.note ?? ""} onSave={saveNote} />
      </div>

      <div className="pt-4">
        <p className="text-micro font-medium uppercase text-text-muted">История</p>
        <ol className="mt-2 flex flex-col gap-1.5">
          {booking.history.map((entry, index) => (
            <li
              key={`${entry.at}-${index}`}
              className="flex items-baseline justify-between gap-3 text-[12px] text-text-muted"
            >
              <span className="tabular-nums">{formatStamp(entry.at)}</span>
              <span className="flex-1 truncate text-text">
                {STATUS_LABELS[entry.status]}
                <span className="text-text-muted"> · {entry.by === "admin" ? "админ" : "гость"}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Отменить запись?"
        text={`${booking.name}, ${booking.date} в ${booking.time}. Слот освободится сразу; вернуть запись можно, пока это время не заняли.`}
        confirmLabel="Отменить запись"
        busyLabel="Отменяем…"
        busy={busy}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          const request = onChangeStatus("cancelled");
          if (request instanceof Promise) request.finally(() => setConfirmCancel(false));
          else setConfirmCancel(false);
        }}
      />
    </>
  );
}

export function BookingPanel(props: BookingPanelProps) {
  const { booking, variant, busy, onClose, onChangeStatus, onSaveNote } = props;
  const titleId = useId();
  const handleClose = useCallback(() => onClose(), [onClose]);
  const ref = useDialogFocus(variant === "sheet", handleClose);

  if (variant === "sheet") {
    return (
      <div className="fixed inset-0 z-[80] flex items-end">
        <button
          type="button"
          aria-label="Закрыть карточку"
          tabIndex={-1}
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-bg/80"
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "admin-scroll relative max-h-[88svh] w-full overflow-y-auto border-t border-line bg-bg px-4 pb-8 pt-4",
          )}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-pill bg-line-strong" aria-hidden="true" />
          <PanelBody
            booking={booking}
            busy={busy}
            onClose={onClose}
            onChangeStatus={onChangeStatus}
            onSaveNote={onSaveNote}
            titleId={titleId}
          />
        </div>
      </div>
    );
  }

  return (
    <aside
      aria-labelledby={titleId}
      className="admin-scroll border border-line bg-bg p-4 xl:sticky xl:top-[132px] xl:max-h-[calc(100svh-148px)] xl:overflow-y-auto"
    >
      <PanelBody
        booking={booking}
        busy={busy}
        onClose={onClose}
        onChangeStatus={onChangeStatus}
        onSaveNote={onSaveNote}
        titleId={titleId}
      />
    </aside>
  );
}
