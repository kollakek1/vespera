import { cacheLife } from "next/cache";

import { SOCIAL_LINKS } from "@/content/site";
import { STUDIO_CONTACTS, STUDIO_HOURS, type StudioMaster, type StudioRitual, type StudioService } from "@/lib/studio";
import { getMasters, getRituals, getServices } from "@/lib/studio-store";
import { BeforeAfter } from "@/components/site/before-after";
import { Booking } from "@/components/site/booking/booking";
import { Footer } from "@/components/site/footer";
import { Hero } from "@/components/site/hero";
import { Intro } from "@/components/site/intro";
import { Manifesto } from "@/components/site/manifesto";
import { Masters } from "@/components/site/masters";
import { Rituals } from "@/components/site/rituals";
import { Services } from "@/components/site/services";
import { Testimonials } from "@/components/site/testimonials";
import { TopBar } from "@/components/site/top-bar";

import { SITE_DESCRIPTION, siteUrl } from "./_seo/site";

interface LandingCatalog {
  services: StudioService[];
  masters: StudioMaster[];
  rituals: StudioRitual[];
}

/**
 * Архивные позиции в публичную страницу не попадают. Слой хранения уже
 * отдаёт активные записи, но фильтр дешёвый и защищает от рассинхрона:
 * каталог меняется в админке, страница не должна показывать снятое с записи.
 */
function isArchived(item: object): boolean {
  return (item as { archived?: unknown }).archived === true;
}

function visible<T extends object>(items: readonly T[]): T[] {
  return items.filter((item) => !isArchived(item));
}

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** `90` → `PT1H30M`: ISO 8601 для schema.org. */
function isoDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts = `${hours > 0 ? `${hours}H` : ""}${rest > 0 ? `${rest}M` : ""}`;
  return `PT${parts || "0M"}`;
}

/**
 * JSON-LD строится из серверного каталога, а не из seed: удалённая в админке
 * услуга исчезает и из разметки. Экранируем `<`, `>` и `&` — каталог
 * редактируется в админке, и подставить в него `</script>` не должно быть можно.
 */
function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function structuredData(services: readonly StudioService[]) {
  const base = siteUrl();
  const salonId = `${base}/#salon`;

  const salon = {
    "@type": "BeautySalon",
    "@id": salonId,
    name: "VESPERA",
    description: SITE_DESCRIPTION,
    url: base,
    image: `${base}/icon.svg`,
    logo: `${base}/icon.svg`,
    telephone: STUDIO_CONTACTS.phoneHref,
    email: STUDIO_CONTACTS.email,
    priceRange: "5500–12000 RUB",
    currenciesAccepted: "RUB",
    paymentAccepted: "Наличные, банковская карта",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Столярный переулок, 3",
      addressLocality: "Москва",
      addressCountry: "RU",
    },
    areaServed: { "@type": "City", name: "Москва" },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [...WEEKDAYS],
        opens: STUDIO_HOURS.opensAt,
        closes: STUDIO_HOURS.closesAt,
      },
    ],
    sameAs: SOCIAL_LINKS.map((link) => link.href),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Услуги VESPERA",
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        price: service.priceRub,
        priceCurrency: "RUB",
        availability: "https://schema.org/InStock",
        itemOffered: {
          "@type": "Service",
          name: service.name,
          description: service.description,
          serviceType: service.name,
          duration: isoDuration(service.durationMin),
          provider: { "@id": salonId },
        },
      })),
    },
  };

  const website = {
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: "VESPERA",
    url: base,
    inLanguage: "ru-RU",
    publisher: { "@id": salonId },
  };

  return { "@context": "https://schema.org", "@graph": [salon, website] };
}

/**
 * Каталог для лендинга.
 *
 * `use cache` держит страницу статической: полный HTML отдаётся сразу, а данные
 * обновляются по `revalidatePath("/")` из админки. Минутный потолок свежести —
 * страховка на случай, если инвалидация не дошла.
 */
async function getLandingCatalog(): Promise<LandingCatalog> {
  "use cache";
  cacheLife("minutes");

  const [services, masters] = await Promise.all([getServices(), getMasters()]);

  return {
    services: visible(services),
    masters: visible(masters),
    rituals: getRituals(),
  };
}

export default async function Home() {
  const { services, masters, rituals } = await getLandingCatalog();

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD: `<`, `>` и `&` экранированы в serializeJsonLd.
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData(services)) }}
      />
      <Intro />
      <TopBar />
      <main id="main" className="overflow-x-clip">
        <Hero />
        <Manifesto />
        <Services services={services} />
        <Rituals rituals={rituals} services={services} />
        <Masters masters={masters} />
        <BeforeAfter />
        <Testimonials />
        <Booking services={services} masters={masters} />
      </main>
      <Footer />
    </>
  );
}
