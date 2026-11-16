"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/components/ui/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Заголовок группы: подряд идущие опции с одинаковым `group` рисуются одной группой. */
  group?: string;
}

interface SelectInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Скрытый input для нативных форм. */
  name?: string;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

interface PanelLayout {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const PANEL_MARGIN = 8;
const PANEL_GAP = 6;
const PANEL_MAX_HEIGHT = 320;
/** Минимум места снизу, чтобы панель не открывалась вниз «на два пункта». */
const PANEL_MIN_SPACE = 168;

function firstEnabledIndex(options: readonly SelectOption[]): number {
  return options.findIndex((option) => !option.disabled);
}

function lastEnabledIndex(options: readonly SelectOption[]): number {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={cn(
        "size-3 shrink-0 text-text-muted transition-transform duration-[160ms] ease-brand",
        open && "rotate-180",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 4.25 6 7.75l3.5-3.5" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="size-3 shrink-0 text-accent-text"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6.3 4.6 8.9 10 3.3" />
    </svg>
  );
}

/**
 * Кастомный select-only combobox: триггер + портал со списком.
 * Фокус всегда остаётся на триггере, активная опция отдаётся через
 * `aria-activedescendant` — так клавиатура и скринридеры ведут себя одинаково.
 */
export function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder = "Выберите",
  disabled = false,
  name,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: SelectInputProps) {
  const baseId = useId();
  const triggerId = id ?? `${baseId}-trigger`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [layout, setLayout] = useState<PanelLayout | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ buffer: "", at: 0 });

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const box = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Триггер ушёл за пределы экрана (скролл модалки/страницы) — закрываемся.
    if (box.bottom < 0 || box.top > viewportHeight) {
      setOpen(false);
      return;
    }

    const spaceBelow = viewportHeight - box.bottom - PANEL_GAP - PANEL_MARGIN;
    const spaceAbove = box.top - PANEL_GAP - PANEL_MARGIN;
    const openUp = spaceBelow < Math.min(PANEL_MAX_HEIGHT, PANEL_MIN_SPACE) && spaceAbove > spaceBelow;
    const available = Math.max(140, openUp ? spaceAbove : spaceBelow);

    const width = Math.min(box.width, viewportWidth - PANEL_MARGIN * 2);
    const left = Math.max(
      PANEL_MARGIN,
      Math.min(box.left, viewportWidth - width - PANEL_MARGIN),
    );
    const maxHeight = Math.min(PANEL_MAX_HEIGHT, available);

    setLayout(
      openUp
        ? { left, width, top: undefined, bottom: viewportHeight - box.top + PANEL_GAP, maxHeight }
        : { left, width, top: box.bottom + PANEL_GAP, bottom: undefined, maxHeight },
    );
  }, []);

  const openList = useCallback(
    (startIndex?: number) => {
      if (disabled) return;
      const fallback = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(options);
      setActiveIndex(startIndex ?? fallback);
      measure();
      setOpen(true);
    },
    [disabled, measure, options, selectedIndex],
  );

  const close = useCallback(() => setOpen(false), []);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      onChange(option.value);
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    },
    [onChange, options],
  );

  const move = useCallback(
    (delta: number) => {
      if (options.length === 0) return;
      let index = activeIndex;
      for (let step = 0; step < options.length; step += 1) {
        index = (index + delta + options.length) % options.length;
        if (!options[index]?.disabled) {
          setActiveIndex(index);
          return;
        }
      }
    },
    [activeIndex, options],
  );

  const onTypeahead = useCallback(
    (key: string) => {
      const now = Date.now();
      const state = typeahead.current;
      state.buffer = now - state.at > 500 ? key : state.buffer + key;
      state.at = now;

      const needle = state.buffer.toLowerCase();
      const from = state.buffer.length === 1 ? activeIndex + 1 : activeIndex;

      for (let step = 0; step < options.length; step += 1) {
        const index = (from + step + options.length) % options.length;
        const option = options[index];
        if (!option || option.disabled) continue;
        if (option.label.toLowerCase().startsWith(needle)) {
          setActiveIndex(index);
          return;
        }
      }
    },
    [activeIndex, options],
  );

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!open) {
      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        openList(event.key === "ArrowUp" ? lastEnabledIndex(options) : undefined);
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      case "Tab":
        close();
        return;
      case "ArrowDown":
        event.preventDefault();
        move(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        return;
      case "Home":
        event.preventDefault();
        setActiveIndex(firstEnabledIndex(options));
        return;
      case "End":
        event.preventDefault();
        setActiveIndex(lastEnabledIndex(options));
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(activeIndex);
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          onTypeahead(event.key);
        }
    }
  };

  const onTriggerPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event.preventDefault();
    triggerRef.current?.focus({ preventScroll: true });
    if (open) close();
    else openList();
  };

  useEffect(() => {
    if (!open) return;

    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    const onScroll = (event: Event) => {
      const target = event.target;
      // Скролл внутри самой панели не должен её переставлять и сбивать выбор.
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      schedule();
    };

    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const node = panelRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;

    // Esc закрывает только список: перехватываем на capture, чтобы диалог-родитель
    // (у которого свой Esc-обработчик на document) не закрылся вместе с ним.
    const onKeyDownCapture = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };

    document.addEventListener("keydown", onKeyDownCapture, true);
    return () => document.removeEventListener("keydown", onKeyDownCapture, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  const segments = useMemo(() => {
    const result: { group?: string; items: { option: SelectOption; index: number }[] }[] = [];
    options.forEach((option, index) => {
      const last = result[result.length - 1];
      if (last && last.group === option.group) last.items.push({ option, index });
      else result.push({ group: option.group, items: [{ option, index }] });
    });
    return result;
  }, [options]);

  const activeOption = activeIndex >= 0 ? options[activeIndex] : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && activeOption ? optionId(activeIndex) : undefined}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onPointerDown={onTriggerPointerDown}
        onKeyDown={onTriggerKeyDown}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && panelRef.current?.contains(next)) return;
          setOpen(false);
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-field border bg-surface px-3 text-left text-[14px] text-text transition-colors duration-[180ms] ease-brand",
          "border-control-border hover:border-line-strong",
          open && "border-line-strong",
          invalid && "border-accent-text",
          disabled &&
            "cursor-not-allowed border-line text-text-disabled opacity-60 hover:border-line",
          className,
        )}
      >
        <span className={cn("truncate", !selected && "text-text-muted")}>
          {selected ? selected.label : placeholder}
        </span>
        <Chevron open={open} />
      </button>

      {name ? <input type="hidden" name={name} value={value} /> : null}

      {open && layout
        ? createPortal(
            <div
              ref={panelRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={triggerId}
              onPointerDown={(event) => event.preventDefault()}
              className="admin-scroll fixed z-[120] overflow-y-auto overscroll-contain border border-line bg-bg p-1 shadow-[0_16px_40px_rgb(0_0_0/0.55)]"
              style={{
                left: layout.left,
                top: layout.top,
                bottom: layout.bottom,
                width: layout.width,
                maxHeight: layout.maxHeight,
              }}
            >
              {options.length === 0 ? (
                <p className="px-2.5 py-2 text-[13px] text-text-muted">Нет вариантов</p>
              ) : null}

              {segments.map((segment, segmentIndex) => (
                <div
                  key={`${segment.group ?? "flat"}-${segmentIndex}`}
                  role={segment.group ? "group" : "presentation"}
                  aria-label={segment.group}
                >
                  {segment.group ? (
                    <p
                      role="presentation"
                      className="px-2.5 pb-1 pt-2 text-micro font-medium uppercase text-text-muted"
                    >
                      {segment.group}
                    </p>
                  ) : null}

                  {segment.items.map(({ option, index }) => {
                    const isSelected = option.value === value;
                    const isActive = index === activeIndex;

                    return (
                      <div
                        key={option.value}
                        id={optionId(index)}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled || undefined}
                        data-index={index}
                        onClick={() => commit(index)}
                        onPointerEnter={() => {
                          if (!option.disabled) setActiveIndex(index);
                        }}
                        className={cn(
                          "admin-select-option flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-[1px] px-2.5 py-1.5 text-[13px] transition-colors duration-[120ms] ease-brand",
                          option.disabled && "cursor-not-allowed text-text-disabled",
                          !option.disabled && isActive && "bg-surface-hover",
                          !option.disabled && !isActive && "hover:bg-surface-hover",
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        {isSelected ? <CheckMark /> : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
