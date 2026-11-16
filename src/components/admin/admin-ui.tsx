"use client";

import {
  useCallback,
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
} from "react";

import { STATUS_LABELS } from "@/lib/admin-api";
import type { BookingStatus } from "@/lib/booking";
import { cn } from "@/components/ui/cn";
import { useDialogFocus } from "@/components/admin/use-dialog-focus";

/* -------------------------------------------------------------------------- */
/* Кнопки                                                                     */
/* -------------------------------------------------------------------------- */

type Variant = "primary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md";

const BUTTON_BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-field border font-sans transition-[background-color,border-color,color] duration-[180ms] ease-brand disabled:cursor-not-allowed disabled:opacity-40";

const BUTTON_SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-sm",
};

const BUTTON_VARIANTS: Record<Variant, string> = {
  primary:
    "border-transparent bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-press focus-visible:outline-[var(--color-text)]",
  ghost: "border-control-border bg-transparent text-text hover:border-sand/60 hover:bg-surface",
  subtle:
    "border-transparent bg-transparent text-text-muted hover:bg-surface hover:text-text",
  danger:
    "border-control-border bg-transparent text-text hover:border-accent hover:bg-surface hover:text-accent-text",
};

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function AdminButton({ variant = "ghost", size = "md", className, type = "button", ...props }: AdminButtonProps) {
  return <button type={type} className={cn(BUTTON_BASE, BUTTON_SIZES[size], BUTTON_VARIANTS[variant], className)} {...props} />;
}

export function IconButton({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-field border border-line text-text-muted transition-colors duration-[180ms] ease-brand hover:border-control-border hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Поля                                                                       */
/* -------------------------------------------------------------------------- */

export const INPUT_CLASS =
  "block h-10 w-full rounded-field border border-control-border bg-transparent px-3 text-[14px] text-text placeholder:text-text-muted transition-colors duration-[180ms] ease-brand hover:border-line-strong focus:border-[var(--color-focus)] disabled:cursor-not-allowed disabled:text-text-disabled";

export const TEXTAREA_CLASS = cn(
  INPUT_CLASS,
  "h-auto min-h-24 resize-y py-2 text-[13px] leading-relaxed",
);

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  /** id для текста ошибки: на него ссылается `aria-describedby` контрола. */
  errorId?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, errorId, className, children }: FieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-micro font-medium uppercase text-text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="mt-1.5 text-[13px] text-accent-text">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ className, ...props }: ComponentPropsWithRef<"input">) {
  return <input className={cn(INPUT_CLASS, className)} {...props} />;
}

export { SelectInput } from "@/components/admin/select";
export type { SelectOption } from "@/components/admin/select";

export function TextArea({ className, ...props }: ComponentPropsWithRef<"textarea">) {
  return <textarea className={cn(TEXTAREA_CLASS, className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Статусы и переключатели                                                    */
/* -------------------------------------------------------------------------- */

const STATUS_STYLE: Record<BookingStatus, string> = {
  confirmed: "border-accent/45 text-text",
  completed: "border-line-strong text-text-muted",
  cancelled: "border-line text-text-muted",
  no_show: "border-line text-text-muted",
};

const STATUS_DOT: Record<BookingStatus, string> = {
  confirmed: "bg-accent",
  completed: "bg-sand",
  cancelled: "bg-line-strong",
  no_show: "bg-line-strong",
};

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-field border px-2 py-1 text-micro font-medium uppercase",
        STATUS_STYLE[status],
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-pill", STATUS_DOT[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}

export function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-field border border-line p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 min-w-16 rounded-[1px] px-3 text-[13px] transition-colors duration-[180ms] ease-brand",
              active ? "bg-surface text-text" : "text-text-muted hover:text-text",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block bg-surface", className)} />;
}

/* -------------------------------------------------------------------------- */
/* Модальные окна                                                             */
/* -------------------------------------------------------------------------- */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Куда поставить фокус при открытии (например, первое поле формы). */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  initialFocusRef,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const handleClose = useCallback(() => onClose(), [onClose]);
  const ref = useDialogFocus(open, handleClose, initialFocusRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Закрыть"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-bg/80"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "admin-scroll relative max-h-[92svh] w-full overflow-y-auto border border-line bg-bg p-5 sm:max-w-xl sm:p-6",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-h3 font-light text-text">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-2 text-[13px] text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton aria-label="Закрыть" onClick={onClose} className="-mr-1 -mt-1 border-transparent">
            <span aria-hidden="true" className="relative block size-4">
              <span className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-current" />
              <span className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-current" />
            </span>
          </IconButton>
        </div>

        <div className="mt-5">{children}</div>

        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  /** Подпись кнопки, пока запрос выполняется: «Удаляем…», «Отменяем…», «Отключаем…». */
  busyLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  busyLabel = "Сохраняем…",
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={text}
      className="sm:max-w-md"
      footer={
        <>
          <AdminButton onClick={onCancel} disabled={busy}>
            Оставить как есть
          </AdminButton>
          <AdminButton variant="primary" onClick={onConfirm} disabled={busy} aria-busy={busy}>
            {busy ? busyLabel : confirmLabel}
          </AdminButton>
        </>
      }
    >
      <span className="sr-only">Подтвердите действие</span>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Toast                                                                      */
/* -------------------------------------------------------------------------- */

export interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

export function Toast({ message, onDismiss }: { message: ToastMessage | null; onDismiss: () => void }) {
  const dismiss = useCallback(() => onDismiss(), [onDismiss]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(dismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [message, dismiss]);

  if (!message) return null;

  return (
    <div
      role={message.tone === "error" ? "alert" : "status"}
      aria-live={message.tone === "error" ? "assertive" : "polite"}
      className={cn(
        "fixed inset-x-4 bottom-4 z-[95] flex items-start justify-between gap-3 border border-line-strong bg-bg px-4 py-3 text-[13px] text-text sm:left-auto sm:right-6 sm:w-[380px]",
        message.tone === "error" && "border-l-2 border-l-accent",
      )}
    >
      <p className="min-w-0">{message.text}</p>
      <button
        type="button"
        onClick={dismiss}
        className="-mr-2 -mt-1 inline-flex size-9 shrink-0 items-center justify-center text-text-muted transition-colors duration-[180ms] ease-brand hover:text-text"
      >
        <span aria-hidden="true" className="relative block size-3">
          <span className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-current" />
          <span className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-current" />
        </span>
        <span className="sr-only">Закрыть уведомление</span>
      </button>
    </div>
  );
}
