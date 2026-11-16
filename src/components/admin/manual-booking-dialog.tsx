"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { normalizePhone } from "@/lib/booking";
import { STUDIO_HOURS } from "@/lib/studio";
import {
  AdminApiError,
  adminClient,
  adminErrorMessage,
  isUnauthorized,
  type AdminBookingView,
  type AvailabilitySlot,
  type StudioMaster,
  type StudioService,
} from "@/lib/admin-client";
import { formatPhoneMask } from "@/components/site/booking/types";
import { cn } from "@/components/ui/cn";
import { AdminButton, Field, Modal, SelectInput, TextArea, TextInput } from "@/components/admin/admin-ui";
import { formatMoney, plural, shiftDate, todayKey, weekdayOf } from "@/components/admin/dates";

interface ManualBookingDialogProps {
  initialDate: string;
  onClose: () => void;
  onCreated: (booking: AdminBookingView) => void;
  onUnauthorized: () => void;
}

type SlotsState =
  | { status: "loading"; slots: AvailabilitySlot[]; reason?: undefined; message?: undefined }
  | { status: "ready"; slots: AvailabilitySlot[]; reason?: string; message?: undefined }
  | { status: "error"; slots: AvailabilitySlot[]; reason?: undefined; message: string };

function reasonMessage(reason?: string): string | null {
  switch (reason) {
    case "day_off":
      return "Мастер не работает в этот день.";
    case "date_in_past":
      return "Эта дата уже прошла.";
    case "date_out_of_range":
      return `Запись открыта на ${STUDIO_HOURS.bookingHorizonDays} дней вперёд.`;
    case "master_not_assigned":
      return "Мастер не выполняет эту услугу.";
    default:
      return null;
  }
}

/** Ближайший день, когда мастер работает: не показываем пустой день по умолчанию. */
function firstWorkingDate(from: string, master: StudioMaster | undefined): string {
  if (!master) return from;

  for (let index = 0; index < STUDIO_HOURS.bookingHorizonDays; index += 1) {
    const key = shiftDate(from, index);
    const weekday = weekdayOf(key);
    if (master.workingDays.some((day) => day === weekday)) return key;
  }
  return from;
}

