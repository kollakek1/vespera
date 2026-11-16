"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useReducedMotionPreference } from "@/providers/reduced-motion-provider";

const PearlScene = dynamic(() => import("@/components/three/pearl-scene"), { ssr: false });

interface SceneBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

interface SceneBoundaryState {
  failed: boolean;
}

/**
 * Декоративная сцена не имеет права уронить страницу: если WebGL-контекст
 * не создался или шейдер не собрался, остаётся CSS-жемчужина.
 */
class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

interface HeroStageProps {
  onReady?: () => void;
}

/**
 * Обёртка над WebGL: решает, можно ли вообще рисовать, и держит сцену
 * на паузе, когда hero вне вьюпорта или вкладка скрыта.
 */
export function HeroStage({ onReady }: HeroStageProps) {
  const reduced = useReducedMotionPreference();
  const hostRef = useRef<HTMLDivElement>(null);
  const [webgl, setWebgl] = useState(false);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
    const supported = context !== null;

    // Результат проверки кладём в состояние после текущего кадра:
    // canvas уже может жить в DOM, если поддержка есть.
    queueMicrotask(() => {
      if (!cancelled) setWebgl(supported);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let inView = true;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        inView = entry.isIntersecting;
        setActive(inView && !document.hidden);
      },
      { threshold: 0.01 },
    );
    observer.observe(host);

    const onVisibility = () => setActive(inView && !document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const handleReady = useCallback(() => {
    setReady(true);
    onReady?.();
  }, [onReady]);

  const handleError = useCallback(() => {
    setFailed(true);
  }, []);

  const enabled = webgl && !reduced && !failed;

  return (
    <div ref={hostRef} className="relative h-full w-full">
      {enabled ? (
        <div className="orb-canvas h-full w-full" data-ready={ready}>
          <SceneBoundary onError={handleError}>
            <PearlScene active={active} onReady={handleReady} />
          </SceneBoundary>
        </div>
      ) : null}
    </div>
  );
}
