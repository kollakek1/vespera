"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { CASES, type CaseStudy } from "@/content/site";
import { caseMedia } from "@/components/site/media";
import { pluralize } from "@/components/ui/format";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/components/ui/cn";

const MIN = 0;
const MAX = 100;

function clamp(value: number): number {
  return Math.min(MAX, Math.max(MIN, Math.round(value)));
}

/**
 * Сравнение двух масштабов одного кадра: слева фрагмент, справа кадр целиком.
 *
 * Это не «до/после»: оба слоя — кропы одного исходника, поэтому разница
 * между ними физически не может быть ретушью. Слайдер показывает именно
 * масштаб, а подпись честно называет коэффициент.
 */
function ScaleSlider({ item }: { item: CaseStudy }) {
  const [value, setValue] = useState(50);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const media = caseMedia(item.id);

  const setFromClientX = (clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width === 0) return;
    setValue(clamp(((clientX - rect.left) / rect.width) * 100));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    let handled = true;

    switch (event.key) {
      case "ArrowLeft":
        setValue((current) => clamp(current - step));
        break;
      case "ArrowRight":
        setValue((current) => clamp(current + step));
        break;
      case "Home":
        setValue(MIN);
        break;
      case "End":
        setValue(MAX);
        break;
      case "PageUp":
        setValue((current) => clamp(current + 25));
        break;
      case "PageDown":
        setValue((current) => clamp(current - 25));
        break;
      default:
        handled = false;
    }

    if (handled) event.preventDefault();
  };

  const macroLabel = media ? `Макро ${media.zoom}` : "Макро";

  return (
    <figure className="min-w-0">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-micro font-medium uppercase tabular-nums text-text-muted">
          {item.index} · {item.title} · {item.meta}
        </p>
        <p className="hidden text-small text-text-muted sm:block">{item.note}</p>
      </div>

      <div
        ref={frameRef}
        role="group"
        aria-roledescription="сравнение масштабов"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          setFromClientX(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!dragging) return;
          setFromClientX(event.clientX);
        }}
        onPointerUp={(event) => {
          setDragging(false);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => setDragging(false)}
        className={cn(
          "relative mt-4 aspect-square touch-pan-y select-none overflow-hidden rounded-card border border-line md:aspect-[5/4]",
          dragging ? "cursor-grabbing" : "cursor-ew-resize",
        )}
      >
        {media ? (
          <>
            <Image
              src={media.macro.src}
              alt={media.macro.alt}
              fill
              sizes="(min-width: 768px) 46vw, 100vw"
              loading="lazy"
              style={{ objectPosition: media.macro.position }}
              className="object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 0 0 ${value}%)` }}
            >
              <Image
                src={media.frame.src}
                alt={media.frame.alt}
                fill
                sizes="(min-width: 768px) 46vw, 100vw"
                loading="lazy"
                style={{ objectPosition: media.frame.position }}
                className="object-cover"
              />
            </div>
          </>
        ) : (
          <>
            <div
              className="plate-tone--before absolute inset-0"
              role="img"
              aria-label={`${item.title}: макро`}
            />
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 0 0 ${value}%)` }}
              role="img"
              aria-label={`${item.title}: кадр целиком`}
            >
              <div className="plate-tone--after h-full w-full" />
            </div>
          </>
        )}
        <div aria-hidden="true" className="plate-kind pointer-events-none absolute inset-0" />

        <span className="absolute left-4 top-4 border border-line bg-bg/60 px-2.5 py-1.5 text-micro font-medium uppercase text-text">
          {macroLabel}
        </span>
        <span className="absolute right-4 top-4 border border-line bg-bg/60 px-2.5 py-1.5 text-micro font-medium uppercase text-text">
          Кадр
        </span>

        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-milk/90"
          style={{ left: `${value}%` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-10 -translate-x-full bg-gradient-to-l from-ink/55 to-transparent"
          style={{ left: `${value}%` }}
        />

        <div
          role="slider"
          tabIndex={0}
          aria-label="Позиция сравнения: макро и кадр"
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={value}
          aria-valuetext={`${value} ${pluralize(value, ["процент", "процента", "процентов"])}: слева макро ${media?.zoom ?? ""}, справа кадр целиком`.replace(/\s+/g, " ").trim()}
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
          className="absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 rounded-field border border-line-strong bg-milk text-ink transition-transform duration-[240ms] ease-brand focus-visible:outline-[var(--color-focus)] hover:scale-[1.06]"
          style={{ left: `clamp(22px, ${value}%, calc(100% - 22px))` }}
        >
          <span aria-hidden="true" className="block h-3 w-px bg-current" />
          <span aria-hidden="true" className="block h-3 w-px bg-current" />
        </div>
      </div>

      <figcaption className="mt-4 text-small text-text-muted">{item.caption}</figcaption>
    </figure>
  );
}

export function BeforeAfter() {
  return (
    <section id="before-after" aria-labelledby="before-after-title" className="bg-bg px-gutter py-section">
      <div className="mx-auto max-w-page">
        <SectionHeader
          id="before-after-title"
          index="05"
          eyebrow="Масштаб"
          title="Один свет"
          note="Без ретуши. Оба слоя — один снимок."
        />

        <div className="mt-stack grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
          {CASES.map((item, index) => (
            <div
              key={item.id}
              className={index === 0 ? "lg:col-span-6" : "lg:col-span-6 lg:col-start-7"}
            >
              <ScaleSlider item={item} />
            </div>
          ))}
        </div>

        <p className="mt-block text-micro font-medium uppercase text-text-muted">
          Потяните разделитель · ← → с клавиатуры
        </p>
      </div>
    </section>
  );
}
