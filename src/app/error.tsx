"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { StatusScreen } from "./_ui/status-screen";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Граница ошибки для всего лендинга. Наружу не отдаём ни текст ошибки,
 * ни digest: гостю нужен спокойный экран и понятный следующий шаг.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const logged = useRef<Error | null>(null);

  useEffect(() => {
    document.title = "Что-то пошло не так — VESPERA";

    // Один раз на ошибку: в консоли достаточно одной записи для отладки.
    if (logged.current === error) return;
    logged.current = error;
    console.error("[vespera] Ошибка на странице:", error);
  }, [error]);

  return (
    <StatusScreen
      code="500"
      eyebrow="Ошибка"
      title="Что-то пошло не так"
      description="Попробуйте ещё раз — данные не потеряны. Если не откроется, позвоните: примем запись вручную."
      actions={
        <>
          <Button size="lg" onClick={() => reset()} className="w-full sm:w-auto">
            Попробовать снова
          </Button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center text-small text-text underline decoration-line-strong decoration-1 underline-offset-4 transition-colors duration-[240ms] ease-brand hover:decoration-accent-text"
          >
            На главную
          </Link>
        </>
      }
    />
  );
}
