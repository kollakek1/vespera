"use client";

import { useEffect } from "react";

const STORAGE_KEY = "vespera:intro";
const TOTAL_MS = 900;
const SKIP_MS = 190;

/**
 * Занавес на 900 мс. Разметка есть в серверном HTML, показ включает boot-скрипт
 * (`data-intro="play"`), поэтому первый кадр не мигает. При reduce-motion
 * оверлей скрыт CSS и не рендерится визуально вовсе.
 */
export function Intro() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "play") return;

    let finished = false;
    let timer = window.setTimeout(finish, TOTAL_MS);

    function finish() {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      root.dataset.intro = "off";
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // Приватный режим: интро просто сыграет ещё раз в следующей вкладке.
      }
      detach();
    }

    function skip() {
      if (finished) return;
      window.clearTimeout(timer);
      root.dataset.intro = "skip";
      timer = window.setTimeout(finish, SKIP_MS);
    }

    const onSkip = () => skip();
    const onKey = () => skip();

    function detach() {
      window.removeEventListener("wheel", onSkip);
      window.removeEventListener("pointerdown", onSkip);
      window.removeEventListener("keydown", onKey);
    }

    window.addEventListener("wheel", onSkip, { passive: true });
    window.addEventListener("pointerdown", onSkip);
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(timer);
      detach();
    };
  }, []);

  return (
    <div className="intro" aria-hidden="true">
      <div className="intro__ghost">
        <span className="orb-fallback block" />
      </div>
      <p className="intro__word">Vespera</p>
    </div>
  );
}
