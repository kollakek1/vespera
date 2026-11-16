import { ImageResponse } from "next/og";

/**
 * Apple touch icon. `apple-icon.svg` Next в этой версии не принимает
 * (только jpg/png), поэтому рисуем PNG кодом: тот же знак, что в `icon.svg` —
 * тёмный фон, жемчужная сфера, янтарная закатная кромка. Без текста.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const alt = "VESPERA";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "#0B0809",
        }}
      >
        {/* Янтарное свечение вокруг сферы — «закат» */}
        <div
          style={{
            position: "absolute",
            width: 172,
            height: 172,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 46% 52%, rgba(232,121,74,0.34) 0%, rgba(232,121,74,0.12) 54%, rgba(232,121,74,0) 78%)",
          }}
        />

        {/* Жемчужина */}
        <div
          style={{
            position: "relative",
            display: "flex",
            width: 112,
            height: 112,
            borderRadius: "50%",
            border: "1px solid rgba(232,225,240,0.4)",
            background:
              "radial-gradient(circle at 33% 25%, #FFFDF9 0%, #EDE4F0 6%, #B0889C 18%, #5E3D4C 38%, #2A1B23 62%, #140D11 82%, #0B0809 100%)",
          }}
        >
          {/* Тёплый серп у нижней кромки */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 110,
              height: 110,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 74% 82%, rgba(232,121,74,0.55) 0%, rgba(232,121,74,0.12) 26%, rgba(232,121,74,0) 48%)",
            }}
          />
        </div>

        {/* Блик */}
        <div
          style={{
            position: "absolute",
            left: 62,
            top: 52,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, #FFFFFF 0%, rgba(244,239,231,0.5) 46%, rgba(244,239,231,0) 100%)",
          }}
        />
      </div>
    ),
    size,
  );
}
