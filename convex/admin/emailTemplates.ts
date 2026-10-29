/**
 * The decision emails, in the same voice as the confirmation email (convex/emails.ts). Kept free of
 * imports so the backoffice can show exactly what will be sent before anyone confirms a decision.
 *
 * DRAFT wording: review it with the team before turning decision emails on (DECISION_EMAILS=send).
 */
export type Decision = 'accepted' | 'waitlisted' | 'rejected'

const BODY: Record<Decision, { subject: string; paragraphs: string[] }> = {
  accepted: {
    subject: 'Estás dentro · Infra Futuro 2026',
    paragraphs: [
      'tu postulación a infra futuro 2026 fue aceptada. estás dentro.',
      'en los próximos días te enviaremos cómo confirmar tu asistencia y todos los detalles del evento.',
      'nos vemos el 5 y 6 de diciembre, santiago.',
    ],
  },
  waitlisted: {
    subject: 'Lista de espera · Infra Futuro 2026',
    paragraphs: [
      'gracias por postular a infra futuro 2026. recibimos muchas más postulaciones que cupos, y por ahora tu postulación quedó en lista de espera.',
      'si se libera un cupo te escribiremos a este mismo correo.',
    ],
  },
  rejected: {
    subject: 'Tu postulación · Infra Futuro 2026',
    paragraphs: [
      'gracias por postular a infra futuro 2026. recibimos muchas más postulaciones que cupos, y esta vez no pudimos hacerte un lugar.',
      'nos encantaría verte en lo que viene. sigue construyendo.',
    ],
  },
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) =>
    character === '&' ? '&amp;' : character === '<' ? '&lt;' : character === '>' ? '&gt;' : character === '"' ? '&quot;' : '&#39;',
  )
}

export function decisionEmail(decision: Decision, name: string) {
  const { subject, paragraphs } = BODY[decision]
  const greeting = `hi ${name},`
  return {
    subject,
    text: [greeting, ...paragraphs].join('\n\n'),
    html: `<main style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:Arial,sans-serif;color:#20201e;line-height:1.6"><p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase">infra futuro 2026</p>${[greeting, ...paragraphs].map((p) => `<p>${escapeHtml(p)}</p>`).join('')}</main>`,
  }
}

/** addresses that are never emailed: the seed's test data */
export const isTestAddress = (email: string) => /@example\.(com|org|net)$/i.test(email.trim())
