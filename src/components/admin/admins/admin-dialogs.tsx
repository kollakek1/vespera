"use client";

import { useId, useRef, useState, type FormEvent } from "react";

import {
  AdminApiError,
  type AdminAccount,
  type AdminPasswordPayload,
  type AdminRole,
  type CreateAdminPayload,
  type UpdateAdminPayload,
} from "@/lib/admin-client";
import { cn } from "@/components/ui/cn";
import {
  AdminButton,
  ConfirmDialog,
  Field,
  Modal,
  SelectInput,
  TextInput,
  type SelectOption,
} from "@/components/admin/admin-ui";
import { adminAccountsMessage } from "./admins-errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 12;

const ROLE_OPTIONS: SelectOption[] = [
  { value: "owner", label: "Владелец" },
  { value: "manager", label: "Менеджер" },
];

interface AdminFormDialogProps {
  /** `null` — создание нового администратора. */
  admin: AdminAccount | null;
  onClose: () => void;
  onCreate: (payload: CreateAdminPayload) => Promise<void>;
  onUpdate: (id: string, payload: UpdateAdminPayload) => Promise<void>;
}

interface AdminDraft {
  email: string;
  name: string;
  role: AdminRole;
  password: string;
}

type FieldKey = keyof AdminDraft;

export function AdminFormDialog({ admin, onClose, onCreate, onUpdate }: AdminFormDialogProps) {
  const emailId = useId();
  const nameId = useId();
  const passwordId = useId();
  const roleId = useId();

  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<AdminDraft>({
    email: admin?.email ?? "",
    name: admin?.name ?? "",
    role: admin?.role ?? "manager",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = <K extends FieldKey>(key: K, value: AdminDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const focusField = (key: FieldKey) => {
    if (key === "email") emailRef.current?.focus();
    else if (key === "name") nameRef.current?.focus();
    else if (key === "password") passwordRef.current?.focus();
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};

    if (!admin) {
      const email = draft.email.trim();
      if (email.length === 0) next.email = "Укажите email";
      else if (!EMAIL_RE.test(email)) next.email = "Проверьте адрес почты";
    }

    const name = draft.name.trim();
    if (name.length < 2) next.name = "Имя — от 2 символов";
    else if (name.length > 60) next.name = "Имя — до 60 символов";

    if (!admin) {
      if (draft.password.length === 0) next.password = "Придумайте пароль";
      else if (draft.password.length < MIN_PASSWORD) {
        next.password = `Пароль — не короче ${MIN_PASSWORD} символов`;
      }
    }

    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    const next = validate();
    const invalidKeys = Object.keys(next) as FieldKey[];
    if (invalidKeys.length > 0) {
      setErrors(next);
      focusField(invalidKeys[0] ?? "name");
      return;
    }

    setErrors({});
    setFormError(null);
    setBusy(true);

    try {
      if (admin) {
        await onUpdate(admin.id, { name: draft.name.trim(), role: draft.role });
      } else {
        await onCreate({
          email: draft.email.trim().toLowerCase(),
          name: draft.name.trim(),
          role: draft.role,
          password: draft.password,
        });
      }
    } catch (caught: unknown) {
      if (caught instanceof AdminApiError) {
        const fields = caught.fields;
        if (fields.length > 0) {
          const mapped: Partial<Record<FieldKey, string>> = {};
          for (const field of fields) {
            if (field.field === "email" || field.field === "name" || field.field === "password") {
              mapped[field.field] = field.message;
            }
          }
          setErrors(mapped);
          const first = fields.find((field) => field.field in mapped);
          if (first) focusField(first.field as FieldKey);
          setFormError(null);
        } else {
          setFormError(
            adminAccountsMessage(caught, "Не удалось сохранить администратора"),
          );
        }
      } else {
        setFormError("Нет связи с сервером — попробуйте ещё раз");
      }
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      title={admin ? `Администратор «${admin.name}»` : "Новый администратор"}
      description={
        admin
          ? "Имя и роль. Пароль меняется отдельно — кнопкой «Сменить пароль»."
          : "Менеджер ведёт календарь и записи. Раздел администраторов видит только владелец."
      }
      className="sm:max-w-lg"
      initialFocusRef={admin ? nameRef : emailRef}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {admin ? (
          <div>
            <p className="mb-1.5 text-micro font-medium uppercase text-text-muted">Email</p>
            <p className="text-[14px] text-text">{admin.email}</p>
            <p className="mt-1.5 text-[13px] text-text-muted">
              По email входят в консоль, поэтому он не меняется.
            </p>
          </div>
        ) : (
          <Field
            label="Email"
            htmlFor={emailId}
            error={errors.email}
            errorId="admins-email-error"
          >
            <TextInput
              ref={emailRef}
              id={emailId}
              name="email"
              type="email"
              autoComplete="off"
              spellCheck={false}
              value={draft.email}
              disabled={busy}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "admins-email-error" : undefined}
              onChange={(event) => update("email", event.target.value)}
            />
          </Field>
        )}

        <Field label="Имя" htmlFor={nameId} error={errors.name} errorId="admins-name-error">
          <TextInput
            ref={nameRef}
            id={nameId}
            name="name"
            autoComplete="off"
            value={draft.name}
            disabled={busy}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "admins-name-error" : undefined}
            onChange={(event) => update("name", event.target.value)}
          />
        </Field>

        <Field label="Роль" htmlFor={roleId}>
          <SelectInput
            id={roleId}
            value={draft.role}
            onChange={(value) => update("role", value === "owner" ? "owner" : "manager")}
            options={ROLE_OPTIONS}
            disabled={busy}
          />
        </Field>

        {admin ? null : (
          <Field
            label="Пароль"
            htmlFor={passwordId}
            hint={`Не короче ${MIN_PASSWORD} символов. Передайте его сотруднику лично.`}
            error={errors.password}
            errorId="admins-password-error"
          >
            <TextInput
              ref={passwordRef}
              id={passwordId}
              name="password"
              type="password"
              autoComplete="new-password"
              value={draft.password}
              disabled={busy}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "admins-password-error" : undefined}
              onChange={(event) => update("password", event.target.value)}
            />
          </Field>
        )}

        {formError ? (
          <p role="alert" className="border-l-2 border-accent bg-surface px-3 py-2 text-[13px] text-text">
            {formError}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <AdminButton onClick={onClose} disabled={busy}>
            Отмена
          </AdminButton>
          <AdminButton type="submit" variant="primary" disabled={busy} aria-busy={busy}>
            {busy ? "Сохраняем…" : admin ? "Сохранить" : "Создать"}
          </AdminButton>
        </div>
      </form>
    </Modal>
  );
}

interface AdminPasswordDialogProps {
  admin: AdminAccount;
  /** Свой пароль: нужен текущий. Чужой: владелец задаёт новый без старого. */
  isSelf: boolean;
  onClose: () => void;
  onSubmit: (id: string, payload: AdminPasswordPayload) => Promise<void>;
}

export function AdminPasswordDialog({ admin, isSelf, onClose, onSubmit }: AdminPasswordDialogProps) {
  const currentId = useId();
  const passwordId = useId();
  const confirmId = useId();

  const currentRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    const next: typeof errors = {};
    if (isSelf && current.length === 0) next.current = "Введите текущий пароль";
    if (password.length === 0) next.password = "Придумайте пароль";
    else if (password.length < MIN_PASSWORD) next.password = `Пароль — не короче ${MIN_PASSWORD} символов`;
    if (confirm !== password) next.confirm = "Пароли не совпадают";

    if (Object.keys(next).length > 0) {
      setErrors(next);
      if (next.current) currentRef.current?.focus();
      else if (next.password) passwordRef.current?.focus();
      else confirmRef.current?.focus();
      return;
    }

    setErrors({});
    setFormError(null);
    setBusy(true);

    try {
      await onSubmit(admin.id, {
        password,
        ...(isSelf ? { currentPassword: current } : {}),
      });
    } catch (caught: unknown) {
      if (caught instanceof AdminApiError) {
        if (caught.code === "invalid_password") {
          setErrors({ current: "Неверный текущий пароль" });
          currentRef.current?.focus();
        } else {
          setFormError(adminAccountsMessage(caught, "Не удалось сменить пароль"));
        }
      } else {
        setFormError("Нет связи с сервером — попробуйте ещё раз");
      }
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      title={isSelf ? "Свой пароль" : `Пароль для «${admin.name}»`}
      description={
        isSelf
          ? "Введите текущий пароль и новый — не короче 12 символов."
          : "Новый пароль без старого: владелец задаёт его напрямую. Сообщите сотруднику лично."
      }
      className="sm:max-w-md"
      initialFocusRef={isSelf ? currentRef : passwordRef}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {isSelf ? (
          <Field
            label="Текущий пароль"
            htmlFor={currentId}
            error={errors.current}
            errorId="admins-current-error"
          >
            <TextInput
              ref={currentRef}
              id={currentId}
              type="password"
              autoComplete="current-password"
              value={current}
              disabled={busy}
              aria-invalid={errors.current ? true : undefined}
              aria-describedby={errors.current ? "admins-current-error" : undefined}
              onChange={(event) => {
                setCurrent(event.target.value);
                if (errors.current) setErrors((value) => ({ ...value, current: undefined }));
              }}
            />
          </Field>
        ) : null}

        <Field
          label="Новый пароль"
          htmlFor={passwordId}
          hint={`Не короче ${MIN_PASSWORD} символов.`}
          error={errors.password}
          errorId="admins-new-password-error"
        >
          <TextInput
            ref={passwordRef}
            id={passwordId}
            type="password"
            autoComplete="new-password"
            value={password}
            disabled={busy}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "admins-new-password-error" : undefined}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errors.password) setErrors((value) => ({ ...value, password: undefined }));
            }}
          />
        </Field>

        <Field
          label="Повторите пароль"
          htmlFor={confirmId}
          error={errors.confirm}
          errorId="admins-confirm-error"
        >
          <TextInput
            ref={confirmRef}
            id={confirmId}
            type="password"
            autoComplete="new-password"
            value={confirm}
            disabled={busy}
            aria-invalid={errors.confirm ? true : undefined}
            aria-describedby={errors.confirm ? "admins-confirm-error" : undefined}
            onChange={(event) => {
              setConfirm(event.target.value);
              if (errors.confirm) setErrors((value) => ({ ...value, confirm: undefined }));
            }}
          />
        </Field>

        {formError ? (
          <p role="alert" className={cn("border-l-2 border-accent bg-surface px-3 py-2 text-[13px] text-text")}>
            {formError}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <AdminButton onClick={onClose} disabled={busy}>
            Отмена
          </AdminButton>
          <AdminButton type="submit" variant="primary" disabled={busy} aria-busy={busy}>
            {busy ? "Сохраняем…" : "Сменить пароль"}
          </AdminButton>
        </div>
      </form>
    </Modal>
  );
}

interface DeactivateAdminDialogProps {
  target: AdminAccount | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeactivateAdminDialog({ target, busy, onCancel, onConfirm }: DeactivateAdminDialogProps) {
  return (
    <ConfirmDialog
      open={target !== null}
      title="Отключить доступ?"
      text={
        target
          ? `«${target.name}» больше не сможет войти в консоль. Вернуть доступ можно в любой момент.`
          : ""
      }
      confirmLabel="Отключить"
      busyLabel="Отключаем…"
      busy={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
