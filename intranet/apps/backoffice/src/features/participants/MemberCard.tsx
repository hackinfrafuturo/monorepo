import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

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
    member.site && { label: member.site, href: safeUrl(member.site) },
  ].filter((link) => !!link)
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          <h2 className="[overflow-wrap:anywhere]">{member.name}</h2>
        </CardTitle>
        <CardDescription className="[overflow-wrap:anywhere]">
          {member.role}
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant={member.coding === 'yes' ? 'secondary' : 'outline'}>
            {member.coding === 'yes' ? 'Programa' : 'No programa'}
          </Badge>
        </div>
        {links.length > 0 && (
          <ul className="space-y-1 pt-1 text-sm">
            {links.map((link) => (
              <li key={link.label} className="min-w-0">
                {link.href ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex max-w-full items-center gap-1.5 underline underline-offset-4"
                  >
                    <span className="[overflow-wrap:anywhere]">{link.label}</span>
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="[overflow-wrap:anywhere]">{link.label}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {ESSAYS.map(([field, question]) => (
          <div key={field} className="space-y-1.5">
            <Separator className="mb-4" />
            <h3 className="text-sm font-medium text-muted-foreground">{question}</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
              {member[field]}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
