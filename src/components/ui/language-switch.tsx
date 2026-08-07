"use client";

import * as React from "react";

import Link from "next/link";

import { usePathname } from "next/navigation";

import { PiCaretDown, PiCheck } from "react-icons/pi";

import { localeLabels, locales } from "@/i18n/config";

import { localeFromPath, stripLocale } from "@/utils/locale-path";

/**
 * EN / ID switch that keeps the reader on the same page (F-30).
 *
 * A dropdown rather than both codes side by side: with only two languages the pair
 * reads as "EN / ID" and it is never obvious which one you are currently in. Showing
 * the active one and hiding the rest makes the current state the loudest thing.
 */
export const LanguageSwitch = () => {
  const pathname = usePathname() ?? "/";
  const active = localeFromPath(pathname);
  const rest = stripLocale(pathname);

  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const hrefFor = (locale: string) => (rest === "/" ? `/${locale}` : `/${locale}${rest}`);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Change language"
        className="flex items-center gap-1.5 font-heading text-sm tracking-[0.08em] uppercase duration-200 cursor-pointer text-primary hover:text-body"
      >
        {localeLabels[active]}
        <PiCaretDown className={`size-3 duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <ul role="listbox" className="absolute left-0 z-50 py-1 mt-3 border rounded-sm shadow-lg min-w-28 bg-light border-border">
          {locales.map((locale) => (
            <li key={locale}>
              <Link
                href={hrefFor(locale)}
                role="option"
                aria-selected={locale === active}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between gap-3 px-3 py-2 font-heading text-xs tracking-[0.08em] uppercase duration-200 hover:bg-muted ${locale === active ? "text-primary" : "text-body/70"}`}
              >
                {localeLabels[locale]}
                {locale === active && <PiCheck className="size-3.5 text-primary shrink-0" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
