/**
 * Every email we send, on one page. Kept free of imports so the backoffice can show exactly what will
 * be sent before anyone confirms a decision.
 *
 * DRAFT wording in BODY: review it with the team before turning decision emails on (DECISION_EMAILS=send).
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

const GROUND = '#181818'
const INK = '#d6d4d0'
const MUTED = '#9a9890'
const LINE = '#2a2a2a'
const PURPLE = '#6d4aff'
const FONT = "'iA Writer Quattro',ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace"
const SITE = 'https://hackinfrafuturo.cl'

/** public/email, which goes live with the site: publish a new image before an email uses it */
const image = (file: string, alt: string, width: number, height: number, altSize = 15) =>
  `<img src="${SITE}/email/${file}" alt="${alt}" width="${width}" height="${height}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;color:${INK};font-family:${FONT};font-size:${altSize}px">`

const link = (url: string, label: string) =>
  `<a href="${url}" style="color:${INK};text-decoration:underline;text-decoration-color:${PURPLE}">${label}</a>`

/** web addresses in already-escaped text become links */
const linked = (html: string) => html.replace(/https?:\/\/[^\s<]+/g, (url) => link(url, url))

const paragraph = (html: string) => `<p style="margin:0 0 16px;white-space:pre-wrap">${html}</p>`

/** the same page around every email: tables and inline styles, because that is what mail apps keep */
function page(body: string, preview = '') {
  const table = 'role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"'
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>Hack Infra Futuro</title></head><body style="margin:0;padding:0;background:${GROUND}">${preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${GROUND}">${escapeHtml(preview)}</div>` : ''}<table ${table} bgcolor="${GROUND}" style="background:${GROUND}"><tr><td align="center" style="padding:40px 24px"><table ${table} style="max-width:548px"><tr><td style="padding-bottom:40px"><a href="${SITE}" style="display:block">${image('logo.png', 'Hack Infra Futuro', 240, 61)}</a></td></tr><tr><td style="font-family:${FONT};font-size:15px;line-height:1.7;color:${INK}">${body}</td></tr><tr><td style="padding-top:24px">${image('band.png', '', 548, 8)}</td></tr><tr><td style="padding-top:16px;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED}">Santiago de Chile · <a href="${SITE}" style="color:${MUTED}">hackinfrafuturo.cl</a></td></tr></table></td></tr></table></body></html>`
}

const details = (rows: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px">${rows
    .map(([label, value]) => `<tr><td valign="top" width="88" style="padding:12px 16px 12px 0;border-top:1px solid ${LINE};font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED}">${label}</td><td valign="top" style="padding:12px 0;border-top:1px solid ${LINE};font-family:${FONT};font-size:15px;line-height:1.6;color:${INK}">${value}</td></tr>`)
    .join('')}</table>`

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? ''

const EVENT: [string, string][] = [
  ['Cuándo', '5 y 6 de diciembre de 2026 (nos quedamos toda la noche del 5 al 6)'],
  ['Dónde', 'Universidad del Desarrollo, Av. Plaza 680, Las Condes'],
]

/** the email everyone gets right after applying; it confirms the application, never a place */
export function confirmationEmail(name: string) {
  const first = firstName(name)
  const greeting = first ? `Hola ${first},` : 'Hola,'
  const received = '¡Recibimos tu postulación! Nos alegra mucho que quieras ser parte de Hack Infra Futuro.'
  const review = 'Un equipo de humanos revisará las postulaciones una por una. Tu cupo aún no está confirmado; te avisaremos por este mismo correo cuando tengamos una respuesta.'
  const meanwhile = 'Mientras tanto, te dejamos los datos del evento:'
  const questions = 'Si tienes alguna duda, responde este correo y te ayudamos.'
  const postscript = 'PD: escondimos unos mini-juegos en nuestro landing page y habrá premios para los top 1 de cada juego (bots allowed too)!'
  const signoff = 'Un abrazo,\nEl equipo de Hack Infra Futuro'
  return {
    subject: 'Recibimos tu postulación a Hack Infra Futuro',
    text: [greeting, received, review, meanwhile, EVENT.map(([label, value]) => `${label}: ${value}`).join('\n'), questions, postscript, signoff].join('\n\n'),
    html: page(
      `<div style="padding-bottom:32px">${image('headline-recibimos.png', 'Recibimos tu postulación', 351, 137, 28)}</div>${paragraph(escapeHtml(greeting))}${paragraph(received)}${paragraph(review)}${paragraph(meanwhile)}${details(EVENT)}${paragraph(questions)}${paragraph(postscript.replace('landing page', link(SITE, 'landing page')))}${paragraph(signoff)}`,
      review,
    ),
  }
}

export function decisionEmail(decision: Decision, name: string) {
  const { subject, paragraphs } = BODY[decision]
  const greeting = `hi ${name},`
  return {
    subject,
    text: [greeting, ...paragraphs].join('\n\n'),
    html: page([greeting, ...paragraphs].map((p) => paragraph(linked(escapeHtml(p)))).join('')),
  }
}

/** in a custom email, {nombre} becomes the person's first name and {enlace} their private correction link */
export const NAME_TAG = '{nombre}'
export const LINK_TAG = '{enlace}'
export const EDIT_LINK_DAYS = 14

export function messageEmail(subject: string, body: string, name: string, link: string) {
  const fill = (text: string) => text.replaceAll(NAME_TAG, firstName(name)).replaceAll(LINK_TAG, link)
  const text = fill(body.trim())
  return { subject: fill(subject.trim()), text, html: page(text.split(/\n{2,}/).map((p) => paragraph(linked(escapeHtml(p)))).join('')) }
}

/** addresses that are never emailed: the seed's test data */
export const isTestAddress = (email: string) => /@example\.(com|org|net)$/i.test(email.trim())
