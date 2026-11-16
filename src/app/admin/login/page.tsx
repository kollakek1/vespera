import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Вход",
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-svh flex-col px-5 py-8">
      <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center">
        <h1 className="sr-only">Вход в консоль VESPERA</h1>

        <p className="font-display text-[15px] font-light uppercase tracking-[0.42em] -mr-[0.42em] text-text">
          Vespera
        </p>
        <p className="mt-4 font-quote text-[1.25rem] italic text-text-muted">
          Студия вечерних ритуалов
        </p>

        <LoginForm />

        <Link
          href="/"
          className="mt-12 inline-flex min-h-11 w-fit items-center text-[13px] text-text-muted underline decoration-line-strong underline-offset-4 transition-colors duration-[180ms] ease-brand hover:text-text hover:decoration-accent-text"
        >
          На сайт
        </Link>
      </div>
    </main>
  );
}
