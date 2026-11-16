import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/components/ui/cn";

export type ButtonVariant = "primary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

const BASE =
  "group relative inline-flex items-center justify-center gap-3 rounded-field border font-sans font-normal tracking-[0.01em] whitespace-nowrap transition-[background-color,border-color,color,transform] duration-[240ms] ease-brand select-none disabled:cursor-not-allowed disabled:pointer-events-none";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-[13px]",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-8 text-[15px]",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-press active:scale-[0.985] focus-visible:outline-[var(--color-text)] disabled:bg-surface disabled:text-text-disabled",
  ghost:
    "border-control-border bg-transparent text-text hover:border-sand/60 hover:bg-surface active:bg-surface-hover active:scale-[0.985] disabled:border-line disabled:text-text-disabled",
};

export function buttonClasses({ variant = "primary", size = "md", className }: ButtonStyleOptions = {}): string {
  return cn(BASE, SIZES[size], VARIANTS[variant], className);
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & Omit<ButtonStyleOptions, "className">;

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

type ButtonLinkProps = ComponentPropsWithoutRef<"a"> & Omit<ButtonStyleOptions, "className">;

export function ButtonLink({ variant = "ghost", size = "md", className, ...props }: ButtonLinkProps) {
  return <a className={buttonClasses({ variant, size, className })} {...props} />;
}

/** Стрелка внутри кнопки: смещается на hover, смысл остаётся в тексте. */
export function ButtonArrow() {
  return (
    <span
      aria-hidden="true"
      className="u-inline-block text-[0.95em] leading-none transition-transform duration-[240ms] ease-brand group-hover:translate-x-1"
    >
      →
    </span>
  );
}
