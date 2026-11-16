"use client";

import Link from "next/link";

import { cn } from "@/components/ui/cn";
import { formatPhoneMask, type ContactDraft, type ContactErrors } from "./types";

type FieldName = "name" | "phone" | "email" | "consent";

interface StepContactsProps {
  values: ContactDraft;
  errors: ContactErrors;
  touched: Partial<Record<FieldName, boolean>>;
  onChange: (field: keyof ContactDraft, value: string | boolean) => void;
  onBlur: (field: FieldName) => void;
}

const INPUT =
  "block h-[52px] w-full rounded-field border-0 border-b border-control-border bg-transparent px-0 py-2 text-[16px] text-text placeholder:text-text-muted transition-colors duration-[240ms] ease-brand hover:border-line-strong focus:border-[var(--color-focus)]";

const LABEL = "block text-micro font-medium uppercase text-text-muted";

function errorId(field: FieldName): string {
  return `booking-${field}-error`;
}

export function StepContacts({ values, errors, touched, onChange, onBlur }: StepContactsProps) {
  const show = (field: FieldName): string | undefined => (touched[field] ? errors[field] : undefined);

  return (
    <fieldset className="min-w-0">
      <legend className="text-micro font-medium uppercase text-text-muted">
        04 · Контакты
      </legend>

      <div className="mt-4 grid gap-block sm:grid-cols-2">
        <div>
          <label htmlFor="booking-name" className={LABEL}>
            Имя
          </label>
          <input
            id="booking-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            aria-required="true"
            aria-invalid={show("name") ? true : undefined}
            aria-describedby={show("name") ? errorId("name") : undefined}
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            onBlur={() => onBlur("name")}
            placeholder="Как к вам обращаться"
            className={cn(INPUT, show("name") && "border-b-2 border-accent-text")}
          />
          {show("name") ? (
            <p id={errorId("name")} role="alert" className="mt-1.5 text-small text-accent-text">
              {show("name")}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="booking-phone" className={LABEL}>
            Телефон
          </label>
          <input
            id="booking-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            aria-required="true"
            aria-invalid={show("phone") ? true : undefined}
            aria-describedby={show("phone") ? errorId("phone") : undefined}
            value={values.phone}
            onChange={(event) => onChange("phone", formatPhoneMask(event.target.value))}
            onBlur={() => onBlur("phone")}
            placeholder="+7 (___) ___-__-__"
            className={cn(INPUT, "tabular-nums", show("phone") && "border-b-2 border-accent-text")}
          />
          {show("phone") ? (
            <p id={errorId("phone")} role="alert" className="mt-1.5 text-small text-accent-text">
              {show("phone")}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="booking-email" className={LABEL}>
            Почта · необязательно
          </label>
          <input
            id="booking-email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={show("email") ? true : undefined}
            aria-describedby={show("email") ? errorId("email") : undefined}
            value={values.email}
            onChange={(event) => onChange("email", event.target.value)}
            onBlur={() => onBlur("email")}
            placeholder="hello@example.com"
            className={cn(INPUT, show("email") && "border-b-2 border-accent-text")}
          />
          {show("email") ? (
            <p id={errorId("email")} role="alert" className="mt-1.5 text-small text-accent-text">
              {show("email")}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="booking-comment" className={LABEL}>
            Комментарий · необязательно
          </label>
          <textarea
            id="booking-comment"
            name="comment"
            rows={3}
            maxLength={500}
            value={values.comment}
            onChange={(event) => onChange("comment", event.target.value)}
            placeholder="Аллергии, пожелания, повод"
            className={cn(INPUT, "h-auto max-h-24 min-h-[80px] resize-none py-3")}
          />
        </div>

        <div className="sm:col-span-2">
          <div className="flex min-h-[44px] items-start gap-3 text-small text-text-muted">
            <input
              id="booking-consent"
              type="checkbox"
              name="consent"
              required
              checked={values.consent}
              onChange={(event) => onChange("consent", event.target.checked)}
              onBlur={() => onBlur("consent")}
              aria-invalid={show("consent") ? true : undefined}
              aria-describedby={show("consent") ? errorId("consent") : undefined}
              className="mt-0.5 size-6 shrink-0 accent-[var(--color-accent-text)]"
            />
            <span>
              <label htmlFor="booking-consent" className="cursor-pointer">
                Согласен на обработку персональных данных.
              </label>{" "}
              <Link
                href="/privacy"
                className="underline decoration-line-strong decoration-1 underline-offset-4 transition-colors duration-[240ms] ease-brand hover:decoration-accent-text"
              >
                Политика конфиденциальности
              </Link>
            </span>
          </div>
          {show("consent") ? (
            <p id={errorId("consent")} role="alert" className="mt-1.5 text-small text-accent-text">
              {show("consent")}
            </p>
          ) : null}
        </div>
      </div>

      {/* Ловушка для ботов. Имя `vespera_hp` не похоже на осмысленное поле,
          поэтому автозаполнители браузера её не трогают. */}
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="booking-vespera-hp">Не заполняйте это поле</label>
        <input
          id="booking-vespera-hp"
          name="vespera_hp"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.vesperaHp}
          onChange={(event) => onChange("vesperaHp", event.target.value)}
        />
      </div>
    </fieldset>
  );
}
