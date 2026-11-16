/**
 * Тесты логики записи. Модуль `booking.ts` сознательно чистый — ни базы,
 * ни `next/headers`, — поэтому проверяется напрямую, без моков и без сервера.
 *
 * Фиксированное «сейчас»: 1 мая 2026, 12:00 по Москве. Тестовая дата —
 * 10 мая 2026, воскресенье.
 */

import { describe, expect, it } from "vitest";

import {
  buildAvailability,
  checkRequestedSlot,
  createRateLimiter,
  formatMinutes,
  formatPhoneForDisplay,
  generateUniqueBookingCode,
  intervalsOverlap,
  isSlotBusy,
  maskPhone,
  moscowInstant,
  normalizeBookingCode,
  normalizePhone,
  parseDateKey,
  parseTimeToMinutes,
  statusForSlotReason,
  type BookingRecord,
} from "@/lib/booking";
import type { StudioMaster, StudioService } from "@/lib/studio";

const NOW = new Date("2026-05-01T09:00:00.000Z"); // 12:00 по Москве
const DATE = "2026-05-10"; // воскресенье

const SERVICE: StudioService = {
  id: "svc-skin",
  slug: "skin-ritual",
  name: "Ритуал кожи",
  durationMin: 90,
  priceRub: 12_000,
  description: "Протокол ухода на девяносто минут.",
  ritual: "Очищение, массаж, маска.",
};

const MASTER: StudioMaster = {
  id: "mst-alisa",
  slug: "alisa-vetrova",
  name: "Алиса Ветрова",
  role: "Кожа",
  years: 11,
  serviceIds: [SERVICE.id],
  workingDays: [0, 1, 2, 3, 4, 5, 6],
};

function booking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    code: "VSP-TEST",
    status: "confirmed",
    serviceId: SERVICE.id,
    masterId: MASTER.id,
    serviceName: SERVICE.name,
    serviceSlug: SERVICE.slug,
    masterName: MASTER.name,
    masterSlug: MASTER.slug,
    date: DATE,
    time: "14:00",
    durationMin: 90,
    priceRub: 12_000,
    name: "Гость",
    phone: "+79991234567",
    email: null,
    comment: null,
    createdAt: "2026-05-01T09:00:00.000Z",
    note: null,
    createdBy: "public",
    history: [],
    ...overrides,
  };
}

describe("даты и время", () => {
  it("разбирает корректную дату", () => {
    expect(parseDateKey("2026-05-10")).toEqual({ year: 2026, month: 5, day: 10 });
  });

  it("не пропускает несуществующие дни и мусор", () => {
    expect(parseDateKey("2026-02-30")).toBeNull();
    expect(parseDateKey("2026-13-01")).toBeNull();
    expect(parseDateKey("10.05.2026")).toBeNull();
  });

  it("считает московский момент как UTC+3", () => {
    expect(moscowInstant(DATE, 12 * 60)).toBe(Date.UTC(2026, 4, 10, 9, 0));
  });

  it("переносит минуты через полночь", () => {
    expect(formatMinutes(12 * 60)).toBe("12:00");
    expect(formatMinutes(22 * 60 + 30)).toBe("22:30");
    expect(formatMinutes(24 * 60 + 5)).toBe("00:05");
    expect(parseTimeToMinutes(" 09:05 ")).toBe(545);
    expect(parseTimeToMinutes("25:00")).toBeNull();
  });
});

describe("телефон", () => {
  it("приводит разные записи к +7XXXXXXXXXX", () => {
    expect(normalizePhone("8 999 123-45-67")).toBe("+79991234567");
    expect(normalizePhone("+7 (999) 123 45 67")).toBe("+79991234567");
    expect(normalizePhone("9991234567")).toBe("+79991234567");
  });

  it("отбрасывает мусор и очевидно фальшивые номера", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("9999999999")).toBeNull();
    expect(normalizePhone("+1 415 555 0100")).toBeNull();
  });

  it("маскирует номер для публичных ответов", () => {
    expect(formatPhoneForDisplay("+79991234567")).toBe("+7 999 123-45-67");
    expect(maskPhone("+79991234567")).toBe("+7 9•• ••• 45 67");
    expect(maskPhone("мусор")).toBe("+7 ••• ••• •• ••");
  });
});

describe("пересечение интервалов", () => {
  it("не считает занятостью стык вплотную", () => {
    expect(intervalsOverlap(720, 810, 810, 900)).toBe(false);
  });

  it("видит частичное наложение", () => {
    expect(intervalsOverlap(720, 811, 810, 900)).toBe(true);
  });
});

describe("занятость слота", () => {
  it("блокирует время у занятого мастера", () => {
    expect(isSlotBusy([booking()], MASTER.id, DATE, 13 * 60 + 30, 15 * 60)).toBe(true);
  });

  it("отменённая бронь и неявка слот не держат", () => {
    const bookings = [
      booking({ status: "cancelled" }),
      booking({ code: "VSP-NOSHOW", status: "no_show" }),
    ];
    expect(isSlotBusy(bookings, MASTER.id, DATE, 14 * 60, 15 * 60)).toBe(false);
  });

  it("не путает мастера и дату", () => {
    const bookings = [booking()];
    expect(isSlotBusy(bookings, "mst-other", DATE, 14 * 60, 15 * 60)).toBe(false);
    expect(isSlotBusy(bookings, MASTER.id, "2026-05-11", 14 * 60, 15 * 60)).toBe(false);
  });
});

