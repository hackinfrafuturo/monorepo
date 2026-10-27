import { type ReactNode, useLayoutEffect } from 'react'
import { AsciiField } from './v2/AsciiField'
import { AsciiStage } from './v2/AsciiStage'
import { Highlight } from './v2/Highlight'
import { ImageGalaxyField } from './v2/image-galaxy/ImageGalaxyField'
import { PicaroFigure } from './v2/PicaroFigure'
import { type Metal } from './v2/metals'
import { messages } from './i18n/messages'
import { META } from './i18n/meta'
import { htmlLang, otherLocale } from './i18n/locale'
import { useLocale } from './i18n/use-locale'
import { VENUE_MAP } from './venue'

const MAIL = 'mailto:benjamin@velum-labs.com'
const LINKEDIN = 'https://www.linkedin.com/in/benjamzc/'

const INK = 'font-mono text-[#d6d4d0] antialiased'
const MUTED = 'text-[#9a9890]'
const INVERT =
  'no-underline transition-[background-color,color] duration-75 ease-linear hover:bg-[#d6d4d0] hover:text-[#181818] focus-visible:bg-[#d6d4d0] focus-visible:text-[#181818] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6d4aff]'
const SPONSOR_BTN =
  'inline-block bg-[#d6d4d0] px-2 py-1 font-mono text-base leading-[18px] text-[#181818] no-underline transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:bg-[#eceae6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6d4aff] active:scale-[0.97]'

const ORG_LOGOS = [
  { logo: '/brand/orgs/velum.webp', width: 512, height: 512 },
  { logo: '/brand/orgs/indies.webp', width: 140, height: 140 },
  { logo: '/brand/orgs/ae.webp', width: 512, height: 512 },
] as const

const TIER_METALS: Metal[] = ['bronze', 'silver', 'gold']

