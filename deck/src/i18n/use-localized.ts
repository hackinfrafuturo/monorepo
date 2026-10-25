import { useMemo } from "react";
import { es } from "./es";
import { useDeckLocale } from "./locale-context";

const SKIP = new Set(["id", "src", "type", "key", "width", "height"]);

function localize<T>(value: T, dict: Record<string, string>): T {
  if (typeof value === "string") return (dict[value] ?? value) as T;
  if (Array.isArray(value)) return value.map((item) => localize(item, dict)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = SKIP.has(key) ? child : localize(child, dict);
    }
    return out as T;
  }
  return value;
}

export function useLocalized<T>(source: T): T {
  const { locale } = useDeckLocale();
  return useMemo(
    () => (locale === "es" ? localize(source, es) : source),
    [locale, source],
  );
}

export function useCopy(english: string): string {
  const { locale } = useDeckLocale();
  return locale === "es" ? (es[english] ?? english) : english;
}
