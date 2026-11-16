"use client";

import { useState } from "react";

import { TESTIMONIALS } from "@/content/site";
import { Marquee } from "@/components/ui/marquee";
import { PauseButton } from "@/components/ui/pause-button";

export function Testimonials() {
  const [paused, setPaused] = useState(false);

  return (
    <section id="testimonials" aria-labelledby="testimonials-title" className="bg-bg py-section">
      <h2 id="testimonials-title" className="sr-only">
        Отзывы гостей
      </h2>

      <div className="mx-auto max-w-page px-gutter">
        <p className="mx-auto max-w-[20ch] text-center font-quote text-quote italic text-text-muted">
          Тишина, к которой возвращаются.
        </p>
      </div>

      <div className="relative mt-stack border-y border-line">
        <Marquee paused={paused} label="Отзывы гостей" className="marquee-mask">
          <ul className="flex items-stretch">
            {TESTIMONIALS.map((testimonial) => (
              <li
                key={testimonial.id}
                className="flex min-h-[220px] min-w-[280px] max-w-[420px] shrink-0 items-center border-l border-line px-8 py-10 md:min-w-[320px]"
              >
                <figure>
                  <blockquote>
                    <p className="text-body text-text">{testimonial.quote}</p>
                  </blockquote>
                  <figcaption className="mt-6">
                    <p className="text-small font-medium text-text">{testimonial.author}</p>
                    <p className="mt-1 text-micro font-medium uppercase text-text-muted">
                      {testimonial.service}
                    </p>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Marquee>

        <PauseButton
          paused={paused}
          onToggle={() => setPaused((value) => !value)}
          className="absolute right-4 top-3 z-10 bg-bg"
        />
      </div>
    </section>
  );
}
