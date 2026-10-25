import React, { createContext, useContext, useEffect, useState } from "react";
import { htmlLang, localeFromSearch, type Locale } from "./locale";

type DeckLocale = {
  locale: Locale;
  setLocale: (next: Locale) => void;
};

const DeckLocaleContext = createContext<DeckLocale | null>(null);

function readLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return localeFromSearch(window.location.search) ?? "en";
}

export function DeckLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale);

  useEffect(() => {
    const sync = () => setLocaleState(readLocale());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    document.documentElement.lang = htmlLang(locale);
  }, [locale]);

  const setLocale = (next: Locale) => {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(null, "", url);
    setLocaleState(next);
  };

  return (
    <DeckLocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </DeckLocaleContext.Provider>
  );
}

export function useDeckLocale(): DeckLocale {
  const value = useContext(DeckLocaleContext);
  if (!value) {
    throw new Error("useDeckLocale must be used within DeckLocaleProvider");
  }
  return value;
}
