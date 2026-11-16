"use client";

import { useEffect, useRef } from "react";

import type { BookingConfirmationView } from "@/lib/booking";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/components/ui/format";
import { STUDIO_CONTACTS } from "@/lib/studio";
import { formatDateLong } from "./dates";

interface SuccessProps {
  confirmation: BookingConfirmationView;
  onReset: () => void;
}

export function Success({ confirmation, onReset }: SuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const node = headingRef.current;
    if (!node) return;
    node.focus({ preventScroll: true });
    node.scrollIntoView({ block: "center", behavior: "auto" });
  }, []);

  return (
    <div role="status" aria-live="polite">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-h3 font-normal text-text"
      >
        Запись принята
      </h3>

      <p className="mt-4 u-inline-block border border-line-strong px-6 py-5 font-display text-[32px] font-light tracking-[0.06em] tabular-nums text-text">
        {confirmation.code}
      </p>
      <p className="mt-3 text-small text-text-muted">Код брони — назовите его при звонке.</p>

      <p className="mt-6 max-w-measure text-body text-text">
        Мы позвоним для подтверждения. Если планы изменятся — {STUDIO_CONTACTS.phone}.
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-micro font-medium uppercase text-text-muted">Услуга</dt>
          <dd className="mt-1 text-small text-text">{confirmation.service?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-micro font-medium uppercase text-text-muted">Мастер</dt>
          <dd className="mt-1 text-small text-text">{confirmation.master?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-micro font-medium uppercase text-text-muted">Дата и время</dt>
          <dd className="mt-1 text-small tabular-nums text-text">
            {formatDateLong(confirmation.date)} · {confirmation.time}
          </dd>
        </div>
        <div>
          <dt className="text-micro font-medium uppercase text-text-muted">Итого</dt>
          <dd className="mt-1 text-small tabular-nums text-text">
            {formatPrice(confirmation.priceRub)}
          </dd>
        </div>
      </dl>

      <Button variant="ghost" size="md" className="mt-8" onClick={onReset}>
        Записать ещё
      </Button>
    </div>
  );
}
