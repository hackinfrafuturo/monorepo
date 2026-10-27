// Unpublished while the challenge is refined: to put it back at /challenge, restore src/routes/challenge.tsx
// from git history and the link to it on the home page.
import { useLayoutEffect } from 'react'
import { Accordion } from '@base-ui/react/accordion'
import { challengeMessages } from './i18n/challenge'
import { CHALLENGE_META } from './i18n/meta'
import { HOME, htmlLang, otherLocale } from './i18n/locale'
import { useLocale } from './i18n/use-locale'
import { uiSound } from './ui-sound'

const RULE = 'border-[#d6d4d0]'

const MAIL = 'benjamin@velum-labs.com'

const TEXT_LINK =
  'text-[#181818] underline decoration-[#9a9890] underline-offset-4 transition-[background-color,color] duration-75 ease-linear hover:bg-[#181818] hover:text-[#f4f2ee] focus-visible:bg-[#181818] focus-visible:text-[#f4f2ee] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand'

/** Same columns as the home page, so the two read as one site. */
const SECTION_GRID =
  'grid gap-8 md:grid-cols-[minmax(16rem,24rem)_minmax(0,34.5rem)] md:justify-center md:gap-x-12'

const SECTION =
  'border-t border-[#d6d4d0] px-4 py-12 md:px-6 md:py-16'

const SECTION_TITLE =
  'font-pixel text-[32px] leading-[1.1] text-balance text-[#181818] md:text-[48px]'

const MUTED = 'font-mono text-base leading-7 text-[#5a5956] md:text-lg md:leading-8'

const BODY = 'font-mono text-lg leading-8 text-[#181818] md:text-xl md:leading-9'

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className={`size-6 shrink-0 md:size-8 ${className ?? ''}`}
    >
      <path d="M6 18L18 6M8 6h10v10" />
    </svg>
  )
}

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={SECTION}>
      <div className={SECTION_GRID}>
        <h2 id={`${id}-title`} className={SECTION_TITLE}>
          {title}
        </h2>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  )
}

