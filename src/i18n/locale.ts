export type Locale = 'en' | 'es'

export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'locale'

export const HOME = '/'
export const APPLY = '/apply'
export const SPONSOR = '/deck'
export const CHALLENGE = '/challenge'

/** Old locale-prefixed URLs. Send people to the same page and keep the language they asked for. */
const LEGACY: Record<string, { dest: string; locale: Locale }> = {
  '/en': { dest: SPONSOR, locale: 'en' },
  '/es': { dest: SPONSOR, locale: 'es' },
  '/en/home': { dest: HOME, locale: 'en' },
  '/es/home': { dest: HOME, locale: 'es' },
  '/en/apply': { dest: APPLY, locale: 'en' },
  '/es/apply': { dest: APPLY, locale: 'es' },
}

export function legacyPath(pathname: string): { dest: string; locale: Locale } | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  return LEGACY[path] ?? null
}

export function htmlLang(locale: Locale): string {
  return locale === 'es' ? 'es-CL' : 'en'
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'es' : 'en'
}

export function cookieLocale(cookieHeader: string | null | undefined): Locale | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=(en|es)(?:;|$)`),
  )
  return match?.[1] === 'es' || match?.[1] === 'en' ? match[1] : null
}

export function fromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE
  let best: { locale: Locale; q: number } | null = null
  for (const part of header.split(',')) {
    const [rawTag, ...params] = part.trim().split(';')
    const tag = rawTag.trim().toLowerCase()
    const qParam = params.find((item) => item.trim().startsWith('q='))
    const q = qParam ? Number(qParam.split('=')[1]) : 1
    if (!Number.isFinite(q) || q <= 0) continue
    let locale: Locale | null = null
    if (tag === 'es' || tag.startsWith('es-')) locale = 'es'
    else if (tag === 'en' || tag.startsWith('en-')) locale = 'en'
    if (!locale) continue
    if (!best || q > best.q) best = { locale, q }
  }
  return best?.locale ?? DEFAULT_LOCALE
}

export function negotiateLocale(
  cookieHeader: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  return cookieLocale(cookieHeader) ?? fromAcceptLanguage(acceptLanguage)
}

export function persistLocale(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`
}

export function cookieHeader(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`
}
