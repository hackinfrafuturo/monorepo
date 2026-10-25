import { useLayoutEffect } from 'react'
import { Accordion } from '@base-ui/react/accordion'
import { Marquee } from './components/Marquee'
import { uiSound } from './ui-sound'
import { AsciiField } from './v2/AsciiField'
import { homeMessages, type OrgId, type SponsorId, type SponsorMessages } from './i18n/messages'
import { HOME_META } from './i18n/meta'
import { SPONSOR, htmlLang, otherLocale } from './i18n/locale'
import { useLocale } from './i18n/use-locale'
import { applyHref } from './apply/ref'

/** Mixkit 40938, silhouette of hands. Free to use. Center-cropped square. */
const HAND = {
  src: '/brand/hand.mp4',
  poster: '/brand/hand.jpg',
} as const

const ORGS = [
  { id: 'velum', name: 'Velum Labs (YC P26)', logo: '/brand/orgs/velum.webp', size: 512 },
  { id: 'indies', name: 'indies.cl', logo: '/brand/orgs/indies.webp', size: 140 },
  { id: 'ae', name: 'Alianza Emprende', logo: '/brand/orgs/ae.webp', size: 512 },
] as const satisfies readonly { id: OrgId; name: string; logo: string; size: number }[]

const SPONSOR_SECTIONS = [
  { id: 'elevenlabs', name: 'ElevenLabs', logo: '/brand/elevenlabs.svg', width: 694, height: 90, frame: 'max-h-6 md:max-h-8' },
  { id: 'firecrawl', name: 'Firecrawl', logo: '/brand/firecrawl.svg', width: 172, height: 40, frame: 'max-h-6 md:max-h-8' },
  { id: 'markip', name: 'Markip', logo: '/brand/markip.svg', width: 1311, height: 397, frame: 'max-h-6 md:max-h-8' },
  { id: 'wispr-flow', name: 'Wispr Flow', logo: '/brand/wispr-flow.svg', width: 807, height: 131, frame: 'max-h-[18px] md:max-h-6' },
] as const satisfies readonly {
  id: SponsorId
  name: string
  logo: string
  width: number
  height: number
  frame: string
}[]

const SPONSOR_LOGOS = [
  ...SPONSOR_SECTIONS.map((sponsor) => ({ ...sponsor, href: `#${sponsor.id}` })),
  {
    id: 'cenia',
    name: 'Centro Nacional de Inteligencia Artificial',
    logo: '/brand/cenia.webp',
    width: 606,
    height: 184,
    href: 'https://cenia.cl',
    frame: 'max-h-8 md:max-h-10',
  },
  { id: 'flyra', name: 'Flyra', logo: '/brand/flyra.png', width: 128, height: 128, href: 'https://flyra.io', frame: 'max-h-6 md:max-h-8' },
  { id: 'payku', name: 'Payku', logo: '/brand/payku.png', width: 640, height: 216, href: 'https://payku.com', frame: 'max-h-6 md:max-h-8' },
] as const

const RULE = 'border-[#d6d4d0]'

const PRIZE_POOL_USD = 12_000

const MAIL = 'benjamin@velum-labs.com'

const TEXT_LINK =
  'text-[#181818] underline decoration-[#9a9890] underline-offset-4 transition-[background-color,color] duration-75 ease-linear hover:bg-[#181818] hover:text-[#f4f2ee] focus-visible:bg-[#181818] focus-visible:text-[#f4f2ee] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand'

/** Shared by the sections under the hero so their columns line up. */
const COLUMNS =
  'md:grid-cols-[minmax(16rem,24rem)_minmax(0,34.5rem)] md:justify-center md:gap-x-12'

const SECTION_GRID = `grid gap-8 ${COLUMNS}`

const SECTION_TITLE =
  'font-pixel text-[32px] leading-[1.1] text-balance text-[#181818] md:text-[48px]'

const DOOR_THEME = {
  light: {
    box: 'hover:bg-[#e8e5df] focus-visible:bg-[#e8e5df]',
    action: 'text-[#181818]',
    label: 'text-[#5a5956]',
    arrow: 'text-[#181818]',
  },
  brand: {
    box: 'bg-brand hover:bg-brand-hover focus-visible:bg-brand-hover',
    action: 'text-[#f4f2ee]',
    label: 'text-[#ece6fb] group-hover:text-[#f4f2ee] group-focus-visible:text-[#f4f2ee]',
    arrow: 'text-[#f4f2ee]',
  },
} as const

