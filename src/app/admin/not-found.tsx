import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * 404 внутри консоли: без лендинговой типографики и CTA записи.
 * Компактная тёмная панель, один понятный путь назад — в календарь.
 */
export default function AdminNotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center px-6 py-16">
      <div className="w-full max-w-[32rem] border border-line bg-surface p-8 md:p-10">
        <p className="text-micro font-medium uppercase text-text-muted">Консоль · 404</p>

        <h1 className="mt-4 font-display text-h3 font-normal">Страница не найдена</h1>

        <p className="mt-3 text-small text-text-muted">
          Адрес устарел или в нём опечатка. Если открывали запись — возможно, её удалили
          или код изменился.
        </p>

        <Link
          href="/admin"
          className="mt-8 inline-flex min-h-11 items-center gap-2 text-small text-text underline decoration-line-strong decoration-1 underline-offset-4 transition-colors duration-[240ms] ease-brand hover:decoration-accent-text"
        >
          <span aria-hidden="true">←</span>
          В календарь
        </Link>
      </div>
    </div>
  );
}