export function ManualBookingDialog({
  initialDate,
  onClose,
  onCreated,
  onUnauthorized,
}: ManualBookingDialogProps) {
  const today = todayKey();
  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const commentId = useId();
  const noteId = useId();

  const [catalog, setCatalog] = useState<{ services: StudioService[]; masters: StudioMaster[] } | null>(
    null,
  );
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogNonce, setCatalogNonce] = useState(0);

  const [serviceId, setServiceId] = useState("");
  const [masterId, setMasterId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [slots, setSlots] = useState<SlotsState>({ status: "loading", slots: [] });

  const services = catalog?.services ?? [];
  const masters = catalog?.masters ?? [];
  const availableMasters = masters.filter((master) => master.serviceIds.includes(serviceId));
  const service = services.find((item) => item.id === serviceId);

  // Ручная запись работает по живому каталогу: удалённые услуги и мастера не предлагаются.
  useEffect(() => {
    let alive = true;

    const load = async () => {
      setCatalogError(null);
      try {
        const response = await adminClient.studio();
        if (!alive) return;

        setCatalog({ services: response.services, masters: response.masters });

        const firstService = response.services[0];
        if (!firstService) return;
        const firstMaster = response.masters.find((master) =>
          master.serviceIds.includes(firstService.id),
        );
        setServiceId(firstService.id);
        setMasterId(firstMaster?.id ?? "");
        setDate(firstWorkingDate(initialDate, firstMaster));
      } catch (caught: unknown) {
        if (!alive) return;
        if (isUnauthorized(caught)) {
          onUnauthorized();
          return;
        }
        setCatalogError(adminErrorMessage(caught, "Не удалось загрузить каталог"));
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [initialDate, onUnauthorized, catalogNonce]);

  useEffect(() => {
    if (!serviceId || !masterId || !date) return;

    const controller = new AbortController();
    let alive = true;

    const load = async () => {
      setSlots({ status: "loading", slots: [] });
      try {
        const data = await adminClient.availability({ serviceId, masterId, date });
        if (!alive || controller.signal.aborted) return;
        setSlots({ status: "ready", slots: data.slots, reason: data.reason });
      } catch (caught: unknown) {
        if (!alive || controller.signal.aborted) return;
        if (isUnauthorized(caught)) {
          onUnauthorized();
          return;
        }
        setSlots({
          status: "error",
          slots: [],
          message: adminErrorMessage(caught, "Не удалось загрузить окна"),
        });
      }
    };

    void load();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [serviceId, masterId, date, nonce, onUnauthorized]);

  const available = slots.status === "ready" ? slots.slots.filter((slot) => slot.available) : [];

  const changeService = (nextId: string) => {
    setServiceId(nextId);
    const nextMasters = masters.filter((master) => master.serviceIds.includes(nextId));
    if (!nextMasters.some((master) => master.id === masterId)) {
      setMasterId(nextMasters[0]?.id ?? "");
    }
    setTime(null);
    setFormError(null);
  };

  const changeMaster = (nextId: string) => {
    setMasterId(nextId);
    setTime(null);
    setFormError(null);
  };

  const changeDate = (nextDate: string) => {
    setDate(nextDate);
    setTime(null);
    setFormError(null);
  };

  const validate = () => {
    const next: { name?: string; phone?: string; email?: string } = {};
    if (name.trim().length < 2) next.name = "Имя не короче 2 символов";
    if (!normalizePhone(phone)) next.phone = "Укажите российский номер: +7 (999) 123-45-67";
    const mail = email.trim();
    if (mail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) {
      next.email = "Проверьте адрес почты";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    if (!serviceId || !masterId || !date || !time) {
      setFormError("Выберите услугу, мастера, дату и время");
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await adminClient.createBooking({
        serviceId,
        masterId,
        date,
        time,
        name: name.trim(),
        phone,
        email: email.trim() || undefined,
        comment: comment.trim() || undefined,
        note: note.trim() || undefined,
        source: "admin",
      });
      onCreated(response.booking);
    } catch (caught: unknown) {
      if (isUnauthorized(caught)) {
        onUnauthorized();
        return;
      }
      if (caught instanceof AdminApiError) {
        if (caught.status === 409) {
          setFormError(caught.message);
          setNonce((value) => value + 1);
          setTime(null);
        } else {
          setFormError(adminErrorMessage(caught, "Не удалось создать запись"));
          const fields = caught.fields;
          if (fields.length > 0) {
            const next: { name?: string; phone?: string; email?: string } = {};
            for (const field of fields) {
              if (field.field === "phone" || field.field === "name" || field.field === "email") {
                next[field.field] = field.message;
              }
            }
            setErrors(next);
          }
        }
      } else {
        setFormError("Сеть недоступна. Проверьте соединение и попробуйте ещё раз");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Ручная запись"
      description="Слоты берём из общего расписания: конфликт покажем сразу, цена и длительность — из справочника."
      className="sm:max-w-2xl"
    >
      {catalogError ? (
        <p role="alert" className="mb-4 border-l-2 border-accent bg-surface px-3 py-2 text-[13px] text-text">
          {catalogError}.{" "}
          <button
            type="button"
            onClick={() => setCatalogNonce((value) => value + 1)}
            className="min-h-11 text-accent-text underline decoration-line-strong underline-offset-4"
          >
            Повторить
          </button>
        </p>
      ) : null}

      {catalog && services.length === 0 ? (
        <p className="mb-4 border border-line bg-surface px-3 py-2 text-[13px] text-text">
          В каталоге нет услуг — добавьте услугу в разделе «Студия».
        </p>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Услуга" htmlFor="manual-service">
            <SelectInput
              id="manual-service"
              value={serviceId}
              onChange={changeService}
              disabled={submitting}
              options={services.map((item) => ({
                value: item.id,
                label: `${item.name} · ${item.durationMin} мин`,
              }))}
            />
          </Field>

          <Field label="Мастер" htmlFor="manual-master">
            <SelectInput
              id="manual-master"
              value={masterId}
              onChange={changeMaster}
              disabled={submitting || availableMasters.length === 0}
              options={availableMasters.map((master) => ({
                value: master.id,
                label: master.name,
              }))}
            />
          </Field>
        </div>

        <Field
          label="Дата"
          htmlFor="manual-date"
          className="sm:max-w-[240px]"
          hint={service ? `Слоты под ${service.durationMin} мин · ${formatMoney(service.priceRub)}` : undefined}
        >
          <TextInput
            id="manual-date"
            type="date"
            value={date}
            min={today}
            max={shiftDate(today, STUDIO_HOURS.bookingHorizonDays)}
            onChange={(event) => changeDate(event.target.value)}
            disabled={submitting}
          />
        </Field>

        <div>
          <p className="text-micro font-medium uppercase text-text-muted">Время</p>

          {slots.status === "loading" ? (
            <div aria-hidden="true" className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {Array.from({ length: 10 }, (_, index) => (
                <span key={index} className="h-10 bg-surface" />
              ))}
            </div>
          ) : null}

          {slots.status === "error" ? (
            <p className="mt-2 text-[13px] text-text-muted">
              {slots.message}.{" "}
              <button
                type="button"
                onClick={() => setNonce((value) => value + 1)}
                className="min-h-11 text-accent-text underline decoration-line-strong underline-offset-4"
              >
                Повторить
              </button>
            </p>
          ) : null}

          {slots.status === "ready" && available.length === 0 ? (
            <p className="mt-2 text-[13px] text-text-muted">
              {reasonMessage(slots.reason) ?? "Свободных окон нет. Выберите другую дату."}
            </p>
          ) : null}

          {slots.status === "ready" && available.length > 0 ? (
            <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {available.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  aria-pressed={time === slot.time}
                  onClick={() => {
                    setTime(slot.time);
                    setFormError(null);
                  }}
                  className={cn(
                    "flex min-h-10 items-center justify-center rounded-field border text-[13px] tabular-nums transition-colors duration-[180ms] ease-brand",
                    time === slot.time
                      ? "border-transparent bg-accent text-on-accent"
                      : "border-line-strong text-text hover:border-control-border hover:bg-surface",
                  )}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          ) : null}

          {time ? (
            <p className="mt-2 text-[12px] text-text-muted tabular-nums">
              Выбрано: {time} · {available.length} {plural(available.length, ["окно", "окна", "окон"])} в дне
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Имя" htmlFor={nameId} error={errors.name}>
            <TextInput
              id={nameId}
              value={name}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              aria-invalid={errors.name ? true : undefined}
            />
          </Field>

          <Field label="Телефон" htmlFor={phoneId} error={errors.phone}>
            <TextInput
              id={phoneId}
              type="tel"
              inputMode="tel"
              value={phone}
              placeholder="+7 (___) ___-__-__"
              autoComplete="tel"
              onChange={(event) => setPhone(formatPhoneMask(event.target.value))}
              disabled={submitting}
              className="tabular-nums"
              aria-invalid={errors.phone ? true : undefined}
            />
          </Field>

          <Field label="Почта · необязательно" htmlFor={emailId} error={errors.email}>
            <TextInput
              id={emailId}
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              aria-invalid={errors.email ? true : undefined}
            />
          </Field>

          <Field label="Заметка администратора" htmlFor={noteId}>
            <TextInput
              id={noteId}
              value={note}
              maxLength={1000}
              onChange={(event) => setNote(event.target.value)}
              disabled={submitting}
              placeholder="Например: постоянный гость"
            />
          </Field>
        </div>

        <Field label="Комментарий гостя · необязательно" htmlFor={commentId}>
          <TextArea
            id={commentId}
            value={comment}
            maxLength={500}
            onChange={(event) => setComment(event.target.value)}
            disabled={submitting}
            className="min-h-20"
          />
        </Field>

        {formError ? (
          <p role="alert" className="border-l-2 border-accent bg-surface px-3 py-2 text-[13px] text-text">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <AdminButton onClick={onClose} disabled={submitting}>
            Отмена
          </AdminButton>
          <AdminButton type="submit" variant="primary" disabled={submitting || !time} aria-busy={submitting}>
            {submitting ? "Создаём…" : "Создать запись"}
          </AdminButton>
        </div>
      </form>
    </Modal>
  );
}
