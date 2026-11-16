"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Последний рубеж: упал сам корневой layout, поэтому `globals.css` и шрифты
 * могут быть недоступны. Всё держим на инлайновых стилях и системном шрифте.
 */
const BG = "#0B0809";
const TEXT = "#F4EFE7";
const MUTED = "#8A8279";
const ACCENT = "#E8794A";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[vespera] Ошибка вне корневого layout:", error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
          color: TEXT,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            VESPERA
          </p>

          <h1
            style={{
              margin: "16px 0 0",
              fontSize: "clamp(28px, 6vw, 40px)",
              fontWeight: 300,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
            }}
          >
            Что-то пошло не так
          </h1>

          <p style={{ margin: "12px 0 0", fontSize: "16px", lineHeight: 1.6, color: MUTED }}>
            Попробуйте ещё раз — данные не потеряны.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "20px", marginTop: "28px" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: "48px",
                padding: "0 24px",
                border: 0,
                borderRadius: "2px",
                background: ACCENT,
                color: BG,
                font: "inherit",
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              Попробовать снова
            </button>

            <Link href="/" prefetch={false} style={{ color: TEXT, fontSize: "14px", textUnderlineOffset: "4px" }}>
              На главную
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