describe("сетка слотов", () => {
  it("строит шаг 30 минут и не выходит за закрытие", () => {
    const { slots, durationMin } = buildAvailability({
      service: SERVICE,
      master: MASTER,
      date: DATE,
      bookings: [],
      now: NOW,
    });

    expect(durationMin).toBe(90);
    expect(slots[0]?.time).toBe("12:00");
    // 20:30 + 90 минут = 22:00, ровно закрытие; 21:00 уже не помещается.
    expect(slots.at(-1)?.time).toBe("20:30");
    expect(slots).toHaveLength(18);
    expect(slots.every((slot) => slot.available)).toBe(true);
  });

  it("помечает занятые слоты, но не выбрасывает их", () => {
    const { slots } = buildAvailability({
      service: SERVICE,
      master: MASTER,
      date: DATE,
      bookings: [booking()],
      now: NOW,
    });

    const byTime = new Map(slots.map((slot) => [slot.time, slot.available]));
    expect(byTime.get("12:00")).toBe(true);
    // 13:30 + 90 = 15:00 — уже пересекается с бронью 14:00–15:30.
    expect(byTime.get("13:30")).toBe(false);
    expect(byTime.get("14:00")).toBe(false);
    expect(byTime.get("15:30")).toBe(true);
  });

  it("не открывает запись в прошлое, за горизонт и на выходной", () => {
    const past = buildAvailability({
      service: SERVICE,
      master: MASTER,
      date: "2026-04-01",
      bookings: [],
      now: NOW,
    });
    expect(past.reason).toBe("date_in_past");

    const far = buildAvailability({
      service: SERVICE,
      master: MASTER,
      date: "2026-12-31",
      bookings: [],
      now: NOW,
    });
    expect(far.reason).toBe("date_out_of_range");

    const dayOff = buildAvailability({
      service: SERVICE,
      master: { ...MASTER, workingDays: [1, 2, 3, 4, 5, 6] },
      date: DATE,
      bookings: [],
      now: NOW,
    });
    expect(dayOff.reason).toBe("day_off");
  });

  it("не показывает мастера, который не делает эту услугу", () => {
    const result = buildAvailability({
      service: SERVICE,
      master: { ...MASTER, serviceIds: ["svc-other"] },
      date: DATE,
      bookings: [],
      now: NOW,
    });
    expect(result.reason).toBe("master_not_assigned");
    expect(result.slots).toEqual([]);
  });
});

describe("проверка конкретного слота", () => {
  const base = { service: SERVICE, master: MASTER, date: DATE, bookings: [], now: NOW };

  it("принимает свободное время сетки", () => {
    const result = checkRequestedSlot({ ...base, time: "15:00" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.startMin).toBe(15 * 60);
      expect(result.endMin).toBe(16 * 60 + 30);
    }
  });

  it("отклоняет время вне сетки", () => {
    const result = checkRequestedSlot({ ...base, time: "15:15" });
    expect(result).toMatchObject({ ok: false, reason: "invalid_slot" });
  });

  it("отклоняет время раньше лид-тайма", () => {
    const result = checkRequestedSlot({
      ...base,
      now: new Date("2026-05-10T09:00:00.000Z"), // 12:00 в день визита
      time: "12:30",
    });
    expect(result).toMatchObject({ ok: false, reason: "slot_in_past" });
  });

  it("отклоняет занятое время", () => {
    const result = checkRequestedSlot({ ...base, bookings: [booking()], time: "14:00" });
    expect(result).toMatchObject({ ok: false, reason: "slot_taken" });
  });

  it("отдаёт 409 только за занятость, остальное — 400", () => {
    expect(statusForSlotReason("slot_taken")).toBe(409);
    expect(statusForSlotReason("day_off")).toBe(400);
    expect(statusForSlotReason("slot_in_past")).toBe(400);
  });
});

describe("код брони", () => {
  it("генерирует уникальный код в ожидаемом формате", () => {
    const taken = new Set(["VSP-AAAA", "VSP-BBBB"]);
    const code = generateUniqueBookingCode(taken);

    expect(code).not.toBe("VSP-AAAA");
    expect(taken.has(code)).toBe(false);
    expect(normalizeBookingCode(code)).toBe(code);
  });

  it("считает регистр и пробелы незначимыми при вводе", () => {
    expect(normalizeBookingCode("  vsp-7k4m ")).toBe("VSP-7K4M");
    expect(normalizeBookingCode("7K4M")).toBeNull();
  });
});

describe("rate limit", () => {
  it("пропускает лимит и закрывается на окно", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    const key = "203.0.113.7";

    expect(limiter.check(key, NOW).allowed).toBe(true);
    expect(limiter.check(key, NOW).allowed).toBe(true);

    const blocked = limiter.check(key, NOW);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("сбрасывается после успешного входа", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.check("key", NOW);
    expect(limiter.check("key", NOW).allowed).toBe(false);

    limiter.reset("key");
    expect(limiter.check("key", NOW).allowed).toBe(true);
  });
});