export default function Challenge() {
  const [locale, setLocale] = useLocale()
  const t = challengeMessages[locale]
  const usd = new Intl.NumberFormat(htmlLang(locale), {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  })
  const total = t.prizes.reduce((sum, { amount }) => sum + amount, 0)

  useLayoutEffect(() => {
    document.documentElement.lang = htmlLang(locale)
    document.documentElement.style.backgroundColor = '#f4f2ee'
    document.documentElement.style.colorScheme = 'light'
    document.title = CHALLENGE_META[locale].title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', CHALLENGE_META[locale].description)

    return () => {
      document.documentElement.style.backgroundColor = ''
      document.documentElement.style.colorScheme = ''
    }
  }, [locale])

  return (
    <div className="min-h-svh bg-[#f4f2ee] font-mono text-[#181818] antialiased">
      <header
        className={`flex items-center justify-between gap-6 border-b px-4 py-5 md:px-6 md:py-6 ${RULE}`}
      >
        <a href={HOME} className={`${MUTED} ${TEXT_LINK} text-[#5a5956]`} {...uiSound}>
          ← {t.back}
        </a>
        <a
          href="https://velum-labs.com"
          className="flex items-center gap-3 outline-none transition-opacity duration-75 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <span className="hidden font-mono text-base text-[#5a5956] sm:inline">
            {t.sponsoredBy}
          </span>
          <img
            src="/brand/orgs/velum.webp"
            alt=""
            width={512}
            height={512}
            className="size-8 object-contain"
          />
          <span className="font-mono text-base text-[#181818]">Velum Labs</span>
        </a>
      </header>

      <section aria-labelledby="challenge-title" className="px-4 pt-12 pb-12 md:px-6 md:pt-20 md:pb-16">
        <div className="mx-auto max-w-[71rem]">
          <p className="inline-block bg-[#181818] px-2 font-mono text-sm leading-7 text-[#f4f2ee]">
            {t.draft}
          </p>
          <p className={`mt-8 ${MUTED}`}>{t.eyebrow}</p>
          <h1
            id="challenge-title"
            className="mt-3 font-pixel text-[clamp(44px,11vw,104px)] leading-[1.02] text-balance"
          >
            {t.title}
          </h1>
          <p className={`mt-8 max-w-[44rem] ${BODY}`}>{t.lead}</p>

          <dl className={`mt-12 grid grid-cols-2 border-t md:grid-cols-4 ${RULE}`}>
            {t.facts.map(({ value, label }, i) => (
              <div
                key={label}
                className={`border-b py-5 md:border-b-0 md:py-6 ${i % 2 ? 'pl-4 md:pl-6' : ''} ${i > 0 ? `md:border-l md:pl-6 ${i % 2 ? 'border-l' : ''}` : ''} ${RULE}`}
              >
                <dd className="font-pixel text-[32px] leading-none md:text-[44px]">
                  {value}
                </dd>
                <dt className="mt-2 font-mono text-base text-[#5a5956]">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className={`grid grid-cols-1 border-t sm:grid-cols-2 ${RULE}`}>
        <a
          href={`mailto:${MAIL}?subject=${encodeURIComponent(t.eyebrow)}`}
          {...uiSound}
          className="group flex items-center justify-between gap-6 bg-brand px-4 py-4 text-[#f4f2ee] outline-none transition-colors duration-75 hover:bg-brand-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#181818] md:px-6 md:py-5"
        >
          <span>
            <span className="block font-mono text-lg leading-7 md:text-xl lg:text-2xl lg:leading-8">
              {t.notify}
            </span>
            <span className="mt-1 block font-mono text-base leading-[18px] text-[#ece6fb]">
              {t.notifyLabel}
            </span>
          </span>
          <Arrow />
        </a>
        <a
          href="#levels"
          {...uiSound}
          className={`group flex items-center justify-between gap-6 border-t px-4 py-4 outline-none transition-colors duration-75 hover:bg-[#e8e5df] focus-visible:bg-[#e8e5df] sm:border-t-0 sm:border-l md:px-6 md:py-5 ${RULE}`}
        >
          <span>
            <span className="block font-mono text-lg leading-7 md:text-xl lg:text-2xl lg:leading-8">
              {t.rules}
            </span>
            <span className="mt-1 block font-mono text-base leading-[18px] text-[#5a5956]">
              {t.rulesLabel}
            </span>
          </span>
          <Arrow className="rotate-90" />
        </a>
      </div>

      <section id="levels" aria-labelledby="levels-title" className={SECTION}>
        <div className="mx-auto max-w-[71rem]">
          <h2 id="levels-title" className={SECTION_TITLE}>
            {t.levelsTitle}
          </h2>
          <p className={`mt-4 max-w-[40rem] ${MUTED}`}>{t.levelsLead}</p>
          <ol className={`mt-10 grid border-t md:grid-cols-3 ${RULE}`}>
            {t.levels.map((level, i) => (
              <li
                key={level.name}
                className={`group flex flex-col gap-6 border-b px-4 py-8 transition-colors duration-150 hover:bg-brand md:border-b-0 md:px-6 ${i > 0 ? 'md:border-l' : ''} ${RULE}`}
              >
                <div>
                  <p className="font-mono text-base text-[#5a5956] group-hover:text-[#ece6fb]">
                    {t.levelWord} {i + 1}
                  </p>
                  <h3 className="mt-2 font-pixel text-[28px] leading-[1.1] group-hover:text-[#f4f2ee] md:text-[32px]">
                    {level.name}
                  </h3>
                </div>
                <p className="font-mono text-base leading-7 group-hover:text-[#f4f2ee] md:text-lg md:leading-8">
                  {level.task}
                </p>
                <dl className="mt-auto grid gap-3 font-mono text-base leading-6">
                  {(
                    [
                      ['baseline', level.baseline],
                      ['who', level.who],
                      ['gpu', level.gpu],
                      ['problems', level.problems.join(' · ')],
                    ] as const
                  ).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-[#5a5956] group-hover:text-[#ece6fb]">
                        {t.levelLabels[key]}
                      </dt>
                      <dd className="group-hover:text-[#f4f2ee]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Section id="how" title={t.howTitle}>
        <ol>
          {t.how.map(({ title, copy }, i) => (
            <li
              key={title}
              className={`grid grid-cols-[2.5rem_minmax(0,1fr)] border-t py-5 first:border-t-0 first:pt-0 ${RULE}`}
            >
              <span className={MUTED}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className={BODY}>{title}</p>
                <p className={MUTED}>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
        <pre
          aria-hidden
          className="mt-8 overflow-x-auto bg-[#181818] p-5 font-mono text-sm leading-6 text-[#d6d4d0]"
        >
          {`$ curl -fsSL https://hackinfrafuturo.cl/gpu/install.sh | sh
$ velum login
✓ logged in as @your-github
$ velum init level1/rmsnorm
$ velum submit level1/rmsnorm/submission.py
✓ correct on 200 hidden inputs
✓ 3.42× faster than the reference   #12 on Level 1`}
        </pre>
      </Section>

      <Section id="judging" title={t.judgingTitle}>
        <ul>
          {t.judging.map(({ title, copy }) => (
            <li
              key={title}
              className={`border-t py-5 first:border-t-0 first:pt-0 ${RULE}`}
            >
              <p className={BODY}>{title}</p>
              <p className={MUTED}>{copy}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="prizes" title={t.prizesTitle}>
        <p className={BODY}>{t.prizesLead}</p>
        <table className="mt-8 w-full border-collapse font-mono text-base leading-7 md:text-lg md:leading-8">
          <tbody>
            {t.prizes.map(({ place, amount }) => (
              <tr key={place} className={`border-t ${RULE}`}>
                <th scope="row" className="py-3 pr-4 text-left font-normal text-[#5a5956]">
                  {place}
                </th>
                <td className="py-3 text-right tabular-nums">{usd.format(amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#181818]">
              <th scope="row" className="py-3 pr-4 text-left font-normal">
                {t.prizesTotal}
              </th>
              <td className="py-3 text-right tabular-nums">{usd.format(total)}</td>
            </tr>
          </tfoot>
        </table>
        <p className={`mt-10 ${MUTED}`}>{t.prizesExtraTitle}</p>
        <ul className="mt-2">
          {t.prizesExtra.map((line) => (
            <li key={line} className={`border-t py-3 ${BODY} ${RULE}`}>
              {line}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="dates" title={t.timelineTitle}>
        <ol>
          {t.timeline.map(({ date, title, copy }) => (
            <li
              key={date}
              className={`grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 border-t py-5 first:border-t-0 first:pt-0 md:grid-cols-[8rem_minmax(0,1fr)] ${RULE}`}
            >
              <span className="font-pixel text-xl leading-8 md:text-2xl">{date}</span>
              <div>
                <p className={BODY}>{title}</p>
                <p className={MUTED}>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="leaderboard" title={t.boardTitle}>
        <table className="w-full border-collapse font-mono text-base leading-7 md:text-lg md:leading-8">
          <thead>
            <tr className="text-left text-[#5a5956]">
              <th scope="col" className="w-12 pb-3 font-normal">{t.boardColumns.rank}</th>
              <th scope="col" className="pb-3 font-normal">{t.boardColumns.who}</th>
              <th scope="col" className="pb-3 text-right font-normal">{t.boardColumns.speedup}</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((n) => (
              <tr key={n} className={`border-t text-[#9a9890] ${RULE}`}>
                <td className="py-3">{n}</td>
                <td className="py-3">—</td>
                <td className="py-3 text-right">—</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={`mt-6 ${MUTED}`}>{t.boardEmpty}</p>
      </Section>

      <Section id="faq" title={t.faqTitle}>
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
                <p className={`px-2 pb-5 ${MUTED}`}>{a}</p>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
        <p className={`mt-8 ${MUTED}`}>
          {t.faqMore}{' '}
          <a className={`whitespace-nowrap ${TEXT_LINK}`} href={`mailto:${MAIL}`}>
            {MAIL}
          </a>
        </p>
      </Section>

      <footer className="px-4 pt-2 pb-10 md:px-6">
        <button
          type="button"
          className="border-0 bg-transparent p-0 font-mono text-base leading-7 text-[#5a5956] transition-[background-color,color] duration-75 ease-linear hover:bg-[#e8e5df] hover:text-[#181818] focus-visible:bg-[#e8e5df] focus-visible:text-[#181818] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          onClick={() => setLocale(otherLocale(locale))}
        >
          {t.seeOther}
        </button>
      </footer>
    </div>
  )
}
