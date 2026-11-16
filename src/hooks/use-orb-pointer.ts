"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Указатель для 3D-сцены. Живёт в ref, а не в состоянии: координаты меняются
 * каждый кадр, React о них знать не должен. Слушатели пассивные — сцена не
 * перехватывает ни скролл, ни выделение текста, ни клики по интерфейсу.
 */

const INTERACTIVE = "a,button,[role='button'],input,textarea,select,label,summary";
/** Нажатие старше этого возраста не строит волну: сцена могла быть на паузе. */
const PRESS_TTL = 400;

export interface OrbPointerState {
  /** Координаты в NDC: −1 слева/снизу, 1 справа/сверху. */
  x: number;
  y: number;
  /** Пиксельные координаты последнего движения — для рейкаста. */
  clientX: number;
  clientY: number;
  /** `performance.now()` последнего движения; от него считается простой. */
  movedAt: number;
  /** Указатель в окне. */
  present: boolean;
  /** Точный указатель (мышь/трекпад): только там есть hover. */
  fine: boolean;
  /** Нажатие, которое кадр должен превратить в волну (или отбросить). */
  press: { pending: boolean; clientX: number; clientY: number; at: number };
}

function initialState(): OrbPointerState {
  return {
    x: 0,
    y: 0,
    clientX: 0,
    clientY: 0,
    // Дыхание простоя отсчитывается от монтирования, а не от начала эпохи.
    movedAt: typeof performance === "undefined" ? 0 : performance.now(),
    present: false,
    fine: false,
    press: { pending: false, clientX: 0, clientY: 0, at: 0 },
  };
}

export interface OrbPress {
  clientX: number;
  clientY: number;
}

export function useOrbPointer() {
  const pointer = useRef<OrbPointerState>(initialState());

  /**
   * Забирает нажатие, если оно было. Возвращает координаты один раз:
   * следующий кадр уже не должен строить волну заново. Нажатие старше
   * `PRESS_TTL` отбрасывается — сцена могла быть на паузе вне вьюпорта,
   * и волна не должна догонять пользователя при возврате в hero.
   */
  const consumePress = useCallback((): OrbPress | null => {
    const press = pointer.current.press;
    if (!press.pending) return null;
    press.pending = false;
    if (performance.now() - press.at > PRESS_TTL) return null;
    return { clientX: press.clientX, clientY: press.clientY };
  }, []);

  useEffect(() => {
    const state = pointer.current;
    state.fine = window.matchMedia("(pointer: fine)").matches;

    const onMove = (event: PointerEvent) => {
      state.x = (event.clientX / window.innerWidth) * 2 - 1;
      state.y = 1 - (event.clientY / window.innerHeight) * 2;
      state.clientX = event.clientX;
      state.clientY = event.clientY;
      state.movedAt = performance.now();
      state.present = true;
    };

    const onLeave = () => {
      state.present = false;
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      const target = event.target;
      // Кнопки, ссылки, поля: волна не должна спорить с действием интерфейса.
      if (target instanceof Element && target.closest(INTERACTIVE)) return;

      // Касание тоже целится светом: на тач-устройстве другого способа нет.
      state.x = (event.clientX / window.innerWidth) * 2 - 1;
      state.y = 1 - (event.clientY / window.innerHeight) * 2;
      state.clientX = event.clientX;
      state.clientY = event.clientY;
      state.movedAt = performance.now();
      state.present = true;

      state.press.pending = true;
      state.press.clientX = event.clientX;
      state.press.clientY = event.clientY;
      state.press.at = performance.now();
    };

    const onBlur = () => {
      state.present = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return { pointer, consumePress };
}
