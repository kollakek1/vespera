import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/components/ui/cn";

interface SectionHeaderProps {
  /** `id` заголовка: секция ссылается на него через `aria-labelledby`. */
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  note?: ReactNode;
  className?: string;
}

export function SectionHeader({ id, index, eyebrow, title, note, className }: SectionHeaderProps) {
  return (
    <header className={className}>
      <div aria-hidden="true" className="h-px w-full bg-line" />
      <div className="mt-6 grid grid-cols-4 gap-x-inline gap-y-block md:grid-cols-12">
        <div className="col-span-4 md:col-span-7">
          <Eyebrow index={index}>{eyebrow}</Eyebrow>
          <h2
            id={id}
            className={cn(
              "mt-5 max-w-[18ch] text-balance font-display text-h2 font-light",
              "hyphens-none",
            )}
          >
            {title}
          </h2>
        </div>
        {note ? (
          <p className="col-span-4 max-w-full text-small text-text-muted md:col-span-4 md:col-start-9 md:max-w-note md:self-end">
            {note}
          </p>
        ) : null}
      </div>
    </header>
  );
}
