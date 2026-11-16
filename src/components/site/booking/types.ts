export type BookingStep = 1 | 2 | 3 | 4;

export interface SlotOption {
  time: string;
  available: boolean;
}

export interface AvailabilityData {
  date: string;
  serviceId: string;
  masterId: string;
  durationMin: number | null;
  timezone: string;
  slots: SlotOption[];
  reason?: string;
}

export interface ContactDraft {
  name: string;
  phone: string;
  email: string;
  comment: string;
  consent: boolean;
  /**
   * Honeypot. Имя не похоже на осмысленное поле: браузерные автозаполнители
   * не кладут сюда «Организацию», поэтому реальная заявка не превращается
   * в фиктивный успех. Человек это поле не видит и не заполняет.
   */
  vesperaHp: string;
}

export interface ContactErrors {
  name?: string;
  phone?: string;
  email?: string;
  consent?: string;
}

export const EMPTY_CONTACTS: ContactDraft = {
  name: "",
  phone: "",
  email: "",
  comment: "",
  consent: false,
  vesperaHp: "",
};

/** Маска `+7 (___) ___-__-__`, цифры всегда в одном порядке. */
export function formatPhoneMask(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";

  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith("7")) digits = `7${digits}`;
  digits = digits.slice(0, 11);

  const national = digits.slice(1);
  let result = "+7";
  if (national.length > 0) result += ` (${national.slice(0, 3)}`;
  if (national.length >= 3) result += ")";
  if (national.length > 3) result += ` ${national.slice(3, 6)}`;
  if (national.length > 6) result += `-${national.slice(6, 8)}`;
  if (national.length > 8) result += `-${national.slice(8, 10)}`;
  return result;
}

export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}
