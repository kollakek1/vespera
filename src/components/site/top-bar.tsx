"use client";

import { AnimatePresence, motion, useScroll } from "motion/react";
import { useLenis } from "lenis/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { NAV_LINKS } from "@/content/site";
import { requestBooking, useScrollToSection } from "@/hooks/use-scroll-to-section";
import { AnchorLink } from "@/components/ui/anchor-link";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EASE_BRAND } from "@/components/ui/motion-ease";
import { useReducedMotionPreference } from "@/providers/reduced-motion-provider";
import { STUDIO_CONTACTS, STUDIO_HOURS } from "@/lib/studio";

export function TopBar() {
  const reduced = useReducedMotionPreference();
  const lenis = useLenis();
  const scrollToSection = useScrollToSection();
  const [visible, setVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: progress } = useScroll();

  useEffect(() => {
    const hero = document.getElementById("top");
    const sync = () => {
      const threshold = hero ? hero.offsetHeight * 0.84 : window.innerHeight;
      setVisible(window.scrollY > threshold);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    lenis?.stop();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstLink = dialogRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled])");
    firstLink?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;

      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      lenis?.start();
    };
  }, [menuOpen, closeMenu, lenis]);

  const openBooking = () => {
    setMenuOpen(false);
    requestBooking();
    scrollToSection("booking");
  };

  const barVisible = visible || menuOpen;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[var(--z-nav)] border-b border-line bg-bg",
          "transition-[transform,opacity] duration-[240ms] ease-brand",
          barVisible
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-full opacity-0 pointer-events-none",
        )}
      >
        <div aria-hidden="true" className="relative h-0.5 w-full bg-line">
          <motion.span
            className="absolute inset-y-0 left-0 w-full origin-left bg-accent"
            style={{ scaleX: progress }}
          />
        </div>

        <div className="mx-auto flex h-[71px] max-w-page items-center justify-between gap-6 px-gutter">
          <AnchorLink
            href="#top"
            className="font-display text-[15px] font-light uppercase tracking-[0.42em] -mr-[0.42em] transition-colors duration-[240ms] ease-brand hover:text-accent-text"
          >
            Vespera
          </AnchorLink>

          <nav aria-label="Разделы страницы" className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <AnchorLink
                key={link.href}
                href={link.href}
                className="text-small text-text-muted transition-colors duration-[240ms] ease-brand hover:text-text"
              >
                {link.label}
              </AnchorLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={`tel:${STUDIO_CONTACTS.phoneHref}`}
              className="hidden text-small text-text-muted transition-colors duration-[240ms] ease-brand hover:text-text xl:inline"
            >
              {STUDIO_CONTACTS.phone}
            </a>
            <button type="button" onClick={openBooking} className={buttonClasses({ size: "md" })}>
              Записаться
            </button>
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((value) => !value)}
              className="-mr-2 inline-flex size-11 items-center justify-center rounded-field text-text transition-colors duration-[240ms] ease-brand hover:bg-surface lg:hidden"
            >
              <span aria-hidden="true" className="flex w-6 flex-col gap-[6px]">
                <span className="block h-px w-full bg-current" />
                <span className="block h-px w-full bg-current" />
              </span>
              <span className="sr-only">Меню</span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="mobile-menu"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Меню"
            className="fixed inset-0 z-[calc(var(--z-nav)+1)] flex flex-col bg-bg px-gutter pt-4 pb-8 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.12 : 0.24, ease: EASE_BRAND }}
          >
            <div className="flex h-[56px] items-center justify-between">
              <span className="font-display text-[15px] font-light uppercase tracking-[0.42em] -mr-[0.42em]">
                Vespera
              </span>
              <button
                type="button"
                onClick={closeMenu}
                className="-mr-2 inline-flex size-11 items-center justify-center rounded-field text-text transition-colors duration-[240ms] ease-brand hover:bg-surface"
              >
                <span aria-hidden="true" className="relative block size-4">
                  <span className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-current" />
                  <span className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-current" />
                </span>
                <span className="sr-only">Закрыть меню</span>
              </button>
            </div>

            <nav aria-label="Разделы страницы" className="mt-10 flex flex-1 flex-col">
              <ul className="flex flex-col">
                {NAV_LINKS.map((link) => (
                  <li key={link.href} className="border-b border-line">
                    <AnchorLink
                      href={link.href}
                      onNavigate={closeMenu}
                      className={cn(
                        "flex min-h-[64px] items-center font-display text-h3 font-light",
                        "transition-colors duration-[240ms] ease-brand hover:text-accent-text",
                      )}
                    >
                      {link.label}
                    </AnchorLink>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-4 pt-10">
                <button
                  type="button"
                  onClick={openBooking}
                  className={buttonClasses({ size: "lg", className: "w-full" })}
                >
                  Записаться
                </button>
                <div className="flex flex-col gap-1 text-small text-text-muted">
                  <span className="tabular-nums">
                    {STUDIO_HOURS.opensAt}–{STUDIO_HOURS.closesAt} · ежедневно
                  </span>
                  <span>{STUDIO_CONTACTS.address}</span>
                  <a
                    href={`tel:${STUDIO_CONTACTS.phoneHref}`}
                    className="min-h-[44px] content-center transition-colors duration-[240ms] ease-brand hover:text-text"
                  >
                    {STUDIO_CONTACTS.phone}
                  </a>
                </div>
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
