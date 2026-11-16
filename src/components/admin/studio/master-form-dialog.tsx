"use client";

import { useRef, useState, type FormEvent } from "react";

import {
  AdminApiError,
  adminErrorMessage,
  type MasterPayload,
  type StudioMaster,
  type StudioService,
} from "@/lib/admin-client";
import { WEEKDAY_LABELS, type Weekday } from "@/lib/studio";
import { AdminButton, Field, Modal, TextInput } from "@/components/admin/admin-ui";
import { cn } from "@/components/ui/cn";
import { formatMoney } from "@/components/admin/dates";
import { slugPreview } from "./slug";

const DAY_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_DAYS: readonly Weekday[] = [1, 2, 3, 4, 5];

interface MasterFormDialogProps {
  /** `null` — новый мастер. */
  master: StudioMaster | null;
  services: StudioService[];
  onClose: () => void;
  onSubmit: (payload: MasterPayload, id: string | null) => Promise<void>;
}

type FieldKey = "name" | "slug" | "role" | "years" | "serviceIds" | "workingDays";

interface MasterDraft {
  name: string;
  slug: string;
  role: string;
  years: string;
  serviceIds: string[];
  workingDays: Weekday[];
}

export function MasterFormDialog({ master, services, onClose, onSubmit }: MasterFormDialogProps) {
  const [draft, setDraft] = useState<MasterDraft>({
    name: master?.name ?? "",
    slug: master?.slug ?? "",
    role: master?.role ?? "",
    years: String(master?.years ?? 0),
    serviceIds: master ? [...master.serviceIds] : [],
    workingDays: master ? [...master.workingDays] : [...DEFAULT_DAYS],
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const yearsRef = useRef<HTMLInputElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const daysRef = useRef<HTMLDivElement>(null);

  const preview = slugPreview(draft.name);

  const update = (patch: Partial<MasterDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const toggleService = (id: string) => {
    update({
      serviceIds: draft.serviceIds.includes(id)
        ? draft.serviceIds.filter((item) => item !== id)
        : [...draft.serviceIds, id],
    });
    setErrors((current) => ({ ...current, serviceIds: undefined }));
  };

  const toggleDay = (day: Weekday) => {
    const next = draft.workingDays.includes(day)
      ? draft.workingDays.filter((item) => item !== day)
      : [...draft.workingDays, day].sort((a, b) => a - b);
    update({ workingDays: next });
    setErrors((current) => ({ ...current, workingDays: undefined }));
  };

  const focusField = (key: FieldKey) => {
    const map: Record<FieldKey, HTMLElement | null> = {
      name: nameRef.current,
      slug: slugRef.current,
      role: roleRef.current,
      years: yearsRef.current,
      serviceIds: servicesRef.current,
      workingDays: daysRef.current,
    };
    map[key]?.focus();
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    const name = draft.name.trim();
    const slug = draft.slug.trim();
    const years = Number(draft.years);

    if (name.length < 2) next.name = "Имя — от 2 символов";
    else if (name.length > 60) next.name = "Имя — до 60 символов";

    if (slug.length > 0 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      next.slug = "Только латиница, цифры и дефис";
    } else if (slug.length > 48) {
      next.slug = "slug — до 48 символов";
    }

    if (draft.role.length > 80) next.role = "Специализация — до 80 символов";

    if (draft.years.trim() === "" || !Number.isInteger(years)) {
      next.years = "Укажите целое число лет";
    } else if (years < 0 || years > 60) {
      next.years = "От 0 до 60 лет";
    }

    if (draft.serviceIds.length === 0) next.serviceIds = "Выберите хотя бы одну услугу";
    if (draft.workingDays.length === 0) next.workingDays = "Выберите хотя бы один день";

    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    const next = validate();
    const keys = Object.keys(next) as FieldKey[];
    if (keys.length > 0) {
      setErrors(next);
      focusField(keys[0] ?? "name");
      return;
    }

    setErrors({});
    setFormError(null);
    setBusy(true);

    try {
      await onSubmit(
        {
          name: draft.name.trim(),
          slug: draft.slug.trim() || undefined,
          role: draft.role.trim(),
          years: Number(draft.years),
          serviceIds: draft.serviceIds,
          workingDays: draft.workingDays,
        },
        master?.id ?? null,
      );
    } catch (caught: unknown) {
      if (caught instanceof AdminApiError) {
        const fieldErrors: Partial<Record<FieldKey, string>> = {};
        for (const field of caught.fields) {
          if (
            field.field === "name" ||
            field.field === "slug" ||
            field.field === "role" ||
            field.field === "years" ||
            field.field === "serviceIds" ||
            field.field === "workingDays"
          ) {
            fieldErrors[field.field] = field.message;
          }
        }
        if (caught.code === "slug_taken") fieldErrors.slug = caught.message;
        setErrors(fieldErrors);
        setFormError(
          caught.fields.length > 0 || caught.code === "slug_taken"
            ? null
            : adminErrorMessage(caught, "Не удалось сохранить мастера"),
        );
      } else {
        setFormError("Сеть недоступна. Проверьте соединение и попробуйте ещё раз");
      }
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (key: FieldKey) => errors[key] ?? null;

  return (
    <Modal
      open
      onClose={onClose}
      title={master ? `Мастер «${master.name}»` : "Новый мастер"}
      description="Мастер виден в записи, если у него есть хотя бы одна услуга и рабочие дни."
      className="sm:max-w-xl"
      initialFocusRef={nameRef}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Имя" htmlFor="studio-master-name" error={fieldError("name")} errorId="studio-master-name-error">
            <TextInput
              ref={nameRef}
              id="studio-master-name"
              value={draft.name}
              maxLength={60}
              autoComplete="off"
              disabled={busy}
              aria-invalid={fieldError("name") ? true : undefined}
              aria-describedby={fieldError("name") ? "studio-master-name-error" : undefined}
              onChange={(event) => {
                update({ name: event.target.value });
                setErrors((current) => ({ ...current, name: undefined }));
              }}
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="studio-master-slug"
            error={fieldError("slug")}
            errorId="studio-master-slug-error"
            hint={
              draft.slug.trim().length === 0 && preview
                ? `Пусто — сохраним как ${preview}`
                : "Латиница, цифры и дефис"
            }
          >
            <TextInput
              ref={slugRef}
              id="studio-master-slug"
              value={draft.slug}
              maxLength={48}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              placeholder={preview || undefined}
              aria-invalid={fieldError("slug") ? true : undefined}
              aria-describedby={fieldError("slug") ? "studio-master-slug-error" : undefined}
              onChange={(event) => {
                update({ slug: event.target.value });
                setErrors((current) => ({ ...current, slug: undefined }));
              }}
            />
          </Field>

          <Field label="Специализация" htmlFor="studio-master-role" error={fieldError("role")} errorId="studio-master-role-error">
            <TextInput
              ref={roleRef}
              id="studio-master-role"
              value={draft.role}
              maxLength={80}
              disabled={busy}
              placeholder="кожа, протоколы ухода"
              aria-invalid={fieldError("role") ? true : undefined}
              aria-describedby={fieldError("role") ? "studio-master-role-error" : undefined}
              onChange={(event) => {
                update({ role: event.target.value });
                setErrors((current) => ({ ...current, role: undefined }));
              }}
            />
          </Field>

          <Field label="Стаж, лет" htmlFor="studio-master-years" error={fieldError("years")} errorId="studio-master-years-error">
            <TextInput
              ref={yearsRef}
              id="studio-master-years"
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              step={1}
              value={draft.years}
              disabled={busy}
              aria-invalid={fieldError("years") ? true : undefined}
              aria-describedby={fieldError("years") ? "studio-master-years-error" : undefined}
              onChange={(event) => {
                update({ years: event.target.value });
                setErrors((current) => ({ ...current, years: undefined }));
              }}
            />
          </Field>
        </div>

        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-micro font-medium uppercase text-text-muted">
            Услуги · выбрано {draft.serviceIds.length}
          </legend>

          <div
            ref={servicesRef}
            tabIndex={-1}
            className={cn(
              "admin-scroll max-h-56 overflow-y-auto border border-control-border",
              fieldError("serviceIds") && "border-accent-text",
            )}
          >
            {services.length === 0 ? (
              <p className="px-3 py-4 text-[13px] text-text-muted">
                В каталоге нет услуг — сначала добавьте услугу.
              </p>
            ) : null}

            {services.map((service) => {
              const checked = draft.serviceIds.includes(service.id);
              return (
                <label
                  key={service.id}
                  className="flex min-h-10 cursor-pointer items-center gap-3 border-b border-line px-3 py-2 last:border-b-0 hover:bg-surface-hover"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleService(service.id)}
                    className="size-4 shrink-0 accent-[var(--color-accent-text)]"
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-text">{service.name}</span>
                  <span className="shrink-0 text-[12px] tabular-nums text-text-muted">
                    {service.durationMin} мин · {formatMoney(service.priceRub)}
                  </span>
                </label>
              );
            })}
          </div>

          {fieldError("serviceIds") ? (
            <p role="alert" className="mt-1.5 text-[13px] text-accent-text">
              {fieldError("serviceIds")}
            </p>
          ) : null}
        </fieldset>

        {draft.serviceIds.length === 0 ? (
          <p className="border-l-2 border-accent bg-surface px-3 py-2 text-[13px] text-text">
            Без услуги мастер не появится в записи: гость не сможет его выбрать.
          </p>
        ) : null}

        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-micro font-medium uppercase text-text-muted">Рабочие дни</legend>
          <div ref={daysRef} tabIndex={-1} role="group" aria-label="Рабочие дни" className="flex flex-wrap gap-1.5">
            {DAY_ORDER.map((day) => {
              const active = draft.workingDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "min-h-10 min-w-11 rounded-field border px-2 text-[13px] transition-colors duration-[180ms] ease-brand",
                    active
                      ? "border-accent bg-surface text-text"
                      : "border-line text-text-muted hover:border-control-border hover:text-text",
                  )}
                >
                  {WEEKDAY_LABELS[day]}
                </button>
              );
            })}
          </div>
          {fieldError("workingDays") ? (
            <p role="alert" className="mt-1.5 text-[13px] text-accent-text">
              {fieldError("workingDays")}
            </p>
          ) : (
            <p className="mt-1.5 text-[12px] text-text-muted">
              Слоты гостя считаются только по этим дням.
            </p>
          )}
        </fieldset>

        {formError ? (
          <p role="alert" className="border-l-2 border-accent bg-surface px-3 py-2 text-[13px] text-text">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <AdminButton onClick={onClose} disabled={busy}>
            Отмена
          </AdminButton>
          <AdminButton type="submit" variant="primary" disabled={busy} aria-busy={busy}>
            {busy ? "Сохраняем…" : master ? "Сохранить" : "Создать мастера"}
          </AdminButton>
        </div>
      </form>
    </Modal>
  );
}