function Section({
  id,
  title,
  children,
  flushTop = false,
}: {
  id: string
  title: string
  children: ReactNode
  flushTop?: boolean
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={
        flushTop
          ? 'pt-12 md:pt-16'
          : 'mt-20 border-t border-[#2a2a2a] pt-12 first:mt-0 first:border-t-0 first:pt-0 md:mt-28 md:pt-16'
      }
    >
      <h2
        id={`${id}-title`}
        className="font-pixel mb-8 text-[32px] leading-[1.1] text-[#d6d4d0] md:mb-10 md:text-[48px]"
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function App() {
  const [locale, setLocale] = useLocale()
  const t = messages[locale]
  const next = otherLocale(locale)

  useLayoutEffect(() => {
    document.documentElement.lang = htmlLang(locale)
    document.title = META[locale].title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', META[locale].description)
  }, [locale])

  return (
    <div className={`min-h-svh bg-[#181818] ${INK}`}>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-5 focus:left-4 focus:z-[80] focus:bg-[#d6d4d0] focus:px-2 focus:text-base focus:leading-[18px] focus:text-[#181818]"
        href="#contenido"
      >
        {t.skip}
      </a>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center gap-2 px-4 pt-5">
        <a className={`pointer-events-auto ${SPONSOR_BTN}`} href={MAIL}>
          {t.sponsorCta}
        </a>
        <button
          type="button"
          className={`pointer-events-auto ${SPONSOR_BTN}`}
          onClick={() => setLocale(next)}
        >
          {t.seeOther}
        </button>
      </header>

      <div id="top">
        <AsciiStage
          title={
            <>
              Infrastructure
              <span className="mt-1 block">Hackathon</span>
            </>
          }
          subtitle={t.subtitle}
          place={t.place}
          venue={
            <a
              href={VENUE_MAP}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto inline-block max-w-[calc(100vw-2rem)] font-mono text-base leading-6 text-[#d6d4d0] underline decoration-[#9a9890] underline-offset-4 transition-colors hover:text-white focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d4aff]"
            >
              {t.venueName}. {t.venueAddress}
            </a>
          }
        />
      </div>

      <main
        id="contenido"
        className="relative z-20 mx-auto w-full max-w-[1060px] px-5 pt-20 pb-28 sm:px-8 md:px-10 md:pt-28 md:pb-36"
      >
        <Section id="por-que" title={t.whyTitle}>
          <div className="max-w-[40rem] space-y-6 font-mono text-base leading-7 text-[#d6d4d0] md:leading-8">
            <p>
              <Highlight>{t.whyHighlight}</Highlight> {t.whyRest}
            </p>
            <p className={MUTED}>{t.whyBody}</p>
          </div>
        </Section>

        <section
          aria-label={t.statsLabel}
          className="mt-16 grid grid-cols-2 gap-x-6 gap-y-10 md:mt-24 md:grid-cols-4 md:gap-x-10"
        >
          {t.stats.map(({ value, label }) => (
            <div key={label}>
              <p className="font-pixel text-[32px] leading-none text-[#d6d4d0] md:text-[48px]">
                {value}
              </p>
              <p className={`mt-3 font-mono text-base leading-[18px] ${MUTED}`}>
                {label}
              </p>
            </div>
          ))}
        </section>

        <section
          id="organizadores"
          aria-labelledby="organizadores-title"
          className="relative left-1/2 mt-20 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden border-y border-[#2a2a2a] md:mt-28"
        >
          <ImageGalaxyField />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] bg-[#181818]/70"
          />
          <div className="relative z-10 mx-auto max-w-[1060px] px-5 py-12 sm:px-8 md:px-10 md:py-16">
            <h2
              id="organizadores-title"
              className="font-pixel mb-8 text-[32px] leading-[1.1] text-[#d6d4d0] md:mb-10 md:text-[48px]"
            >
              {t.orgsTitle}
            </h2>
            <ul className="grid gap-10 md:grid-cols-3 md:gap-12">
              {t.orgs.map((org, i) => (
                <li key={org.title}>
                  <img
                    src={ORG_LOGOS[i].logo}
                    alt=""
                    width={ORG_LOGOS[i].width}
                    height={ORG_LOGOS[i].height}
                    decoding="async"
                    loading="lazy"
                    className="mb-5 size-16 rounded-lg object-contain md:size-20"
                  />
                  <p className="font-pixel text-base leading-[18px] text-[#d6d4d0]">
                    {org.title}
                  </p>
                  <p
                    className={`mt-3 max-w-[28rem] font-mono text-base leading-7 ${MUTED}`}
                  >
                    {org.copy}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Section id="tracks" title={t.tracksTitle} flushTop>
          <div className="grid gap-10 md:grid-cols-2 md:items-stretch md:gap-12">
            <div className="min-h-[28rem] md:min-h-[36rem]">
              <AsciiField
                src="/brand/track-infra-6153725.mp4"
                poster="/brand/track-infra-6153725.jpg"
                invert
                className="h-full"
              />
            </div>
            <div className="grid content-center gap-16">
              {t.trackGroups.map((group) => (
                <div key={group.title}>
                  <p
                    className={`font-mono text-sm uppercase tracking-[0.12em] ${MUTED}`}
                  >
                    {group.title}
                  </p>
                  <ol className="mt-8 grid gap-12">
                    {group.tracks.map(({ n, title, copy }) => (
                      <li
                        key={title}
                        className="grid grid-cols-[4rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-3 md:gap-x-10"
                      >
                        <span
                          className={`font-mono text-base leading-none md:text-lg ${MUTED}`}
                        >
                          {n}
                        </span>
                        <p className="font-pixel text-[24px] leading-[1.1] text-[#d6d4d0] md:text-[32px]">
                          {title}
                        </p>
                        <p
                          className={`col-start-2 max-w-[36rem] font-mono text-base leading-7 ${MUTED}`}
                        >
                          {copy}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section id="sponsors" title={t.sponsorsTitle}>
          <p className="max-w-[40rem] font-mono text-base leading-7 text-[#d6d4d0] md:leading-8">
            {t.sponsorsLead}{' '}
            <Highlight>{t.sponsorsHighlight}</Highlight>
          </p>
          <ul className="mt-12 grid gap-10 md:grid-cols-2 md:gap-x-12 md:gap-y-12">
            {t.sponsors.map(({ title, copy }) => (
              <li key={title}>
                <p className="font-pixel text-base leading-[18px] text-[#d6d4d0]">
                  {title}
                </p>
                <p
                  className={`mt-3 max-w-[28rem] font-mono text-base leading-7 ${MUTED}`}
                >
                  {copy}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="pedimos" title={t.asksTitle}>
          <ol className="grid gap-10 md:gap-12">
            {t.asks.map(({ n, title, copy }) => (
              <li
                key={title}
                className="grid gap-3 md:grid-cols-[4rem_minmax(0,36rem)] md:gap-10"
              >
                <span className={`font-mono text-base leading-[18px] ${MUTED}`}>
                  {n}
                </span>
                <div>
                  <p className="font-pixel text-base leading-[18px] text-[#d6d4d0]">
                    {title}
                  </p>
                  <p
                    className={`mt-3 max-w-[40rem] font-mono text-base leading-7 ${MUTED}`}
                  >
                    {copy}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="niveles" title={t.tiersTitle}>
          <ul className="grid gap-10 md:grid-cols-3 md:gap-12">
            {t.tiers.map((tier, i) => (
              <li key={tier.title}>
                <PicaroFigure metal={TIER_METALS[i]} label={tier.label} />
                <p className="font-pixel mt-6 text-[32px] leading-[1.1] text-[#d6d4d0] md:text-[48px]">
                  {tier.title}
                </p>
                <p
                  className={`mt-3 max-w-[24rem] font-mono text-base leading-7 ${MUTED}`}
                >
                  {tier.copy}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="escribir" title={t.writeTitle}>
          <p className="mb-6 max-w-[40rem] font-mono text-base leading-7 text-[#d6d4d0] md:leading-8">
            {t.writeLead}{' '}
            <Highlight>{t.writeHighlight}</Highlight>
          </p>
          <p className="max-w-[40rem] font-mono text-base leading-7">
            <a className={INVERT} href={MAIL}>
              benjamin@velum-labs.com
            </a>
          </p>
          <p className={`mt-5 font-mono text-base leading-7 ${MUTED}`}>
            <a className={INVERT} href={LINKEDIN} target="_blank" rel="noreferrer">
              {t.linkedin}
            </a>
          </p>
        </Section>

        <p className="mt-20 border-t border-[#2a2a2a] pt-12 font-mono text-base leading-7 md:mt-28 md:pt-16">
          <button
            type="button"
            className={`border-0 bg-transparent p-0 ${INVERT}`}
            onClick={() => setLocale(next)}
          >
            {t.seeOther}
          </button>
        </p>
      </main>
    </div>
  )
}
