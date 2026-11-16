import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface EyebrowProps {
  children: ReactNode;
  /** Индекс секции, например `02`. Тогда текст печатается как `02 — УСЛУГИ`. */
  index?: string;
  /** Одна ember-точка на секцию, не больше. */
  dot?: boolean;
  className?: string;
}

export function Eyebrow({ children, index, dot = false, className }: EyebrowProps) {
  return (
    <p className={cn("flex items-center gap-3 text-micro font-medium uppercase text-text-muted", className)}>
      <span aria-hidden="true" className="h-px w-6 shrink-0 bg-line-strong" />
      <span className="whitespace-nowrap">{index ? `${index} — ${children}` : children}</span>
      {dot ? <span aria-hidden="true" className="size-1 shrink-0 rounded-pill bg-accent" /> : null}
    </p>
  );
}
