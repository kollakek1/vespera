"use client";

import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface PauseButtonProps {
  paused: boolean;
  onToggle: () => void;
  className?: string;
}

/** Кнопка 44×44 для остановки автоматически движущегося контента (WCAG 2.2.2). */
export function PauseButton({ paused, onToggle, className }: PauseButtonProps): ReactNode {
  return (
    <button
      type="button"
      aria-pressed={paused}
      aria-label={paused ? "Продолжить движение" : "Остановить движение"}
      onClick={onToggle}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-field border border-control-border text-text",
        "transition-colors duration-[240ms] ease-brand hover:border-sand/60 hover:bg-surface",
        className,
      )}
    >
      <span aria-hidden="true" className="flex items-center gap-[3px]">
        {paused ? (
          <span className="block size-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-current" />
        ) : (
          <>
            <span className="block h-3 w-[2px] bg-current" />
            <span className="block h-3 w-[2px] bg-current" />
          </>
        )}
      </span>
    </button>
  );
}
