"use client";

import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import { useScrollToSection } from "@/hooks/use-scroll-to-section";
import { isPlainLeftClick } from "@/components/ui/plain-click";

interface AnchorLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
}

/** Якорь, который ведёт скролл через Lenis (или нативный smooth при reduce). */
export function AnchorLink({ href, children, className, onNavigate }: AnchorLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const scrollToSection = useScrollToSection();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Ctrl/Cmd/Shift-клик и средняя кнопка — это «открыть в новой вкладке».
    // Перехватываем только обычный левый клик.
    if (!isPlainLeftClick(event)) return;

    const id = href.replace(/^#/, "");

    // Ссылки футера адресуют секции главной. На /privacy такой секции нет,
    // и без перехода по полному адресу клик молча ничего не делал бы.
    if (!document.getElementById(id)) {
      if (pathname && pathname !== "/") {
        event.preventDefault();
        onNavigate?.();
        router.push(`/#${id}`);
      }
      return;
    }

    event.preventDefault();
    onNavigate?.();
    scrollToSection(id);
  };

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
