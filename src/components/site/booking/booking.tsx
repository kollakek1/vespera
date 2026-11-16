"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { normalizePhone, type BookingConfirmationView } from "@/lib/booking";
import { STUDIO_HOURS, type StudioMaster, type StudioService } from "@/lib/studio";
import { BOOKING_EVENT, type BookingIntent } from "@/hooks/use-scroll-to-section";
import { findMaster, findService } from "@/components/site/catalog";
import { Button, ButtonArrow } from "@/components/ui/button";
import { EASE_BRAND } from "@/components/ui/motion-ease";
import { SectionHeader } from "@/components/ui/section-header";
import { useReducedMotionPreference } from "@/providers/reduced-motion-provider";
import { StepContacts } from "./step-contacts";
import { StepDateTime } from "./step-datetime";
import { StepMaster } from "./step-master";
import { StepService } from "./step-service";
import { Stepper } from "./stepper";
import { Success } from "./success";
import { Summary, SummaryBar } from "./summary";
import { shiftDate, todayKey, weekdayOf } from "./dates";
import { EMPTY_CONTACTS, type BookingStep, type ContactDraft, type ContactErrors } from "./types";
import { useAvailability } from "./use-availability";

const STEP_TITLES: Record<BookingStep, string> = {
  1: "Шаг 1 из 4. Услуга",
  2: "Шаг 2 из 4. Мастер",
  3: "Шаг 3 из 4. Дата и время",
  4: "Шаг 4 из 4. Контакты",
};

type FieldName = "name" | "phone" | "email" | "consent";

function validateContacts(values: ContactDraft): ContactErrors {
  const errors: ContactErrors = {};

  if (values.name.trim().length < 2) {
    errors.name = "Имя должно быть не короче 2 символов";
  }
  if (!normalizePhone(values.phone)) {
    errors.phone = "Укажите российский номер: +7 (999) 123-45-67";
  }
  const email = values.email.trim();
  if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = "Проверьте адрес почты";
  }
  if (!values.consent) {
    errors.consent = "Без согласия не можем принять запись";
  }

  return errors;
}

function readMessage(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return null;
}

function parseConfirmation(body: unknown): BookingConfirmationView | null {
  if (typeof body !== "object" || body === null) return null;
  const candidate = body as { ok?: unknown; booking?: unknown };
  if (candidate.ok !== true) return null;
  const booking = candidate.booking;
  if (typeof booking !== "object" || booking === null) return null;
  const code = (booking as { code?: unknown }).code;
  if (typeof code !== "string") return null;
  return booking as BookingConfirmationView;
}

/** Первый рабочий день мастера в пределах горизонта записи. */
function firstWorkingDate(master: StudioMaster): string | null {
  const today = todayKey();
  for (let index = 0; index < STUDIO_HOURS.bookingHorizonDays; index += 1) {
    const key = shiftDate(today, index);
    if (master.workingDays.some((day) => day === weekdayOf(key))) return key;
  }
  return null;
}

interface BookingProps {
  /** Каталог из `studio-store`: шаги 1–2 и сводка работают по нему. */
  services: StudioService[];
  masters: StudioMaster[];
}

