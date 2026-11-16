import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Footer } from "@/components/site/footer";
import { Eyebrow } from "@/components/ui/eyebrow";
import { STUDIO_CONTACTS } from "@/lib/studio";

/** Дата редакции: меняется вместе с текстом, а не с релизом сайта. */
const REVISED_AT = "16 ноября 2026";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description:
    "Какие данные VESPERA получает при записи, зачем они нужны, где хранятся и как их удалить. Без аналитики и рекламных трекеров.",
  alternates: {
    canonical: "/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const LINK =
  "underline decoration-line-strong decoration-1 underline-offset-4 transition-colors duration-[240ms] ease-brand hover:decoration-accent-text";

interface SectionProps {
  id: string;
  index: string;
  title: string;
  children: ReactNode;
}

/** Раздел документа: номер в поле, заголовок, волосяная линия. Без карточек. */
function Section({ id, index, title, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 border-t border-line pt-6 md:pt-8"
    >
      <div className="flex items-baseline gap-3 md:gap-4">
        <span aria-hidden="true" className="text-micro font-medium tabular-nums text-text-muted">
          {index}
        </span>
        <h2
          id={`${id}-title`}
          className="max-w-[24ch] text-balance font-display text-h3 font-light tracking-[-0.01em] hyphens-none"
        >
          {title}
        </h2>
      </div>
      <div className="mt-4 space-y-3.5 text-pretty text-body text-text sm:space-y-4 max-md:hyphens-auto">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-svh bg-bg text-text">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-page items-center justify-between gap-4 px-gutter py-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center font-display text-[15px] font-light uppercase tracking-[0.42em] -mr-[0.42em] transition-colors duration-[240ms] ease-brand hover:text-text-muted"
          >
            Vespera
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-small text-text-muted transition-colors duration-[240ms] ease-brand hover:text-text"
          >
            <span aria-hidden="true">←</span>
            На главную
          </Link>
        </div>
      </header>

      <main id="main" className="px-gutter pb-section pt-[clamp(56px,7vw,104px)]">
        <div className="mx-auto w-full max-w-page">
          <div className="max-w-[52rem]">
            <Eyebrow dot>Документ</Eyebrow>
            <h1
              id="privacy-title"
              className="mt-5 max-w-[16ch] text-balance font-display text-[clamp(1.5rem,6.2vw,3.75rem)] font-light leading-[1.04] tracking-[-0.03em] hyphens-none"
            >
              Политика конфиденциальности
            </h1>
            <p className="mt-6 max-w-measure text-pretty text-lead text-text-muted max-md:hyphens-auto">
              Коротко: мы собираем имя, телефон и детали записи, чтобы вы пришли в студию в нужное
              время. Данные не продаём и рекламу не шлём.
            </p>
          </div>

          <div aria-hidden="true" className="mt-block h-px w-full bg-line" />

          <div className="mt-block grid grid-cols-1 gap-block lg:grid-cols-12 lg:gap-x-inline">
            <aside className="lg:col-span-3">
              <div className="lg:sticky lg:top-24">
                <p className="text-micro font-medium uppercase text-text-muted">Редакция</p>
                <p className="mt-2 text-small tabular-nums">{REVISED_AT}</p>

                <p className="mt-6 max-w-[16rem] font-quote text-[1.375rem] italic leading-[1.28] text-text-muted">
                  Собираем только то, без чего запись не состоится.
                </p>

                <p className="mt-6 text-micro font-medium uppercase text-text-muted">
                  Вопросы по данным
                </p>
                <a
                  href={`mailto:${STUDIO_CONTACTS.email}`}
                  className={`mt-1 inline-flex min-h-11 items-center text-small ${LINK}`}
                >
                  {STUDIO_CONTACTS.email}
                </a>
              </div>
            </aside>

            <article
              aria-labelledby="privacy-title"
              className="flex max-w-measure flex-col gap-block lg:col-span-7 lg:col-start-5"
            >
              <Section id="operator" index="01" title="Кто оператор">
                <p>
                  Оператор данных — студия VESPERA: Москва, Столярный переулок, 3, вход со двора.
                </p>

                <div
                  data-theme="paper"
                  className="rounded-card border border-line bg-bg px-5 py-5 text-text sm:px-6"
                >
                  <p className="text-micro font-medium uppercase text-text-muted">Связаться</p>
                  <dl className="mt-4 grid gap-x-6 gap-y-3 text-small sm:grid-cols-[7rem_1fr]">
                    <dt className="text-text-muted">Адрес</dt>
                    <dd>
                      {STUDIO_CONTACTS.address}, {STUDIO_CONTACTS.addressNote}
                    </dd>

                    <dt className="text-text-muted">Телефон</dt>
                    <dd>
                      <a href={`tel:${STUDIO_CONTACTS.phoneHref}`} className={`tabular-nums ${LINK}`}>
                        {STUDIO_CONTACTS.phone}
                      </a>
                    </dd>

                    <dt className="text-text-muted">Почта</dt>
                    <dd>
                      <a href={`mailto:${STUDIO_CONTACTS.email}`} className={LINK}>
                        {STUDIO_CONTACTS.email}
                      </a>
                    </dd>
                  </dl>
                </div>
              </Section>

              <Section id="data" index="02" title="Какие данные вы оставляете">
                <p>
                  Когда вы записываетесь, мы получаем имя и телефон, а также комментарий к записи,
                  если вы его оставили. Почту можно не указывать — она нужна только для
                  подтверждения.
                </p>
                <p>
                  Вместе с заявкой приходит то, что вы выбрали: услуга, мастер, дата и время.
                </p>
                <p>
                  IP-адрес нужен только для защиты формы от спама. В самой записи он не
                  сохраняется.
                </p>
              </Section>

              <Section id="purpose" index="03" title="Зачем собираем">
                <p>
                  Чтобы оформить запись и подтвердить её: позвонить или написать вам, предупредить,
                  если время изменится.
                </p>
                <p>Комментарий читает мастер, к которому вы записались.</p>
                <p>
                  Рекламных рассылок мы не делаем. Если когда-нибудь решим отправлять, спросим
                  отдельное согласие.
                </p>
              </Section>

              <Section id="basis" index="04" title="Правовое основание">
                <p>
                  Основание — ваше согласие: в форме записи есть галочка, без неё заявка не
                  отправится.
                </p>
                <p>
                  Второе основание — исполнение договора на услугу. Без имени и телефона нельзя
                  записать вас и подтвердить визит.
                </p>
                <p>
                  Согласие можно отозвать в любой момент. После отзыва мы удалим данные;
                  незавершённая запись в этом случае может быть отменена.
                </p>
              </Section>

              <Section id="storage" index="05" title="Где храним и сколько">
                <p>
                  Данные хранятся на защищённых серверах нашего хостинг-провайдера и в базе данных
                  студии. Доступ к ним ограничен сотрудниками студии.
                </p>
                <p>
                  Срок хранения — 12 месяцев после визита. Дольше мы данные не держим: после этого
                  срока запись удаляется или обезличивается.
                </p>
              </Section>

              <Section id="sharing" index="06" title="Кому передаём">
                <p>Третьим лицам мы данные не продаём и не передаём.</p>
                <p>Исключение — случаи, предусмотренные законом.</p>
              </Section>

              <Section id="cookies" index="07" title="Файлы в браузере">
                <p>
                  Сайт использует только технические файлы, которые нужны для его работы. Без них
                  часть страниц не откроется.
                </p>
                <p>Аналитики и рекламных трекеров на сайте нет.</p>
              </Section>

              <Section id="rights" index="08" title="Ваши права">
                <p>Вы можете попросить:</p>
                <ul className="list-disc space-y-1.5 pl-5 marker:text-text-muted">
                  <li>узнать, какие данные о вас у нас есть;</li>
                  <li>исправить неточное;</li>
                  <li>удалить запись;</li>
                  <li>отозвать согласие.</li>
                </ul>
                <p>
                  Напишите на{" "}
                  <a href={`mailto:${STUDIO_CONTACTS.email}`} className={LINK}>
                    {STUDIO_CONTACTS.email}
                  </a>{" "}
                  или позвоните{" "}
                  <a href={`tel:${STUDIO_CONTACTS.phoneHref}`} className={`tabular-nums ${LINK}`}>
                    {STUDIO_CONTACTS.phone}
                  </a>
                  . Ответим в течение 30 дней.
                </p>
                <p>
                  Если запись уже прошла и обязательств перед вами не осталось, удалим данные.
                </p>
              </Section>

              <Section id="security" index="09" title="Как защищаем данные">
                <p>Доступ к данным ограничен и защищён: сотрудники видят только нужное для работы.</p>
              </Section>

              <Section id="changes" index="10" title="Изменения политики">
                <p>
                  Мы можем обновить этот текст: например, если изменится состав данных или способ
                  их хранения.
                </p>
                <p>
                  Новая редакция появляется на этой странице вместе с новой датой. Дата последней
                  редакции — {REVISED_AT}.
                </p>
              </Section>

              <p className="border-t border-line pt-6 text-small text-text-muted">
                Вернуться на{" "}
                <Link href="/" className={LINK}>
                  главную
                </Link>{" "}
                или{" "}
                <Link href="/#booking" className={LINK}>
                  записаться
                </Link>
                .
              </p>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
