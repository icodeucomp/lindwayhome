"use client";

import * as React from "react";

import Link from "next/link";

import { usePathname } from "next/navigation";

import { useToggleState } from "@/hooks";

import { localeLabels, locales } from "@/i18n/config";

import { localeFromPath, stripLocale } from "@/utils/locale-path";

import { PiCaretDownBold } from "react-icons/pi";

/**
 * EN / ID switch that keeps the reader on the same page (F-30).
 *
 * A dropdown rather than the pair of links it used to be, matching the `EN ˅` control
 * in every mockup. The href is built from the current path, so the switch never drops
 * the reader back to the homepage.
 */
export const LanguageSwitch = ({ className }: { className?: string }) => {
  const pathname = usePathname() ?? "/";
  const active = localeFromPath(pathname);
  const rest = stripLocale(pathname);

  const { ref, state: open, toggleState, setState } = useToggleState();

  const hrefFor = (locale: string) => (rest === "/" ? `/${locale}` : `/${locale}${rest}`);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button type="button" onClick={toggleState} aria-expanded={open} aria-haspopup="listbox" className="flex items-center gap-2 text-sm font-heading text-primary hover:cursor-pointer">
        {localeLabels[active]}
        <PiCaretDownBold className={`size-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul role="listbox" className="absolute left-0 z-50 py-1 mt-2 border list-none shadow-sm top-full min-w-20 border-border bg-light">
          {locales.map((locale) => (
            <li key={locale}>
              <Link
                href={hrefFor(locale)}
                onClick={() => setState(false)}
                aria-selected={locale === active}
                role="option"
                className={`block px-3 py-1.5 text-sm transition-colors hover:bg-muted ${locale === active ? "text-primary" : "text-body"}`}
              >
                {localeLabels[locale]}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