export function Booking({ services, masters }: BookingProps) {
  const reduced = useReducedMotionPreference();
  const [step, setStep] = useState<BookingStep>(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [masterId, setMasterId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactDraft>(EMPTY_CONTACTS);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmationView | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocus = useRef(false);
  // Момент открытия шага контактов: сервер отсекает заявки быстрее 1.5 с.
  const formStartedAt = useRef(0);

  const service = findService(services, serviceId);
  const master = findMaster(masters, masterId);

  const availability = useAvailability({
    serviceId,
    masterId,
    date,
    enabled: step === 3 && Boolean(serviceId && masterId && date),
  });

  const errors = useMemo(() => validateContacts(contacts), [contacts]);

  const resetAll = useCallback(() => {
    setServiceId(null);
    setMasterId(null);
    setDate(null);
    setTime(null);
    setContacts(EMPTY_CONTACTS);
    setTouched({});
    setAttempted(false);
    setSubmitError(null);
    setConfirmation(null);
    setStep(1);
  }, []);

  // Отсчёт «человеческого» заполнения начинается, когда показали контакты.
  useEffect(() => {
    if (step === 4) formStartedAt.current = Date.now();
  }, [step]);

  // Внешний CTA (hero, навбар, карточки) открывает запись с предвыбором.
  useEffect(() => {
    const onIntent = (event: Event) => {
      const intent = (event as CustomEvent<BookingIntent>).detail ?? {};
      shouldFocus.current = true;
      setSubmitError(null);

      if (confirmation) {
        resetAll();
        return;
      }

      if (intent.masterId) {
        const intentMaster = findMaster(masters, intent.masterId);
        if (intentMaster) {
          // Услуга из карточки могла быть снята с записи — берём первую доступную.
          const preferred =
            intent.serviceId && intentMaster.serviceIds.includes(intent.serviceId)
              ? intent.serviceId
              : intentMaster.serviceIds.find((id) => findService(services, id));

          if (preferred) {
            setServiceId(preferred);
            setMasterId(intentMaster.id);
            setDate(firstWorkingDate(intentMaster));
            setTime(null);
            setStep(3);
            return;
          }
        }
      }

      const intentService = intent.serviceId ? findService(services, intent.serviceId) : undefined;

      if (intentService) {
        setServiceId(intentService.id);
        setMasterId(null);
        setDate(null);
        setTime(null);
        setStep(2);
      }

      // Заголовок шага уже в DOM: переводим фокус сразу, не дожидаясь смены шага.
      window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    };

    window.addEventListener(BOOKING_EVENT, onIntent);
    return () => window.removeEventListener(BOOKING_EVENT, onIntent);
  }, [confirmation, masters, resetAll, services]);

  useEffect(() => {
    if (!shouldFocus.current || confirmation) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [step, confirmation]);

  const selectService = (id: string) => {
    setServiceId(id);
    setMasterId((current) => {
      const currentMaster = findMaster(masters, current);
      return currentMaster && currentMaster.serviceIds.includes(id) ? current : null;
    });
    setDate(null);
    setTime(null);
    setSubmitError(null);
  };

  const selectMaster = (id: string) => {
    setMasterId(id);
    setDate(null);
    setTime(null);
    setSubmitError(null);
  };

  const selectDate = (key: string) => {
    setDate(key);
    setTime(null);
    setSubmitError(null);
  };

  const updateContact = (field: keyof ContactDraft, value: string | boolean) => {
    setContacts((current) => {
      const next: ContactDraft = { ...current };
      if (field === "consent") next.consent = Boolean(value);
      else next[field] = String(value);
      return next;
    });
  };

  const canAdvance =
    step === 1 ? Boolean(service) : step === 2 ? Boolean(master) : step === 3 ? Boolean(date && time) : true;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (step < 4) {
      if (!canAdvance) return;
      shouldFocus.current = true;
      if (step === 2 && master && !date) {
        const fallback = firstWorkingDate(master);
        if (fallback) setDate(fallback);
      }
      setStep((current) => (current + 1) as BookingStep);
      return;
    }

    setAttempted(true);
    setTouched({ name: true, phone: true, email: true, consent: true });

    const validation = validateContacts(contacts);
    if (Object.keys(validation).length > 0) return;

    if (!serviceId || !masterId || !date || !time) {
      setSubmitError("Выберите услугу, мастера, дату и время.");
      return;
    }
    if (busy) return;

    setBusy(true);

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId,
          masterId,
          date,
          time,
          name: contacts.name.trim(),
          phone: contacts.phone,
          email: contacts.email.trim() || undefined,
          comment: contacts.comment.trim() || undefined,
          vespera_hp: contacts.vesperaHp,
          formStartedAt: formStartedAt.current || undefined,
        }),
      });

      const body: unknown = await response.json().catch(() => null);

      if (response.status === 201 || response.status === 200) {
        const parsed = parseConfirmation(body);
        if (parsed) {
          setConfirmation(parsed);
          return;
        }
        setSubmitError("Запись создана, но ответ сервера не распознан. Позвоните нам.");
        return;
      }

      if (response.status === 409) {
        // Слот заняли между показом и подтверждением: снимаем выбор, иначе
        // повторная отправка снова уйдёт в тот же конфликт.
        setTime(null);
        setSubmitError("Это время только что заняли. Выберите другое.");
        availability.refresh();
        shouldFocus.current = true;
        setStep(3);
        return;
      }

      if (response.status === 429) {
        setSubmitError(readMessage(body) ?? "Слишком много попыток. Попробуйте позже.");
        return;
      }

      if (response.status === 400) {
        setSubmitError(readMessage(body) ?? "Проверьте данные формы.");
        return;
      }

      setSubmitError("Не удалось отправить заявку. Попробуйте ещё раз.");
    } catch {
      setSubmitError("Сеть недоступна. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      id="booking"
      data-theme="paper"
      aria-labelledby="booking-title"
      className="bg-bg px-gutter pb-section pt-[calc(var(--spacing-section)+24px)] text-text"
    >
      <div className="mx-auto max-w-page">
        <SectionHeader
          id="booking-title"
          index="07"
          eyebrow="Запись"
          title="Запись"
          note="Свободное окно — 90 минут."
        />

        <div className="mt-stack grid grid-cols-1 gap-block lg:grid-cols-12 lg:gap-x-inline">
          <div className="lg:col-span-7">
            {confirmation ? (
              <Success confirmation={confirmation} onReset={resetAll} />
            ) : (
              <>
                <Stepper step={step} onGo={setStep} />

                <form noValidate onSubmit={onSubmit} className="mt-block">
                  <h3 ref={headingRef} tabIndex={-1} className="sr-only">
                    {STEP_TITLES[step]}
                  </h3>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: reduced ? 0 : -8 }}
                      transition={{ duration: reduced ? 0.12 : 0.24, ease: EASE_BRAND }}
                    >
                      {step === 1 ? (
                        <StepService services={services} value={serviceId} onChange={selectService} />
                      ) : null}
                      {step === 2 && serviceId ? (
                        <StepMaster
                          masters={masters}
                          serviceId={serviceId}
                          value={masterId}
                          onChange={selectMaster}
                        />
                      ) : null}
                      {step === 3 && master ? (
                        <StepDateTime
                          master={master}
                          date={date}
                          time={time}
                          onDate={selectDate}
                          onTime={setTime}
                          availability={availability.state}
                          onRefresh={availability.refresh}
                        />
                      ) : null}
                      {step === 3 && !master ? (
                        <p className="text-small text-text-muted">
                          Этот мастер больше не принимает. Вернитесь на шаг назад и выберите другого.
                        </p>
                      ) : null}
                      {step === 4 ? (
                        <StepContacts
                          values={contacts}
                          errors={errors}
                          touched={touched}
                          onChange={updateContact}
                          onBlur={(field) => setTouched((current) => ({ ...current, [field]: true }))}
                        />
                      ) : null}
                    </motion.div>
                  </AnimatePresence>

                  <p aria-live="polite" className="sr-only">
                    {attempted && Object.keys(errors).length > 0
                      ? Object.values(errors).join(". ")
                      : ""}
                  </p>

                  {submitError ? (
                    <p
                      role="alert"
                      className="mt-block border-l-2 border-accent bg-surface-hover px-4 py-3 text-small text-text"
                    >
                      {submitError}
                    </p>
                  ) : null}

                  <div className="mt-6 lg:hidden">
                    <SummaryBar
                      services={services}
                      masters={masters}
                      serviceId={serviceId}
                      masterId={masterId}
                      date={date}
                      time={time}
                    />
                  </div>

                  <div className="mt-block flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          shouldFocus.current = true;
                          setStep((current) => (current - 1) as BookingStep);
                        }}
                        className="min-h-11 self-start text-small text-text underline decoration-line-strong decoration-1 underline-offset-4 transition-colors duration-[240ms] ease-brand hover:decoration-accent-text"
                      >
                        ← Назад
                      </button>
                    ) : (
                      <span aria-hidden="true" />
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      disabled={!canAdvance}
                      aria-busy={busy}
                      className="w-full sm:w-auto"
                    >
                      {busy ? "Отправляем…" : step < 4 ? "Далее" : "Подтвердить запись"}
                      {!busy && step < 4 ? <ButtonArrow /> : null}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>

          {confirmation ? null : (
            <div className="hidden lg:col-span-4 lg:col-start-9 lg:block">
              <Summary
                services={services}
                masters={masters}
                serviceId={serviceId}
                masterId={masterId}
                date={date}
                time={time}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
