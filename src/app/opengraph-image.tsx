import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/**
 * OG-картинка 1200×630 целиком из фигур и градиентов: тёмный обсидиан,
 * янтарное свечение, жемчужная сфера с закатной кромкой.
 *
 * Шрифты лежат файлами в `src/app/_fonts` (TTF-сабсеты с кириллицей):
 * `next/og` не тянет шрифты сам, а Satori не понимает woff2.
 * Читаем их на уровне модуля — тогда у маршрута нет I/O на запрос
 * и картинка prerenderится на сборке.
 */
export const alt = "VESPERA — красота после заката. Москва, Столярный переулок, 3";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_DIR = join(process.cwd(), "src/app/_fonts");

const [displayFont, textFont] = await Promise.all([
  readFile(join(FONT_DIR, "Unbounded-Light.ttf")),
  readFile(join(FONT_DIR, "Onest-Regular.ttf")),
]);

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          // Закатное свечение живёт в фоне самого кадра: радиальный градиент
          // гаснет задолго до краёв, поэтому не оставляет прямоугольной плашки.
          background: "#0B0809",
          backgroundImage:
            "radial-gradient(ellipse 780px 620px at 14% 108%, rgba(232,121,74,0.26) 0%, rgba(232,121,74,0.10) 46%, rgba(11,8,9,0) 72%)",
          overflow: "hidden",
        }}
      >

        {/* Жемчужина */}
        <div
          style={{
            position: "absolute",
            right: 76,
            top: 128,
            width: 388,
            height: 388,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "2px solid rgba(232,121,74,0.4)",
            background:
              "radial-gradient(circle at 50% 50%, rgba(232,121,74,0.16) 0%, rgba(232,121,74,0.04) 58%, rgba(11,8,9,0) 80%)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 350,
              height: 350,
              borderRadius: "50%",
              border: "1px solid rgba(232,225,240,0.24)",
              background:
                "radial-gradient(circle at 33% 25%, #FFFDF9 0%, #EDE4F0 6%, #B0889C 18%, #5E3D4C 38%, #2A1B23 62%, #140D11 82%, #0B0809 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 98,
              top: 74,
              width: 52,
              height: 52,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, #FFFFFF 0%, rgba(244,239,231,0.5) 48%, rgba(244,239,231,0) 100%)",
            }}
          />
        </div>

        {/* Текстовая колонка */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 700,
            height: "100%",
            padding: "74px 0 74px 76px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Onest",
              fontSize: 19,
              letterSpacing: 5.5,
              color: "#DED3C4",
            }}
          >
            BEAUTY STUDIO · MOSCOW
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Unbounded",
                fontWeight: 300,
                fontSize: 96,
                lineHeight: 1,
                letterSpacing: 7,
                color: "#F4EFE7",
              }}
            >
              VESPERA
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Unbounded",
                fontWeight: 300,
                fontSize: 34,
                lineHeight: 1.25,
                marginTop: 26,
                color: "#DED3C4",
              }}
            >
              Красота после заката
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                width: 548,
                height: 1,
                background: "rgba(244,239,231,0.22)",
              }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "Onest",
                fontSize: 23,
                marginTop: 24,
                color: "#DED3C4",
              }}
            >
              Москва · Столярный переулок, 3 · 12:00–22:00
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Unbounded", data: displayFont, style: "normal", weight: 300 },
        { name: "Onest", data: textFont, style: "normal", weight: 400 },
      ],
    },
  );
}
