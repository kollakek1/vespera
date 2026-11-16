/**
 * Предпросмотр slug для формы: сервер генерирует slug сам, но админу полезно
 * видеть результат до сохранения. Транслит повторяет `slugify` из `studio-store`,
 * который нельзя импортировать в клиент (там node:fs).
 */

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** «Ритуал кожи» → `ritual-kozhi`; пустая строка, если slug пока не получается. */
export function slugPreview(value: string): string {
  const transliterated = value
    .toLowerCase()
    .split("")
    .map((char) => TRANSLIT[char] ?? char)
    .join("");

  const slug = transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return slug.length >= 2 ? slug : "";
}
