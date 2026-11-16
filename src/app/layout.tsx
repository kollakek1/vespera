import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Onest, Unbounded } from "next/font/google";

import { IntroBootstrap } from "@/components/site/intro-bootstrap";
import { AppProviders } from "@/providers/app-providers";

import { SITE_DESCRIPTION, siteUrl } from "./_seo/site";

import "./globals.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["cyrillic", "latin"],
  weight: ["200", "300", "400"],
  display: "swap",
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["cyrillic", "latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["cyrillic", "latin"],
  weight: ["300"],
  style: ["italic"],
  display: "swap",
});

export const metadata: Metadata = {
  // Домен `vespera.studio` ещё не подключён: адрес берём из окружения,
  // иначе canonical и og:url указывали бы на несуществующий хост.
  metadataBase: new URL(siteUrl()),
  title: {
    default: "VESPERA — красота после заката",
    template: "%s — VESPERA",
  },
  description: SITE_DESCRIPTION,
  applicationName: "VESPERA",
  authors: [{ name: "VESPERA" }],
  keywords: ["бьюти-студия", "Москва", "уход за кожей", "брови", "стрижка", "макияж", "запись онлайн"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "VESPERA",
    url: "/",
    title: "VESPERA — красота после заката",
    description:
      "Студия вечерних ритуалов: один мастер, один гость, девяносто минут тишины. Москва, Столярный переулок, 3.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VESPERA — красота после заката",
    description:
      "Студия вечерних ритуалов: один мастер, один гость, девяносто минут тишины. Москва, Столярный переулок, 3.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0809",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${unbounded.variable} ${onest.variable} ${cormorant.variable} antialiased`}
    >
      <body className="min-h-svh bg-bg text-text">
        <IntroBootstrap />
        <a href="#main" className="skip-link">
          К содержанию
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
