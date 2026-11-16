/**
 * Twitter-карточка повторяет OG: та же картинка, те же размеры.
 * Файл нужен, чтобы Next отдал `twitter:image` (без него соцсеть
 * берёт OG-картинку не всегда).
 */
export { alt, size, contentType, default } from "./opengraph-image";
