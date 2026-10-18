import { useEffect, useState } from 'react'
import { negotiateLocale, persistLocale, type Locale } from './locale'

/** Cookie first, then the browser language. Switching writes the cookie and stays on this URL. */
export function useLocale(): [Locale, (next: Locale) => void] {
  const [locale, set] = useState<Locale>('en')

  useEffect(() => {
    set(
      negotiateLocale(
        document.cookie,
        navigator.languages?.join(',') || navigator.language,
      ),
    )
  }, [])
  return [
    locale,
    (next) => {
      persistLocale(next)
      set(next)
    },
  ]
}
