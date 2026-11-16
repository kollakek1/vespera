import type { Metadata } from "next";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { StatusScreen } from "./_ui/status-screen";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      eyebrow="Страница"
      title="Страница ушла за закат"
      description="Такой страницы нет — возможно, ссылка устарела или её переписали. Вернитесь на главную или запишитесь: подберём время."
      actions={
        <>
          <Link href="/" className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}>
            На главную
          </Link>
          <Link
            href="/#booking"
            className={buttonClasses({ variant: "ghost", size: "lg", className: "w-full sm:w-auto" })}
          >
            Записаться
          </Link>
        </>
      }
    />
  );
}
