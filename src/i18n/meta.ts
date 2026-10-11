import { type Locale } from './locale'

export const META: Record<
  Locale,
  { title: string; description: string; ogLocale: string }
> = {
  en: {
    title: 'Infrastructure Hackathon — 7–8 November 2026, Santiago',
    description:
      '24 hours, about 500 people, infrastructure agents can actually use. Santiago, 7–8 Nov 2026.',
    ogLocale: 'en_US',
  },
  es: {
    title: 'Infrastructure Hackathon — 7–8 de noviembre 2026, Santiago',
    description:
      '24 horas, unas 500 personas, infraestructura que un agente pueda usar de verdad. Santiago, 7–8 de noviembre de 2026.',
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
      'An infrastructure hackathon in Santiago, 7–8 Nov 2026. Devtools and agents. Apply solo or in a team of up to 4.',
    ogLocale: 'en_US',
  },
  es: {
    title: 'Infrastructure Hackathon — La hackathon más grande de Chile',
    description:
      'Una hackathon de infraestructura en Santiago, 7 y 8 de noviembre de 2026. Devtools y agentes. Postula solo o en un equipo de hasta 4.',
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
      'Apply solo or in a team of up to 4 for the Infrastructure Hackathon, 7–8 Nov 2026 in Santiago.',
    ogLocale: 'en_US',
  },
  es: {
    title: 'Inscribe tu equipo — Infrastructure Hackathon',
    description:
      'Postula solo o en un equipo de hasta 4 personas a la Infrastructure Hackathon, 7 y 8 de noviembre de 2026 en Santiago.',
    ogLocale: 'es_CL',
  },
}

export const OG_LOCALE_ALTERNATE: Record<Locale, string> = {
  en: 'es_CL',
  es: 'en_US',
}
