"use client";

import { useRef, useState, type FormEvent } from "react";

import { AdminApiError, adminErrorMessage, type ServicePayload, type StudioService } from "@/lib/admin-client";
import { AdminButton, Field, Modal, TextArea, TextInput } from "@/components/admin/admin-ui";
import { cn } from "@/components/ui/cn";
import { slugPreview } from "./slug";

interface ServiceFormDialogProps {
  /** `null` — создание новой услуги. */
  service: StudioService | null;
  disabled?: boolean;
  onClose: () => void;
  onSubmit: (payload: ServicePayload, id: string | null) => Promise<void>;
}

interface ServiceDraft {
  name: string;
  slug: string;
  durationMin: string;
  priceRub: string;
  description: string;
  ritual: string;
}

type FieldKey = keyof ServiceDraft;

export function ServiceFormDialog({ service, disabled = false, onClose, onSubmit }: ServiceFormDialogProps) {
  const [draft, setDraft] = useState<ServiceDraft>({
    name: service?.name ?? "",
    slug: service?.slug ?? "",
    durationMin: String(service?.durationMin ?? 60),
    priceRub: String(service?.priceRub ?? ""),
    description: service?.description ?? "",
    ritual: service?.ritual ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const ritualRef = useRef<HTMLInputElement>(null);

  const preview = slugPreview(draft.name);

  const update = (key: FieldKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const focusField = (key: FieldKey) => {
    const map: Record<FieldKey, HTMLElement | null> = {
      name: nameRef.current,
      slug: slugRef.current,
      durationMin: durationRef.current,
      priceRub: priceRef.current,
      description: descriptionRef.current,
      ritual: ritualRef.current,
    };
    map[key]?.focus();
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {};
    const name = draft.name.trim();
    const slug = draft.slug.trim();
    const duration = Number(draft.durationMin);
    const price = Number(draft.priceRub);

    if (name.length < 2) next.name = "Название — от 2 символов";
    else if (name.length > 60) next.name = "Название — до 60 символов";

    if (slug.length > 0 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      next.slug = "Только латиница, цифры и дефис";
    } else if (slug.length > 48) {
      next.slug = "slug — до 48 символов";
    }

    if (draft.durationMin.trim() === "" || !Number.isInteger(duration)) {
      next.durationMin = "Укажите целое число минут";
    } else if (duration < 15 || duration > 240) {
      next.durationMin = "От 15 до 240 минут";
    } else if (duration % 15 !== 0) {
      next.durationMin = "Кратно 15 минутам";
    }

    if (draft.priceRub.trim() === "" || !Number.isInteger(price)) {
      next.priceRub = "Укажите целое число рублей";
    } else if (price < 0 || price > 200_000) {
      next.priceRub = "От 0 до 200 000 ₽";
    }

    if (draft.description.length > 300) next.description = "Описание — до 300 символов";
    if (draft.ritual.length > 80) next.ritual = "Ритуал — до 80 символов";

    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || disabled) return;

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
      await onSubmit(
        {
          name: draft.name.trim(),
          slug: draft.slug.trim() || undefined,
          durationMin: Number(draft.durationMin),
          priceRub: Number(draft.priceRub),
          description: draft.description.trim(),
          ritual: draft.ritual.trim(),
        },
        service?.id ?? null,
      );
    } catch (caught: unknown) {
      if (caught instanceof AdminApiError) {
        const fieldErrors: Partial<Record<FieldKey, string>> = {};
        for (const field of caught.fields) {
          if (
            field.field === "name" ||
            field.field === "slug" ||
            field.field === "durationMin" ||
            field.field === "priceRub" ||
            field.field === "description" ||
            field.field === "ritual"
          ) {
            fieldErrors[field.field] = field.message;
          }
        }
        if (caught.code === "slug_taken") fieldErrors.slug = caught.message;
        setErrors(fieldErrors);
        setFormError(
          caught.fields.length > 0 || caught.code === "slug_taken"
            ? null
            : adminErrorMessage(caught, "Не удалось сохранить услугу"),
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
      title={service ? `Услуга «${service.name}»` : "Новая услуга"}
      description="Название и цена сразу появятся в записи на сайте. Длительность меняет сетку свободных окон."
      className="sm:max-w-xl"
      initialFocusRef={nameRef}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Название" htmlFor="studio-service-name" error={fieldError("name")} errorId="studio-service-name-error">
          <TextInput
            ref={nameRef}
            id="studio-service-name"
            value={draft.name}
            maxLength={60}
            autoComplete="off"
            disabled={busy}
            aria-invalid={fieldError("name") ? true : undefined}
            aria-describedby={fieldError("name") ? "studio-service-name-error" : undefined}
            onChange={(event) => update("name", event.target.value)}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Slug"
            htmlFor="studio-service-slug"
            error={fieldError("slug")}
            errorId="studio-service-slug-error"
            hint={
              draft.slug.trim().length === 0 && preview
                ? `Пусто — сохраним как ${preview}`
                : "Латиница, цифры и дефис"
            }
          >
            <TextInput
              ref={slugRef}
              id="studio-service-slug"
              value={draft.slug}
              maxLength={48}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              placeholder={preview || undefined}
              aria-invalid={fieldError("slug") ? true : undefined}
              aria-describedby={fieldError("slug") ? "studio-service-slug-error" : undefined}
              onChange={(event) => update("slug", event.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Длительность"
              htmlFor="studio-service-duration"
              error={fieldError("durationMin")}
              errorId="studio-service-duration-error"
              hint="15–240, ×15"
            >
              <TextInput
                ref={durationRef}
                id="studio-service-duration"
                type="number"
                inputMode="numeric"
                min={15}
                max={240}
                step={15}
                value={draft.durationMin}
                disabled={busy}
                aria-invalid={fieldError("durationMin") ? true : undefined}
                aria-describedby={fieldError("durationMin") ? "studio-service-duration-error" : undefined}
                onChange={(event) => update("durationMin", event.target.value)}
              />
            </Field>

            <Field
              label="Цена, ₽"
              htmlFor="studio-service-price"
              error={fieldError("priceRub")}
              errorId="studio-service-price-error"
            >
              <TextInput
                ref={priceRef}
                id="studio-service-price"
                type="number"
                inputMode="numeric"
                min={0}
                max={200_000}
                step={500}
                value={draft.priceRub}
                disabled={busy}
                aria-invalid={fieldError("priceRub") ? true : undefined}
                aria-describedby={fieldError("priceRub") ? "studio-service-price-error" : undefined}
                onChange={(event) => update("priceRub", event.target.value)}
              />
            </Field>
          </div>
        </div>

        <Field
          label="Описание"
          htmlFor="studio-service-description"
          error={fieldError("description")}
          errorId="studio-service-description-error"
          hint={`${draft.description.length}/300 — одна фраза для карточки`}
        >
          <TextArea
            ref={descriptionRef}
            id="studio-service-description"
            value={draft.description}
            maxLength={300}
            rows={3}
            disabled={busy}
            className={cn("min-h-20", fieldError("description") && "border-accent-text")}
            aria-invalid={fieldError("description") ? true : undefined}
            aria-describedby={fieldError("description") ? "studio-service-description-error" : undefined}
            onChange={(event) => update("description", event.target.value)}
          />
        </Field>

        <Field
          label="Ритуал"
          htmlFor="studio-service-ritual"
          error={fieldError("ritual")}
          errorId="studio-service-ritual-error"
          hint={`${draft.ritual.length}/80 — короткая строка в брони`}
        >
          <TextInput
            ref={ritualRef}
            id="studio-service-ritual"
            value={draft.ritual}
            maxLength={80}
            disabled={busy}
            aria-invalid={fieldError("ritual") ? true : undefined}
            aria-describedby={fieldError("ritual") ? "studio-service-ritual-error" : undefined}
            onChange={(event) => update("ritual", event.target.value)}
          />
        </Field>

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
            {busy ? "Сохраняем…" : service ? "Сохранить" : "Создать услугу"}
          </AdminButton>
        </div>
      </form>
    </Modal>
  );
}
