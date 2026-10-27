import { useEffect, useLayoutEffect, useState } from 'react'
import { formatMs, topScores, type Score } from './components/breakout-board'
import { topRunnerScores, type RunnerScore } from './components/runner-board'
import { leaderboardMessages, type LeaderboardMessages } from './i18n/leaderboard'
import { htmlLang, otherLocale } from './i18n/locale'
import { useLocale } from './i18n/use-locale'

const LINK = 'underline decoration-[#9a9890] underline-offset-4 transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand'

export default function Leaderboard() {
  const [locale, setLocale] = useLocale()
  const t = leaderboardMessages[locale]
  const [runner, setRunner] = useState<RunnerScore[] | null>()
  const [breakout, setBreakout] = useState<Score[] | null>()
  const [revision, setRevision] = useState(0)
  const loading = runner === undefined || breakout === undefined

  useEffect(() => {
    let active = true
    void topRunnerScores().then((scores) => { if (active) setRunner(scores) })
    void topScores().then((scores) => { if (active) setBreakout(scores) })
    return () => { active = false }
  }, [revision])

  useLayoutEffect(() => {
    document.documentElement.lang = htmlLang(locale)
    document.documentElement.style.backgroundColor = '#f4f2ee'
    document.documentElement.style.colorScheme = 'light'
    document.title = `${t.title} — Infrastructure Hackathon`
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.description)
    return () => {
      document.documentElement.style.backgroundColor = ''
      document.documentElement.style.colorScheme = ''
    }
  }, [locale, t])

  return (
    <main className="min-h-svh bg-[#f4f2ee] px-4 py-6 font-mono text-[#181818] antialiased md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <nav aria-label={t.title} className="flex flex-wrap items-center justify-between gap-4 text-base leading-7 text-[#5a5956]">
          <a href="/" className={LINK}>{t.back}</a>
          <button type="button" onClick={() => setLocale(otherLocale(locale))} className={LINK}>
            {t.seeOther}
          </button>
        </nav>

        <header className="border-b border-[#d6d4d0] pt-16 pb-10 md:pt-24 md:pb-12">
          <p className="text-sm tracking-wide text-brand uppercase">Hack Infra Futuro · Top 10</p>
          <h1 className="mt-4 font-pixel text-[clamp(40px,8vw,88px)] leading-[1.05]">{t.title}</h1>
          <p className="mt-6 text-xl leading-8 md:text-2xl">{t.intro}</p>
          <p className="mt-2 text-base leading-7 text-[#5a5956]">{t.best}</p>
        </header>

        <div className="grid md:grid-cols-2">
          <Board
            game="runner"
            title="Runner"
            rows={runner == null ? runner : runner.map((row) => ({
              ...row,
              value: String(row.score).padStart(5, '0'),
              rank: runner.findIndex((other) => other.score === row.score) + 1,
            }))}
            labels={t}
          />
          <Board
            game="breakout"
            title="Breakout"
            rows={breakout == null ? breakout : breakout.map((row) => ({
              ...row,
              value: formatMs(row.ms),
              rank: breakout.findIndex((other) => other.ms === row.ms) + 1,
            }))}
            labels={t}
          />
        </div>

        <footer className="border-t border-[#d6d4d0] py-6 text-base text-[#5a5956]">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setRunner(undefined)
              setBreakout(undefined)
              setRevision((value) => value + 1)
            }}
            className={`${LINK} disabled:cursor-wait disabled:no-underline disabled:opacity-60`}
          >
            {loading ? t.refreshing : t.refresh}
          </button>
        </footer>
      </div>
    </main>
  )
}

type BoardRow = { _id: string; name: string; value: string; rank: number }

function Board({ game, title, rows, labels }: {
  game: 'runner' | 'breakout'
  title: string
  rows: BoardRow[] | null | undefined
  labels: LeaderboardMessages
}) {
  const t = labels[game]
  const pending = rows === undefined

  return (
    <section
      id={game}
      aria-labelledby={`${game}-title`}
      aria-busy={pending}
      className="min-w-0 border-b border-[#d6d4d0] py-8 last:border-b-0 md:border-r md:border-b-0 md:py-10 md:pr-10 md:last:border-r-0 md:last:pr-0 md:last:pl-10"
    >
      <h2 id={`${game}-title`} className="font-pixel text-[32px] leading-[1.1] md:text-[48px]">{title}</h2>
      <p className="mt-3 min-h-14 text-base leading-7 text-[#5a5956]">{t.rule}</p>

      {rows && rows.length > 0 ? (
        <table className="mt-6 w-full table-fixed text-left text-sm sm:text-base">
          <caption className="sr-only">{title} · Top 10</caption>
          <thead className="text-sm text-[#5a5956]">
            <tr className="border-b border-[#d6d4d0]">
              <th scope="col" className="w-14 pb-3 font-normal">{labels.rank}</th>
              <th scope="col" className="pb-3 font-normal">{labels.player}</th>
              <th scope="col" className="w-20 pb-3 text-right font-normal">{t.metric}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className={`border-b border-[#d6d4d0] last:border-b-0 ${row.rank === 1 ? 'text-brand' : ''}`}>
                <td className="py-4 align-top tabular-nums">{String(row.rank).padStart(2, '0')}</td>
                <th scope="row" className="py-4 pr-3 font-normal">
                  <a href={`https://github.com/${encodeURIComponent(row.name)}`} className={`${LINK} wrap-anywhere`}>{row.name}</a>
                </th>
                <td className="py-4 text-right align-top whitespace-nowrap tabular-nums">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p role="status" className="mt-6 border-y border-[#d6d4d0] py-10 text-base leading-7 text-[#5a5956]">
          {pending ? labels.loading : rows === null ? labels.unavailable : labels.empty}
        </p>
      )}

      <a href={`/?game=${game}`} className="mt-8 inline-block bg-brand px-5 py-3 text-base text-[#f4f2ee] transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
        {t.play}
      </a>
    </section>
  )
}
