export type Locale = "en" | "es";

export function localeFromSearch(search: string): Locale | null {
  const lang = new URLSearchParams(search).get("lang");
  return lang === "es" || lang === "en" ? lang : null;
}

export function htmlLang(locale: Locale): string {
  return locale === "es" ? "es-CL" : "en";
}
