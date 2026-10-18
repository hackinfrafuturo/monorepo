import { createFileRoute } from '@tanstack/react-router'
import { getPublicStats } from '../stats/server'

export const Route = createFileRoute('/stats')({
  loader: () => getPublicStats(),
  head: () => ({
    meta: [
      { title: 'Applicant stats — Infrastructure Hackathon' },
      {
        name: 'description',
        content: 'Application totals and participating teams.',
      },
    ],
  }),
  component: StatsPage,
})

function StatsPage() {
  const stats = Route.useLoaderData()

  return (
    <main className="min-h-svh bg-[#181818] px-5 py-8 font-mono text-[#d6d4d0] antialiased sm:px-8 md:px-12 md:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <a
          href="/"
          className="text-base text-[#9a9890] underline decoration-[#6d6b65] underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6d4aff]"
        >
          ← Infrastructure Hackathon
        </a>

        <header className="mt-14 border-b border-[#2a2a2a] pb-8 md:mt-20 md:pb-10">
          <p className="font-mono text-base uppercase tracking-[0.16em] text-[#9a9890]">
            Applicant stats
          </p>
          <h1 className="mt-3 font-pixel text-4xl leading-[1.05] text-[#d6d4d0] sm:text-6xl">
            The submissions
          </h1>
        </header>

        {stats ? (
          <>
            <section
              aria-label="Application totals"
              className="grid grid-cols-2 gap-5 border-b border-[#2a2a2a] py-8 md:gap-10 md:py-10"
            >
              <Stat label="Applicants" value={stats.applicants} />
              <Stat label="Submissions" value={stats.submissions} />
            </section>

            <section className="py-8 md:py-10" aria-labelledby="groups-title">
              <div className="mb-6 flex items-baseline justify-between gap-4">
                <h2 id="groups-title" className="font-pixel text-2xl md:text-3xl">
                  Groups
                </h2>
                <span className="text-sm text-[#9a9890]">
                  {stats.groups.length} submissions
                </span>
              </div>

              {stats.groups.length > 0 ? (
                <ol className="grid gap-3 sm:grid-cols-2">
                  {stats.groups.map((group) => (
                    <li
                      key={group.submission}
                      className="border border-[#343434] bg-[#1d1d1d] p-5 md:p-6"
                    >
                      <h3 className="text-sm uppercase tracking-[0.12em] text-[#9a9890]">
                        Submission {String(group.submission).padStart(2, '0')}
                      </h3>
                      <ul className="mt-4 space-y-2">
                        {group.members.map((name, index) => (
                          <li
                            key={`${group.submission}-${index}`}
                            className="text-base leading-6 text-[#d6d4d0]"
                          >
                            {name}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="border border-[#343434] p-5 text-[#9a9890]">
                  No submissions yet.
                </p>
              )}
            </section>
          </>
        ) : (
          <p role="status" className="mt-10 border border-[#343434] p-5 text-[#9a9890]">
            Stats are temporarily unavailable. Please refresh in a moment.
          </p>
        )}

      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-pixel text-5xl leading-none text-[#d6d4d0] md:text-7xl">
        {value}
      </p>
      <p className="mt-3 text-sm uppercase tracking-[0.12em] text-[#9a9890]">
        {label}
      </p>
    </div>
  )
}
