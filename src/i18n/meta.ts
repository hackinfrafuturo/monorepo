import { type Locale } from './locale'

export const META: Record<
  Locale,
  { title: string; description: string; ogLocale: string }
> = {
  en: {
    title: 'Hack Infra Futuro 2026 — 5 y 6 de diciembre, Santiago',
    description:
      'La hackathon más grande de Chile. 24 horas, ~500 personas, infraestructura que un agente pueda usar de verdad. Santiago, 5 y 6 de diciembre de 2026.',
    ogLocale: 'en_US',
  },
  es: {
    title: 'Hack Infra Futuro 2026 — 5 y 6 de diciembre, Santiago',
    description:
      'La hackathon más grande de Chile. 24 horas, ~500 personas, infraestructura que un agente pueda usar de verdad. Santiago, 5 y 6 de diciembre de 2026.',
    ogLocale: 'es_CL',
  },
}

export const HOME_META: Record<
  Locale,
  { title: string; description: string; ogLocale: string }
> = {
  en: {
    title: 'Hack Infra Futuro 2026 — La hackathon más grande de Chile',
    description:
      'Una hackathon de infraestructura en Santiago, 5 y 6 de diciembre de 2026. Devtools y agentes. Postula solo o en un equipo de hasta 4.',
    ogLocale: 'en_US',
  },
  es: {
    title: 'Hack Infra Futuro 2026 — La hackathon más grande de Chile',
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
    title: 'Inscribe tu equipo — Hack Infra Futuro 2026',
    description:
      'Postula solo o en un equipo de hasta 4 personas a Hack Infra Futuro 2026, 5 y 6 de diciembre de 2026 en Santiago.',
    ogLocale: 'en_US',
  },
  es: {
    title: 'Inscribe tu equipo — Hack Infra Futuro 2026',
    description:
      'Postula solo o en un equipo de hasta 4 personas a Hack Infra Futuro 2026, 5 y 6 de diciembre de 2026 en Santiago.',
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
    title: 'Velum Labs GPU Challenge — Hack Infra Futuro 2026',
    description:
      'Agentes más rápidos. Tres semanas online antes de la hackathon, US$10.000 en efectivo y créditos de IA de Velum Labs.',
    ogLocale: 'en_US',
  },
  es: {
    title: 'Velum Labs GPU Challenge — Hack Infra Futuro 2026',
    description:
      'Agentes más rápidos. Tres semanas online antes de la hackathon, US$10.000 en efectivo y créditos de IA de Velum Labs.',
    ogLocale: 'es_CL',
  },
}
