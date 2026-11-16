"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";

import { HERO } from "@/content/site";
import { requestBooking, useScrollToSection } from "@/hooks/use-scroll-to-section";
import { AnchorLink } from "@/components/ui/anchor-link";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MagneticCTA } from "@/components/ui/magnetic-cta";
import { Marquee } from "@/components/ui/marquee";
import { PauseButton } from "@/components/ui/pause-button";
import { HeroStage } from "@/components/site/hero-stage";
import { useReducedMotionPreference } from "@/providers/reduced-motion-provider";
import { STUDIO_HOURS } from "@/lib/studio";

export function Hero() {
  const reduced = useReducedMotionPreference();
  const scrollToSection = useScrollToSection();
  const heroRef = useRef<HTMLElement>(null);
  const [orbReady, setOrbReady] = useState(false);
  const [tickerPaused, setTickerPaused] = useState(false);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const orbScale = useTransform(scrollYProgress, [0, 1], [1, 0.82]);
  const orbShift = useTransform(scrollYProgress, [0, 1], [0, -40]);

  const openBooking = () => {
    requestBooking();
    scrollToSection("booking");
  };

  return (
    <section
      id="top"
      ref={heroRef}
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[max(100svh,600px)] flex-col overflow-x-clip bg-bg"
    >
      <motion.div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-0 opacity-[0.55] md:opacity-100",
          // Скролл-трансформации живут на полноэкранной обёртке, поэтому точку
          // отсчёта ставим в центр жемчужины: иначе при уменьшении масштаба
          // орб уезжает к центру обёртки — влево.
          "[transform-origin:50%_31.4%] md:[transform-origin:72%_42%] lg:[transform-origin:68%_36%]",
        )}
        style={reduced ? undefined : { scale: orbScale, y: orbShift }}
      >
        <div
          className={cn(
            "absolute left-1/2 top-[31.4%] aspect-square w-[max(120px,17.8svh)] max-w-[70vw] -translate-x-1/2 -translate-y-1/2",
            "md:left-[72%] md:top-[42%] md:w-[38svh]",
            "lg:left-[68%] lg:top-[37%] lg:w-[60svh] xl:top-[36%] xl:w-[64svh] 2xl:w-[64svh]",
          )}
        >
          <span
            className={cn(
              "orb-fallback block transition-opacity duration-[700ms] ease-brand",
              orbReady && "opacity-0",
            )}
          />
        </div>
        <HeroStage onReady={() => setOrbReady(true)} />
      </motion.div>

      <div className="relative z-10 mx-auto flex w-full max-w-page flex-1 flex-col px-gutter">
        <div className="flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-line">
          <span className="font-display text-[15px] font-light uppercase tracking-[0.42em] -mr-[0.42em]">
            Vespera
          </span>
          <div className="flex items-center gap-6 text-small text-text-muted lg:hidden xl:flex 3xl:hidden">
            <span className="tabular-nums">
              {STUDIO_HOURS.opensAt}–{STUDIO_HOURS.closesAt}
            </span>
            <span className="hidden text-text-muted lg:inline">Ежедневно</span>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col">
          <Eyebrow className="hero-rise absolute inset-x-0 top-20">{HERO.eyebrow}</Eyebrow>

          <div className="grid flex-1 grid-cols-4 content-start gap-x-inline pt-[calc(42svh-72px)] md:grid-cols-12 md:pt-[calc(30svh-72px)]">
            <div className="col-span-4 md:col-span-12">
              <h1 id="hero-title" className="font-display text-display font-light">
                {HERO.titleLines.map((line) => (
                  <span key={line} className="hero-line">
                    <span>{line}</span>
                  </span>
                ))}
              </h1>

              <div className="mt-8 flex flex-col gap-4 md:mt-12 md:flex-row md:items-center">
                <div className="hero-rise--late w-full md:w-auto">
                  <MagneticCTA className="w-full md:w-auto" onClick={openBooking}>
                    Записаться
                  </MagneticCTA>
                </div>
                <AnchorLink
                  href="#services"
                  className={cn(
                    "hero-rise--late",
                    buttonClasses({ variant: "ghost", size: "lg", className: "w-full md:w-auto" }),
                  )}
                >
                  Услуги
                </AnchorLink>
              </div>

              <p className="hero-rise--late mt-8 hidden max-w-[22rem] text-lead font-light text-sand md:block lg:hidden">
                {HERO.lead}
              </p>
            </div>

            <div className="col-span-4 hidden lg:absolute lg:bottom-3 lg:right-0 lg:block lg:w-[22rem]">
              <p className="hero-rise--late max-w-[22rem] text-lead font-light text-sand">
                {HERO.lead}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-line">
        <div className="mx-auto flex min-h-[72px] max-w-page flex-col justify-center gap-1 px-gutter py-3 md:grid md:grid-cols-12 md:items-center md:gap-x-inline md:py-0">
          <span className="text-micro font-medium uppercase text-text-muted tabular-nums md:col-span-3">
            {STUDIO_HOURS.opensAt}–{STUDIO_HOURS.closesAt} · ежедневно
          </span>
          <span className="text-micro font-medium uppercase text-text-muted md:col-span-3">
            Столярный пер., 3
          </span>
          <div className="hidden items-center gap-4 md:col-span-6 md:col-start-7 md:flex">
            <div className="min-w-0 flex-1" aria-hidden="true">
              <Marquee paused={tickerPaused} className="marquee-mask">
                <div className="flex items-center gap-10 pr-10 text-micro font-medium uppercase text-text-muted">
                  {HERO.ticker.map((item) => (
                    <span key={item} className="whitespace-nowrap">
                      {item}
                    </span>
                  ))}
                </div>
              </Marquee>
            </div>
            <PauseButton
              paused={tickerPaused}
              onToggle={() => setTickerPaused((value) => !value)}
              className="border-line text-text-muted"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
