import type { MouseEvent } from "react";

/**
 * Обычный левый клик без модификаторов.
 *
 * Ссылки-якоря перехватывают клик ради плавного скролла. Ctrl/Cmd/Shift-клик и
 * средняя кнопка должны остаться за браузером: открыть новую вкладку, новое окно,
 * скачать. Поэтому в таких случаях `preventDefault()` не вызываем.
 */
export function isPlainLeftClick(event: MouseEvent<HTMLElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
