"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Fragment, useRef, type ReactNode } from "react";

import { MANIFESTO } from "@/content/site";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useReducedMotionPreference } from "@/providers/reduced-motion-provider";

const WORDS = MANIFESTO.statement.split(" ");

function Word({
  progress,
  index,
  total,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotionPreference();
  const start = index / total;
  const end = Math.min(1, start + 1 / total);
  const opacity = useTransform(progress, [start, end], [0.18, 1]);

  if (reduced) return <span>{children}</span>;

  return (
    <motion.span style={{ opacity }} className="u-inline-block">
      {children}
    </motion.span>
  );
}

export function Manifesto() {
  const statementRef = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: statementRef,
    offset: ["start 0.9", "end 0.55"],
  });

  return (
    <section
      id="manifesto"
      data-theme="paper"
      aria-labelledby="manifesto-title"
      className="relative overflow-hidden bg-bg px-gutter py-section text-text"
    >
      <div className="mx-auto max-w-page">
        <div className="grid grid-cols-4 gap-x-inline md:grid-cols-12">
          <Eyebrow index="01" className="col-span-4 md:col-span-3">
            Манифест
          </Eyebrow>

          <div className="col-span-4 mt-8 md:col-span-9 md:col-start-4 md:mt-0">
            <p
              ref={statementRef}
              id="manifesto-title"
              className="max-w-[22ch] text-balance font-display text-h1 font-light lg:text-pretty"
            >
              {WORDS.map((word, index) => (
                <Fragment key={`${word}-${index}`}>
                  <Word progress={scrollYProgress} index={index} total={WORDS.length}>
                    {word}
                  </Word>
                  {index < WORDS.length - 1 ? " " : null}
                  {word.endsWith(".") && index < WORDS.length - 1 ? (
                    <br className="hidden lg:inline" />
                  ) : null}
                </Fragment>
              ))}
            </p>

            <p className="mt-block max-w-measure text-body text-text-muted">{MANIFESTO.body}</p>
          </div>
        </div>

        <figure className="mt-section-sm grid grid-cols-4 gap-x-inline md:grid-cols-12">
          <blockquote className="col-span-4 md:col-span-5 md:col-start-5">
            <p className="max-w-[22ch] font-quote text-quote italic text-text-muted">
              «{MANIFESTO.quote}»
            </p>
            <figcaption className="mt-6 text-micro font-medium uppercase text-text-muted">
              {MANIFESTO.signature}
            </figcaption>
          </blockquote>
        </figure>
      </div>

      <div
        aria-hidden="true"
        className="absolute right-[var(--spacing-gutter)] top-[calc(var(--spacing-section)+24px)] hidden size-[120px] -rotate-[8deg] items-center justify-center rounded-full border border-line-strong text-center text-micro font-medium uppercase text-text-muted lg:flex"
      >
        Vespera
        <br />
        Moscow
      </div>
    </section>
  );
}