function SponsorSection({
  sponsor,
  content,
}: {
  sponsor: (typeof SPONSOR_SECTIONS)[number]
  content: SponsorMessages
}) {
  const titleId = `${sponsor.id}-title`

  return (
    <section
      id={sponsor.id}
      aria-labelledby={titleId}
      className={`border-t pt-10 first:border-t-0 first:pt-0 md:pt-12 md:first:pt-0 ${RULE}`}
    >
      <div className={SECTION_GRID}>
        <div>
          <h2 id={titleId}>
            <img
              src={sponsor.logo}
              alt={sponsor.name}
              width={sponsor.width}
              height={sponsor.height}
              decoding="async"
              loading="lazy"
              className="h-auto w-60 max-w-full"
            />
          </h2>
          <p className="mt-6 font-mono text-base leading-7 text-[#5a5956]">
            {content.description}
          </p>
          <p className="mt-3 font-mono text-base leading-7 text-[#181818]">
            {content.useCase}
          </p>
        </div>
        {content.benefits.status === 'confirmed' ? (
          <ul>
            {content.benefits.offers.map(({ audience, benefit, details }) => (
              <li
                key={audience}
                className={`border-t py-6 first:border-t-0 first:pt-0 last:pb-0 ${RULE}`}
              >
                <h3 className="font-mono text-base leading-7 text-[#5a5956] md:text-lg md:leading-8">
                  {audience}
                </h3>
                <p className="mt-2 font-mono text-lg leading-8 text-[#181818] md:text-xl md:leading-9">
                  {benefit}
                </p>
                <p className="mt-1 font-mono text-sm leading-6 text-[#5a5956]">
                  {details}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-mono text-base leading-7 text-[#5a5956] md:text-lg md:leading-8">
            {content.benefits.message}
          </p>
        )}
      </div>
    </section>
  )
}

function Door({
  href,
  action,
  label,
  theme = 'light',
  className,
}: {
  href: string
  action: string
  label: string
  theme?: keyof typeof DOOR_THEME
  className?: string
}) {
  const c = DOOR_THEME[theme]

  return (
    <a
      href={href}
      {...uiSound}
      className={`group flex h-full min-h-0 flex-col justify-between no-underline outline-none transition-colors duration-75 ease-linear focus-visible:outline-2 focus-visible:outline-[#181818] focus-visible:-outline-offset-2 ${c.box} ${className ?? ''}`}
    >
      <div>
        <span
          className={`block font-mono text-lg leading-7 transition-colors duration-75 ease-linear md:text-xl lg:text-2xl lg:leading-8 ${c.action}`}
        >
          {action}
        </span>
        <span
          aria-hidden
          className={`mt-1 block font-mono text-base leading-[18px] transition-colors duration-75 ease-linear ${c.label}`}
        >
          {label}
        </span>
      </div>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        className={`size-6 self-end transition-colors duration-75 ease-linear md:size-8 ${c.arrow}`}
      >
        <path d="M6 18L18 6M8 6h10v10" />
      </svg>
    </a>
  )
}

export default function Home() {
  const [locale, setLocale] = useLocale()
  const t = homeMessages[locale]
  const next = otherLocale(locale)
  const prizePoolAmount = new Intl.NumberFormat(htmlLang(locale), {
    maximumFractionDigits: 0,
  }).format(PRIZE_POOL_USD)
  const applicationUrl = applyHref(
    typeof window === 'undefined' ? '' : window.location.search,
  )

  useLayoutEffect(() => {
    document.documentElement.lang = htmlLang(locale)
    document.documentElement.style.backgroundColor = '#f4f2ee'
    document.documentElement.style.colorScheme = 'light'
    document.title = HOME_META[locale].title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', HOME_META[locale].description)

    return () => {
      document.documentElement.style.backgroundColor = ''
      document.documentElement.style.colorScheme = ''
    }
  }, [locale])

  return (
    <div className="min-h-svh bg-[#f4f2ee] font-mono text-[#181818] antialiased">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-5 focus:left-4 focus:z-[80] focus:bg-[#181818] focus:px-2 focus:text-base focus:leading-[18px] focus:text-[#f4f2ee]"
        href="#contenido"
      >
        {t.skip}
      </a>

      <section
        id="top"
        aria-labelledby="hero-title"
        className={`grid min-h-svh grid-cols-1 grid-rows-[1fr_auto_auto] border-b md:grid-cols-[minmax(0,1.22fr)_minmax(16.5rem,0.78fr)] md:grid-rows-2 ${RULE}`}
      >
        <div className="flex min-w-0 flex-col gap-8 px-4 py-6 md:col-start-1 md:row-span-2 md:row-start-1 md:px-6 md:py-10">
          <p className="shrink-0 font-mono text-base leading-7 text-[#5a5956] md:text-lg md:leading-8">
            {t.heroDate}
          </p>
          <div className="flex flex-1 flex-col items-start justify-center py-6 md:py-10">
            <h1
              id="hero-title"
              className="w-full text-left font-sans text-4xl font-medium leading-[1.1] text-balance text-black uppercase sm:text-6xl md:text-7xl"
            >
              {t.heroTitle}
            </h1>
            <p className="mt-4 font-mono text-base leading-7 text-[#5a5956] md:text-lg md:leading-8">
              {t.heroPrizeDescription(prizePoolAmount)}
            </p>
          </div>
          {/* 7 logos: 3 columns, then 4 from md. The last one spans the small-screen row so it stays centered. */}
          <ul className="grid shrink-0 grid-cols-3 items-center justify-items-center gap-x-8 gap-y-4 md:grid-cols-4">
            {SPONSOR_LOGOS.map(({ id, name, logo, width, height, href, frame }, index) => (
              <li
                key={id}
                className={`flex min-w-0 max-w-full justify-center ${
                  index === SPONSOR_LOGOS.length - 1 ? 'col-span-3 md:col-span-1' : ''
                }`}
              >
                <a
                  href={href}
                  className="block outline-none transition-opacity duration-75 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                >
                  <img
                    src={logo}
                    alt={name}
                    width={width}
                    height={height}
                    decoding="async"
                    className={`h-auto w-auto max-w-full object-contain ${frame}`}
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <Door
          href={applicationUrl}
          action={t.register}
          label={t.participants}
          theme="brand"
          className={`border-t px-4 pt-6 pb-3 md:col-start-2 md:row-start-1 md:border-t-0 md:border-b md:border-l md:px-6 md:pt-10 md:pb-3 ${RULE}`}
        />
        <Door
          href={SPONSOR}
          action={t.sponsor}
          label={t.companies}
          className={`border-t px-4 pt-6 pb-4 md:col-start-2 md:row-start-2 md:border-t-0 md:border-l md:px-6 md:pt-6 md:pb-4 ${RULE}`}
        />
      </section>

      <aside
        aria-label={t.register}
        className={`sticky top-0 z-40 border-b ${RULE}`}
      >
        <a
          href={applicationUrl}
          {...uiSound}
          className="group block bg-[#f4f2ee] py-3 text-[#181818] no-underline outline-none transition-colors duration-75 ease-linear hover:bg-brand hover:text-[#f4f2ee] focus-visible:bg-brand focus-visible:text-[#f4f2ee] focus-visible:outline-2 focus-visible:outline-[#181818] focus-visible:-outline-offset-2 md:py-3.5"
        >
          <Marquee pauseOnHover className="[--duration:4s] [--gap:3rem]">
            <span className="font-mono text-base uppercase tracking-wider md:text-lg">
              {t.register}
            </span>
            <span
              aria-hidden
              className="font-mono text-base text-[#5a5956] transition-colors duration-75 ease-linear group-hover:text-[#ece6fb] group-focus-visible:text-[#ece6fb] md:text-lg"
            >
              {'->'}
            </span>
          </Marquee>
        </a>
      </aside>

      <section
        id="contenido"
        className="flex min-h-svh items-center px-4 py-12 md:px-6 md:py-16"
      >
        <div className={`grid w-full items-start gap-8 md:items-stretch ${COLUMNS}`}>
          <figure
            className={`aspect-square w-full border bg-brand [--ascii-bg:var(--color-brand)] ${RULE}`}
          >
            <AsciiField
              src={HAND.src}
              poster={HAND.poster}
              invert
              floor={0}
              preload="metadata"
              className="size-full"
            />
            <figcaption className="sr-only">{t.handLabel}</figcaption>
          </figure>
          <div className="flex max-w-[46ch] flex-col gap-10 font-mono text-lg leading-8 text-[#181818] md:h-full md:justify-between md:gap-12 md:py-1 md:text-xl md:leading-9">
            <div className="space-y-4">
              <p>{t.stuckLead}</p>
              <p>{t.stuckBody}</p>
            </div>
            <p className="tabular-nums">{t.facts}</p>
          </div>
        </div>
      </section>

      <section
        id="prize-pool"
        aria-labelledby="prize-pool-title"
        aria-describedby="prize-pool-estimate"
        className={`border-t bg-brand px-4 py-12 text-[#f4f2ee] md:px-6 md:py-20 ${RULE}`}
      >
        <div className={SECTION_GRID}>
          <h2 id="prize-pool-title" className="font-pixel text-balance md:col-span-2">
            <span className="block text-[32px] leading-[1.1] md:text-[48px]">
              {t.prizePoolTitle}
            </span>
            <span className="mt-8 block text-[clamp(2rem,12vw,9rem)] leading-none tracking-[-0.04em] whitespace-nowrap tabular-nums">
              <span aria-hidden="true">{'$ '}</span>
              <span className="sr-only">USD </span>
              {prizePoolAmount}
            </span>
          </h2>
          <p id="prize-pool-estimate" className="font-mono text-sm leading-6 md:col-span-2">
            {t.prizePoolEstimate}
          </p>
        </div>
      </section>

      <div
        id="sponsors"
        className={`space-y-12 border-t px-4 py-12 md:space-y-16 md:px-6 md:py-16 ${RULE}`}
      >
        {SPONSOR_SECTIONS.map((sponsor) => (
          <SponsorSection
            key={sponsor.id}
            sponsor={sponsor}
            content={t.sponsors[sponsor.id]}
          />
        ))}
      </div>

      <section
        id="behind"
        aria-labelledby="behind-title"
        className={`border-t px-4 py-12 md:px-6 md:py-16 ${RULE}`}
      >
        <div className={SECTION_GRID}>
          <h2 id="behind-title" className={SECTION_TITLE}>
            {t.behindTitle}
          </h2>
          <ul>
            {ORGS.map(({ id, name, logo, size }) => (
              <li
                key={id}
                className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-1 border-t py-6 first:border-t-0 first:pt-0 md:gap-x-6 ${RULE}`}
              >
                <img
                  src={logo}
                  alt=""
                  width={size}
                  height={size}
                  decoding="async"
                  loading="lazy"
                  className="row-span-2 size-12 object-contain md:size-14"
                />
                <h3 className="font-mono text-lg leading-8 text-[#181818] md:text-xl md:leading-9">
                  {name}
                </h3>
                <p className="font-mono text-base leading-7 text-[#5a5956] md:text-lg md:leading-8">
                  {t.orgs[id]}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="faq"
        aria-labelledby="faq-title"
        className={`border-t px-4 py-12 md:px-6 md:py-16 ${RULE}`}
      >
        <div className={SECTION_GRID}>
          <h2 id="faq-title" className={SECTION_TITLE}>
            {t.faqTitle}
          </h2>
          <div>
            <Accordion.Root>
              {t.faq.map(({ q, a }) => (
                <Accordion.Item key={q} className={`border-t last:border-b ${RULE}`}>
                  <Accordion.Header className="m-0 font-normal">
                    <Accordion.Trigger className="group flex w-full cursor-pointer items-start justify-between gap-6 border-0 bg-transparent px-2 py-4 text-left font-mono text-lg leading-8 text-[#181818] outline-none transition-colors duration-75 ease-linear hover:bg-[#e8e5df] focus-visible:bg-[#e8e5df] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand md:text-xl md:leading-8">
                      {q}
                      <svg
                        aria-hidden
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="square"
                        className="mt-0.5 size-6 shrink-0"
                      >
                        <path d="M5 12h14" />
                        <path
                          d="M12 5v14"
                          className="transition-opacity duration-75 ease-linear group-data-panel-open:opacity-0"
                        />
                      </svg>
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Panel className="h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-150 ease-linear data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
                    <p className="px-2 pb-5 font-mono text-base leading-7 text-[#5a5956] md:text-lg md:leading-8">
                      {a}
                    </p>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion.Root>

            <p className="mt-8 font-mono text-base leading-7 text-[#5a5956] md:text-lg md:leading-8">
              {t.faqMore}{' '}
              <a className={`whitespace-nowrap ${TEXT_LINK}`} href={`mailto:${MAIL}`}>
                {MAIL}
              </a>
            </p>
            <p className="mt-2 font-mono text-base leading-7 md:text-lg md:leading-8">
              <a className={TEXT_LINK} href={SPONSOR} {...uiSound}>
                {t.faqSponsor}
              </a>
            </p>
          </div>
        </div>
      </section>

      <footer className="px-4 pt-2 pb-10 md:px-6">
        <button
          type="button"
          className="border-0 bg-transparent p-0 font-mono text-base leading-7 text-[#5a5956] transition-[background-color,color] duration-75 ease-linear hover:bg-[#e8e5df] hover:text-[#181818] focus-visible:bg-[#e8e5df] focus-visible:text-[#181818] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          onClick={() => setLocale(next)}
        >
          {t.seeOther}
        </button>
      </footer>
    </div>
  )
}
