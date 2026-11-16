"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Общая блокировка скролла для вложенных диалогов: панель брони + подтверждение
 * не должны «разлочивать» страницу друг за другом.
 */
let scrollLocks = 0;

function lockScroll(): void {
  scrollLocks += 1;
  if (scrollLocks === 1) document.body.style.overflow = "hidden";
}

function unlockScroll(): void {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = "";
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Стек открытых диалогов: Esc и Tab обрабатывает только верхний. */
const dialogStack: symbol[] = [];

/**
 * Фокус-ловушка для модальных диалогов: начальный фокус, Tab по кругу,
 * Esc и возврат фокуса на элемент, который открыл диалог.
 *
 * Эффект зависит только от `open`: инлайновый `onClose` у вызывающих не должен
 * пересоздавать ловушку на каждый ре-рендер (иначе фокус прыгает и теряется).
 * Сам колбэк читаем из ref.
 */
export function useDialogFocus(
  open: boolean,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const idRef = useRef<symbol>(Symbol("dialog"));

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const id = idRef.current;
    dialogStack.push(id);
    const isTop = () => dialogStack[dialogStack.length - 1] === id;

    const active = document.activeElement;
    // Возвращать фокус внутрь самого диалога бессмысленно: элемент вот-вот исчезнет.
    restoreRef.current =
      active instanceof HTMLElement &&
      active !== document.body &&
      !container.contains(active)
        ? active
        : null;

    lockScroll();

    const focusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) =>
          element.tabIndex >= 0 &&
          (element.offsetParent !== null || element === document.activeElement),
      );

    const target = initialFocusRef?.current ?? focusable()[0];
    target?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
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
      const index = dialogStack.lastIndexOf(id);
      if (index >= 0) dialogStack.splice(index, 1);
      unlockScroll();

      const target = restoreRef.current;
      if (target && target.isConnected && !container.contains(target)) {
        target.focus({ preventScroll: true });
      }
      restoreRef.current = null;
    };
  }, [open, initialFocusRef]);

  return containerRef;
}
