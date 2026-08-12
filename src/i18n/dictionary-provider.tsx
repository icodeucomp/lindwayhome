"use client";

import * as React from "react";

import type { Locale } from "./config";
import type { Dictionary } from "./get-dictionary";

/**
 * Carries the dictionary to client components (F-30).
 *
 * Server components should call `getDictionary` directly — they can, and doing so keeps
 * the strings out of the browser bundle entirely. This provider exists for the 28 public
 * components that are `"use client"`: the header, the cart drawer, every listing, the
 * contact form. None of them can await anything, and several sit three or four levels
 * below the page, so threading a `dict` prop down to each would mean every new component
 * has to be re-wired by hand — the failure mode being a component that silently keeps
 * its English copy because someone forgot.
 *
 * The cost is honest and bounded: the whole dictionary travels in the RSC payload. Split
 * it per namespace if it ever grows enough to matter.
 *
 * The provider is mounted once, in the `[lang]` layout. There is deliberately no default
 * value — a component reading the dictionary outside the provider is a bug in the tree,
 * not something to paper over with English.
 */

interface DictionaryContextValue {
  dictionary: Dictionary;
  locale: Locale;
}

const DictionaryContext = React.createContext<DictionaryContextValue | null>(null);

export const DictionaryProvider = ({ dictionary, locale, children }: DictionaryContextValue & { children: React.ReactNode }) => {
  // The pair is stable for the life of a locale, so memoising keeps every consumer from
  // re-rendering whenever the layout re-renders for an unrelated reason.
  const value = React.useMemo(() => ({ dictionary, locale }), [dictionary, locale]);

  return <DictionaryContext.Provider value={value}>{children}</DictionaryContext.Provider>;
};

const useDictionaryContext = (): DictionaryContextValue => {
  const context = React.useContext(DictionaryContext);
  if (!context) throw new Error("useDictionary must be used inside <DictionaryProvider>. Mount it in the [lang] layout.");
  return context;
};

/** The whole dictionary. `const t = useDictionary();` then `t.nav.journal`. */
export const useDictionary = (): Dictionary => useDictionaryContext().dictionary;

/** The active locale, from the provider rather than re-parsed out of the pathname. */
export const useDictionaryLocale = (): Locale => useDictionaryContext().locale;
