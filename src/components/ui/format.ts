const priceFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

/** `12000` → `12 000 ₽` (неразрывные пробелы, чтобы цена не рвалась). */
export function formatPrice(rub: number): string {
  return `${priceFormatter.format(rub)} ₽`.replace(/ /g, "\u00A0");
}

/** Русские формы множественного числа: 1 процент, 3 процента, 7 процентов. */
export function pluralize(count: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}
