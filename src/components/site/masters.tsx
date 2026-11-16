"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import type { StudioMaster } from "@/lib/studio";
import { masterMedia } from "@/components/site/media";
import { requestBooking, useScrollToSection } from "@/hooks/use-scroll-to-section";
import { CatalogEmpty } from "@/components/site/catalog-empty";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/components/ui/cn";
import { pluralize } from "@/components/ui/format";
import { useReducedMotionPreference } from "@/providers/reduced-motion-provider";

const CARD_GAP = 24;

/** Заголовок считает мастеров, а не пересказывает seed. */
function mastersTitle(count: number): string {
  if (count === 0) return "Мастера";
  if (count === 4) return "Четыре человека";
  return `${count} ${pluralize(count, ["мастер", "мастера", "мастеров"])}`;
}

interface MastersProps {
  /** Каталог из `studio-store`. */
  masters: StudioMaster[];
}

export function Masters({ masters }: MastersProps) {
  const reduced = useReducedMotionPreference();
  const scrollToSection = useScrollToSection();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragMoved = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setProgress(max > 0 ? track.scrollLeft / max : 0);
    setAtStart(track.scrollLeft <= 2);
    setAtEnd(max - track.scrollLeft <= 2);
  }, []);

  useEffect(() => {
    sync();
    const track = trackRef.current;
    track?.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      track?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>("[data-master-card]");
    const step = firstCard ? firstCard.offsetWidth + CARD_GAP : 320;
    track.scrollBy({ left: direction * step, behavior: reduced ? "auto" : "smooth" });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const track = trackRef.current;
    if (!track) return;

    const startX = event.clientX;
    const startScroll = track.scrollLeft;
    let moved = false;

    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      if (Math.abs(delta) > 4) {
        if (!moved) {
          moved = true;
          dragMoved.current = true;
          setDragging(true);
        }
        track.scrollLeft = startScroll - delta;
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragging(false);
      if (moved) window.setTimeout(() => {
        dragMoved.current = false;
      }, 0);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const openMaster = (masterId: string) => {
    if (dragMoved.current) return;
    requestBooking({ masterId });
    scrollToSection("booking");
  };

  return (
    <section id="masters" aria-labelledby="masters-title" className="relative overflow-x-clip bg-bg py-section">
      <div className="mx-auto max-w-page px-gutter">
        <SectionHeader
          id="masters-title"
          index="04"
          eyebrow="Мастера"
          title={mastersTitle(masters.length)}
          note="Больше не берём — иначе теряется смысл."
        />
      </div>

      {masters.length === 0 ? (
        <div className="mx-auto mt-stack max-w-page px-gutter">
          <CatalogEmpty>
            Мастера обновляют расписание. Позвоните — скажем, кто принимает на этой неделе.
          </CatalogEmpty>
        </div>
      ) : (
        <>
          <div className="mx-auto mt-stack max-w-page px-gutter">
            <div className="flex items-center justify-between gap-4">
              <p className="text-micro font-medium uppercase text-text-muted">
                Прокрутите · {String(masters.length).padStart(2, "0")}{" "}
                {pluralize(masters.length, ["мастер", "мастера", "мастеров"])}
              </p>
              <div className="hidden gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => scrollByCard(-1)}
                  disabled={atStart}
                  aria-label="Предыдущий мастер"
                  className="inline-flex size-11 items-center justify-center rounded-field border border-control-border text-text transition-colors duration-[240ms] ease-brand hover:border-sand/60 hover:bg-surface disabled:cursor-not-allowed disabled:border-line disabled:text-text-disabled"
                >
                  <span aria-hidden="true">←</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollByCard(1)}
                  disabled={atEnd}
                  aria-label="Следующий мастер"
                  className="inline-flex size-11 items-center justify-center rounded-field border border-control-border text-text transition-colors duration-[240ms] ease-brand hover:border-sand/60 hover:bg-surface disabled:cursor-not-allowed disabled:border-line disabled:text-text-disabled"
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>

          <div className="relative mt-block">
            <div
              ref={trackRef}
              data-dragging={dragging ? "true" : "false"}
              onPointerDown={onPointerDown}
              className={cn(
                "masters-track no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain px-gutter pb-2 select-none [scroll-padding-left:var(--spacing-gutter)]",
                dragging ? "cursor-grabbing" : "cursor-grab",
              )}
            >
              {masters.map((master, index) => {
                const media = masterMedia(master.id);

                return (
                  <div
                    key={master.id}
                    data-master-card
                    className="w-[clamp(248px,24vw,340px)] shrink-0 snap-start"
                  >
                    <button
                      type="button"
                      onClick={() => openMaster(master.id)}
                      className="group block w-full text-left"
                    >
                      <div className="plate-kind relative aspect-[3/4] overflow-hidden rounded-card border border-line">
                        {media ? (
                          <Image
                            src={media.src}
                            alt={`${master.name}, ${master.role}: ${media.alt}`}
                            fill
                            sizes="(min-width: 1024px) 340px, 248px"
                            loading="lazy"
                            style={{ objectPosition: media.position }}
                            className="object-cover transition-transform duration-[700ms] ease-brand group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
                          />
                        ) : (
                          <div
                            className="plate-figure plate-kind absolute inset-0 transition-transform duration-[700ms] ease-brand group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
                            data-figure={index % 4}
                          >
                            <span className="plate-figure__silhouette" />
                            <span className="plate-figure__horizon" />
                          </div>
                        )}
                      </div>

                      <div className="pt-4">
                        <p className="text-[18px] font-medium leading-[1.3]">{master.name}</p>
                        <div
                          className={cn(
                            "mt-1 translate-y-0 opacity-100",
                            "md:translate-y-2 md:opacity-0 md:transition-[opacity,transform] md:duration-[240ms] md:delay-[60ms] md:ease-brand",
                            "md:group-hover:translate-y-0 md:group-hover:opacity-100",
                            "md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100",
                          )}
                        >
                          <p className="text-small text-text-muted">{master.role}</p>
                          <p className="mt-1 text-micro font-medium uppercase tabular-nums text-text-muted">
                            {master.years}{" "}
                            {pluralize(master.years, ["год", "года", "лет"])}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[120px] bg-gradient-to-l from-bg to-transparent" />
          </div>

          <div className="mx-auto mt-block max-w-page px-gutter">
            <div
              aria-hidden="true"
              className="relative h-px w-full overflow-hidden bg-line-strong"
            >
              <span
                className="absolute inset-y-0 left-0 w-1/4 bg-accent transition-transform duration-[120ms] ease-linear"
                style={{ transform: `translateX(${progress * 300}%)` }}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
