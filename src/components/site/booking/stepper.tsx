"use client";

import { motion } from "motion/react";

import { cn } from "@/components/ui/cn";
import { EASE_BRAND } from "@/components/ui/motion-ease";
import { useReducedMotionPreference } from "@/providers/reduced-motion-provider";
import type { BookingStep } from "./types";

const STEPS = [
  { id: 1 as BookingStep, label: "Услуга" },
  { id: 2 as BookingStep, label: "Мастер" },
  { id: 3 as BookingStep, label: "Время" },
  { id: 4 as BookingStep, label: "Контакты" },
];

interface StepperProps {
  step: BookingStep;
  onGo: (step: BookingStep) => void;
}

export function Stepper({ step, onGo }: StepperProps) {
  const reduced = useReducedMotionPreference();
  const current = STEPS[step - 1];

  return (
    <div>
      <ol className="hidden items-center gap-inline md:flex">
        {STEPS.map((item, index) => (
          <li
            key={item.id}
            className={cn("flex items-center gap-inline", index < STEPS.length - 1 && "flex-1")}
          >
            <button
              type="button"
              disabled={item.id > step}
              aria-current={item.id === step ? "step" : undefined}
              onClick={() => onGo(item.id)}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 text-left",
                item.id > step && "cursor-not-allowed",
                item.id < step && "text-text hover:text-accent-text",
              )}
            >
              <span
                className={cn(
                  "text-micro font-medium tabular-nums",
                  item.id === step ? "text-accent-text" : "text-text-muted",
                )}
              >
                0{item.id}
              </span>
              <span
                className={cn(
                  "text-small",
                  item.id === step ? "font-medium text-text" : item.id < step ? "text-text" : "text-text-muted",
                )}
              >
                {item.label}
              </span>
            </button>
            {index < STEPS.length - 1 ? (
              <span aria-hidden="true" className="h-px flex-1 bg-line" />
            ) : null}
          </li>
        ))}
      </ol>

      <p className="text-micro font-medium uppercase text-text-muted md:hidden">
        Шаг {step} из 4 — {current?.label}
      </p>

      <div aria-hidden="true" className="mt-3 h-0.5 w-full bg-line">
        <motion.span
          className="block h-full origin-left bg-accent-text"
          initial={false}
          animate={{ scaleX: step / 4 }}
          transition={{ duration: reduced ? 0.12 : 0.42, ease: EASE_BRAND }}
        />
      </div>
    </div>
  );
}
