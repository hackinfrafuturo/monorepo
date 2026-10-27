import { type Locale } from './locale'

export const META: Record<
  Locale,
  { title: string; description: string; ogLocale: string }
> = {
  en: {
    title: 'Infrastructure Hackathon - 5-6 December 2026, Santiago',
    description:
      '24 hours, about 500 people, infrastructure agents can actually use. Santiago, 5-6 Dec 2026.',
    ogLocale: 'en_US',
  },
  es: {
    title: 'Infrastructure Hackathon - 5 y 6 de diciembre de 2026, Santiago',
    description:
      '24 horas, unas 500 personas, infraestructura que un agente pueda usar de verdad. Santiago, 5 y 6 de diciembre de 2026.',
    ogLocale: 'es_CL',
  },
}

export const HOME_META: Record<
  Locale,
  { title: string; description: string; ogLocale: string }
> = {
  en: {
    title: 'Infrastructure Hackathon — The biggest hackathon in Chile',
    description:
      'An infrastructure hackathon in Santiago, 5-6 Dec 2026. Devtools and agents. Apply solo or in a team of up to 4.',
    ogLocale: 'en_US',
  },
  es: {
    title: 'Infrastructure Hackathon — La hackathon más grande de Chile',
    description:
      'Una hackathon de infraestructura en Santiago, 5 y 6 de diciembre de 2026. Devtools y agentes. Postula solo o en un equipo de hasta 4.',
    ogLocale: 'es_CL',
  },
}

export const APPLY_META: Record<
  Locale,
  { title: string; description: string; ogLocale: string }
> = {
  en: {
    title: 'Register your team — Infrastructure Hackathon',
    description:
      'Apply solo or in a team of up to 4 for the Infrastructure Hackathon, 5-6 Dec 2026 in Santiago.',
    ogLocale: 'en_US',
  },
  es: {
    title: 'Inscribe tu equipo — Infrastructure Hackathon',
    description:
      'Postula solo o en un equipo de hasta 4 personas a la Infrastructure Hackathon, 5 y 6 de diciembre de 2026 en Santiago.',
    ogLocale: 'es_CL',
  },
}

export const OG_LOCALE_ALTERNATE: Record<Locale, string> = {
  en: 'es_CL',
  es: 'en_US',
}

export const CHALLENGE_META: Record<
  Locale,
  { title: string; description: string; ogLocale: string }
> = {
  en: {
    title: 'Velum Labs GPU Challenge — Infrastructure Hackathon',
    description:
      'Make agents faster. Three weeks online before the hackathon, $10,000 USD in cash and AI credits from Velum Labs.',
    ogLocale: 'en_US',
  },
  es: {
    title: 'Velum Labs GPU Challenge — Infrastructure Hackathon',
    description:
      'Agentes más rápidos. Tres semanas online antes de la hackathon, US$10.000 en efectivo y créditos de IA de Velum Labs.',
    ogLocale: 'es_CL',
  },
}
