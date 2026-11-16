"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button, ButtonArrow } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { useReducedMotionPreference } from "@/providers/reduced-motion-provider";

const QUERY = "(hover: hover) and (pointer: fine) and (min-width: 1024px)";
const MAX_SHIFT = 8;
const PULL = 0.12;

const SPRING = { stiffness: 150, damping: 15, mass: 0.5 };

interface MagneticCTAProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}

/**
 * Кнопка притягивается к курсору на ≤8px. Трансформ живёт на обёртке,
 * кольцо фокуса — на самой кнопке, поэтому клавиатура ничего не ловит.
 */
export function MagneticCTA({ children, onClick, className }: MagneticCTAProps) {
  const reduced = useReducedMotionPreference();
  const [fine, setFine] = useState(false);
  const hostRef = useRef<HTMLSpanElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const sync = () => setFine(media.matches && !reduced);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [reduced]);

  useEffect(() => {
    if (!fine) {
      x.set(0);
      y.set(0);
    }
  }, [fine, x, y]);

  const active = fine && !reduced;

  return (
    <motion.span
      ref={hostRef}
      className={cn("u-inline-block", className)}
      style={{ x: springX, y: springY }}
      onPointerMove={
        active
          ? (event) => {
              const host = hostRef.current;
              if (!host) return;
              const rect = host.getBoundingClientRect();
              const dx = (event.clientX - (rect.left + rect.width / 2)) * PULL;
              const dy = (event.clientY - (rect.top + rect.height / 2)) * PULL;
              x.set(Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, dx)));
              y.set(Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, dy)));
            }
          : undefined
      }
      onPointerLeave={
        active
          ? () => {
              x.set(0);
              y.set(0);
            }
          : undefined
      }
    >
      <Button variant="primary" size="lg" className="w-full" onClick={onClick}>
        {children}
        <ButtonArrow />
      </Button>
    </motion.span>
  );
}
