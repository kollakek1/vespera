"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { AdminApiError, adminClient } from "@/lib/admin-client";
import { cn } from "@/components/ui/cn";
import { AdminButton, INPUT_CLASS } from "@/components/admin/admin-ui";

type Phase = "checking" | "idle" | "submitting";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LoginForm() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Только ошибка формата email: общая «Неверный email или пароль» поле не подсвечивает. */
  const [emailInvalid, setEmailInvalid] = useState(false);

  useEffect(() => {
    let alive = true;
    adminClient
      .checkSession()
      .then((session) => {
        if (!alive) return;
        if (session.authenticated) {
          router.replace("/admin");
          return;
        }
        setPhase("idle");
      })
      .catch(() => {
        if (alive) setPhase("idle");
      });
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    if (phase === "idle") emailRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phase === "submitting") return;

    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Проверьте email");
      setEmailInvalid(true);
      emailRef.current?.focus({ preventScroll: true });
      return;
    }
    if (password.length === 0) {
      setError("Введите пароль");
      setEmailInvalid(false);
      passwordRef.current?.focus({ preventScroll: true });
      return;
    }

    setPhase("submitting");
    setError(null);
    setEmailInvalid(false);

    try {
      await adminClient.login(trimmedEmail, password);
      router.replace("/admin");
    } catch (caught: unknown) {
      if (caught instanceof AdminApiError) {
        // 401 — общая ошибка пары email/пароль, поле email валидно.
        setEmailInvalid(caught.fields.some((field) => field.field === "email"));
        if (caught.status === 401) setError("Неверный email или пароль");
        else if (caught.status === 429) setError("Слишком много попыток, попробуйте позже");
        else setError(caught.message);
      } else {
        setEmailInvalid(false);
        setError("Сеть недоступна. Проверьте соединение и попробуйте ещё раз");
      }
      setPhase("idle");
    }
  };

  const disabled = phase !== "idle";

  return (
    <form onSubmit={onSubmit} noValidate className="mt-10 flex flex-col gap-5">
      <div>
        <label
          htmlFor={emailId}
          className="mb-1.5 block text-micro font-medium uppercase text-text-muted"
        >
          Email
        </label>
        <input
          ref={emailRef}
          id={emailId}
          name="email"
          type="email"
          autoComplete="username"
          spellCheck={false}
          value={email}
          disabled={disabled}
          aria-invalid={emailInvalid ? true : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailInvalid(false);
            if (error) setError(null);
          }}
          className={cn(INPUT_CLASS, "h-12 text-[15px]")}
        />
      </div>

      <div>
        <label
          htmlFor={passwordId}
          className="mb-1.5 block text-micro font-medium uppercase text-text-muted"
        >
          Пароль
        </label>
        <div className="relative">
          <input
            ref={passwordRef}
            id={passwordId}
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            disabled={disabled}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError(null);
            }}
            className={cn(INPUT_CLASS, "h-12 pr-12 text-[15px]")}
          />

          <button
            type="button"
            aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
            aria-pressed={visible}
            onClick={() => setVisible((value) => !value)}
            className="absolute right-0 top-0 inline-flex size-12 items-center justify-center rounded-field text-text-muted transition-colors duration-[180ms] ease-brand hover:text-text"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            >
              <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
              <circle cx="12" cy="12" r="2.5" />
              {visible ? null : <path d="M4.5 19.5 19.5 4.5" />}
            </svg>
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-[13px] text-accent-text">
          {error}
        </p>
      ) : null}

      <AdminButton
        type="submit"
        variant="primary"
        className="h-12 w-full text-[15px]"
        disabled={disabled}
        aria-busy={phase === "submitting"}
      >
        {phase === "submitting" ? "Входим…" : "Войти"}
      </AdminButton>
    </form>
  );
}
