import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/** what a member card shows: the profile and the three answers, nothing private */
export type Profile = {
  name: string
  role: string
  github: string
  linkedin: string
  site: string
  coding: 'yes' | 'no'
  deep: string
  hardest: string
  favorite: string
}

/** the three questions that say the most about someone, in the form's words */
const ESSAYS = [
  ['deep', '¿Qué cosas fuera de lo común hacías mientras crecías?'],
  ['hardest', '¿Qué es lo más difícil que has logrado?'],
  ['favorite', 'De las cosas que has creado, ¿cuál es tu favorita?'],
] as const

/** only http(s) links leave the backoffice; anything else stays as plain text */
function safeUrl(value: string) {
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

export function MemberCard({ member }: { member: Profile }) {
  const links = [
    member.github && {
      label: `github.com/${member.github}`,
      href: safeUrl(`https://github.com/${encodeURIComponent(member.github)}`),
    },
    member.linkedin && {
      label: `linkedin.com/in/${member.linkedin}`,
      href: safeUrl(`https://www.linkedin.com/in/${encodeURIComponent(member.linkedin)}`),
    },
    member.site && { label: member.site.replace(/^https?:\/\//, ''), href: safeUrl(member.site) },
  ].filter((link) => !!link)
  return (
    <article className="min-w-0 space-y-4 border-t border-foreground pt-3">
      <header className="space-y-1.5">
        <h2 className="font-pixel text-2xl leading-tight [overflow-wrap:anywhere]">{member.name}</h2>
        <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{member.role}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {member.coding === 'no' && <Badge variant="outline">No programa</Badge>}
          {links.map((link) =>
            link.href ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex max-w-full items-center gap-1 underline decoration-input underline-offset-4 transition-colors duration-75 hover:bg-foreground hover:text-background"
              >
                <span className="[overflow-wrap:anywhere]">{link.label}</span>
                <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <span key={link.label} className="[overflow-wrap:anywhere]">
                {link.label}
              </span>
            ),
          )}
        </div>
      </header>
      {ESSAYS.map(([field, question]) => (
        <section key={field} className="space-y-1">
          <h3 className="text-xs text-muted-foreground">{question}</h3>
          <p className="max-w-[65ch] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
            {member[field]}
          </p>
        </section>
      ))}
    </article>
  )
}
