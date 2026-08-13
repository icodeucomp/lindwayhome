"use client";

import * as React from "react";

import { usePathname } from "next/navigation";

import { useCartDrawer, useCartStore, useToggleState, useWishlistStore } from "@/hooks";

import { AnimatePresence, motion } from "framer-motion";

import { Img, Container, LocaleLink } from "@/components";

import { aboutNav, brandNav, customerCareNav, localizeNav, shopByNav, type NavItem } from "@/static/navigation";

import { useDictionary } from "@/i18n/dictionary-provider";

import type { Dictionary } from "@/i18n/get-dictionary";

import { stripLocale } from "@/utils/locale-path";

import { LanguageSwitch } from "./language-switch";

import { PiCaretDownBold, PiHeartStraight, PiHandbagSimple, PiList, PiX } from "react-icons/pi";

/**
 * Storefront header (every mockup in `reference/`).
 *
 * Three stacked rows: centred logo, then the utility row (language · tagline · bag),
 * then the nav. It is always solid `light` — v1's transparent-over-hero variant is
 * gone, because in v2 the hero image starts *below* the header rather than behind it,
 * so `isDark` has no second state left to describe.
 *
 * Rendered once by the public layout, not per page.
 */

const megaMenuVariants = {
  hidden: { opacity: 0, y: -8, transition: { duration: 0.15 } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const drawerVariants = {
  hidden: { opacity: 0, height: 0, transition: { duration: 0.2 } },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.25 } },
};

type MenuKey = "collections" | "customerCare" | "about";

interface NavEntry {
  /** Key into `dictionary.nav`, not the label itself — the label is resolved at render. */
  label: keyof Dictionary["nav"];
  href?: string;
  menu?: MenuKey;
  /** Path prefixes that light this item up. Defaults to `href`. */
  match?: string[];
}

const navEntries: NavEntry[] = [
  { label: "newArrivals", href: "/new-arrivals" },
  { label: "collections", menu: "collections", match: ["/collections", "/shop", "/best-sellers"] },
  { label: "ourWorld", href: "/our-world" },
  { label: "journal", href: "/journal" },
  { label: "customerCare", menu: "customerCare", match: ["/customer-care"] },
  { label: "about", menu: "about", match: ["/about"] },
];

const Counter = ({ value }: { value: number }) => <span className="text-primary">({value})</span>;

export const Header = () => {
  const t = useDictionary();

  const { getCartItemByProduct } = useCartStore();
  const wishlist = useWishlistStore();
  const openCart = useCartDrawer((state) => state.open);

  const pathname = stripLocale(usePathname() ?? "/");

  const { ref: mobileRef, state: openMobile, toggleState: toggleMobile, setState: setOpenMobile } = useToggleState();
  const [openMenu, setOpenMenu] = React.useState<MenuKey | null>(null);

  const isActive = (entry: NavEntry) => {
    const prefixes = entry.match ?? (entry.href ? [entry.href] : []);
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  };

  // Taxonomy labels stay English (D2); only the column titles and the two link groups
  // that have dictionary keys are swapped.
  //
  // Two columns, not three (D16): Brand leads to the editorial pages under
  // /collections, everything under Shop By to a filterable grid under /shop.
  const menuColumns: Record<MenuKey, { title: string; items: NavItem[] }[]> = {
    collections: [
      { title: t.nav.brand, items: brandNav },
      { title: t.nav.shopBy, items: localizeNav(shopByNav, t.nav) },
    ],
    customerCare: [{ title: t.nav.customerCare, items: localizeNav(customerCareNav, t.customerCare) }],
    about: [{ title: t.nav.about, items: localizeNav(aboutNav, { ...t.about, journal: t.nav.journal }) }],
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-light border-border" onMouseLeave={() => setOpenMenu(null)}>
      {/* Row 1 — logo */}
      <Container className="flex justify-center pt-4">
        <LocaleLink href="/" aria-label={t.header.home}>
          <Img src="/icons/dark-logo.png" alt="Lindway" className="h-12 w-28" cover />
        </LocaleLink>
      </Container>

      {/* Row 2 — language, tagline, bag */}
      <Container className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center flex-1">
          <LanguageSwitch />
        </div>

        <p className="hidden text-sm text-center font-heading uppercase tracking-[0.14em] text-primary lg:block">{t.header.tagline}</p>

        <div className="flex items-center justify-end flex-1 gap-5">
          <LocaleLink href="/wishlist" className="flex items-center gap-2 text-sm text-body font-heading hover:cursor-pointer" aria-label={t.nav.wishlist}>
            <PiHeartStraight className="size-5" />
            <span className="hidden sm:inline">
              {t.nav.wishlist} <Counter value={wishlist.count()} />
            </span>
          </LocaleLink>

          <button type="button" onClick={openCart} className="flex items-center gap-2 text-sm text-body font-heading hover:cursor-pointer" aria-label={t.header.openBag}>
            <PiHandbagSimple className="size-5" />
            <span className="hidden sm:inline">
              {t.nav.bag} <Counter value={getCartItemByProduct()} />
            </span>
          </button>

          <button type="button" onClick={toggleMobile} className="md:hidden text-body" aria-label={t.header.toggleMenu} aria-expanded={openMobile}>
            {openMobile ? <PiX className="size-6" /> : <PiList className="size-6" />}
          </button>
        </div>
      </Container>

      {/* Row 3 — primary nav */}
      <Container className="justify-center hidden md:flex pt-4">
        <menu className="flex items-end gap-6 list-none lg:gap-9">
          {navEntries.map((entry) => {
            const active = isActive(entry);
            const className = `flex items-center gap-1 border-b-2 pb-3 pt-1 text-sm font-heading uppercase tracking-[0.06em] transition-colors hover:cursor-pointer ${
              active ? "border-primary text-primary" : "border-transparent text-body hover:text-primary"
            }`;

            return (
              <li key={entry.label} className="-mb-px" onMouseEnter={() => setOpenMenu(entry.menu ?? null)}>
                {entry.href ? (
                  <LocaleLink href={entry.href} className={className}>
                    {t.nav[entry.label]}
                  </LocaleLink>
                ) : (
                  <button type="button" className={className} aria-expanded={openMenu === entry.menu}>
                    {t.nav[entry.label]}
                    <PiCaretDownBold className="size-2.5" />
                  </button>
                )}
              </li>
            );
          })}
        </menu>
      </Container>

      {/* Dropdowns. Collections is the three-column taxonomy mega-menu (D16, D25). */}
      <AnimatePresence>
        {openMenu && (
          <motion.div
            variants={megaMenuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute left-0 z-50 hidden w-full border-t shadow-md top-full bg-light border-border md:block"
          >
            <Container className={`grid gap-10 py-8 text-body ${menuColumns[openMenu].length > 1 ? "grid-cols-3" : "grid-cols-1"}`}>
              {menuColumns[openMenu].map((column) => (
                <div key={column.title} className="space-y-3">
                  <p className="text-xs tracking-[0.2em] uppercase font-heading text-primary">{column.title}</p>
                  <ul className={`list-none gap-2 ${menuColumns[openMenu].length > 1 ? "space-y-2" : "grid grid-cols-3"}`}>
                    {column.items.map((item) => (
                      <li key={item.href}>
                        <LocaleLink href={item.href} className="text-sm transition-colors hover:text-primary" onClick={() => setOpenMenu(null)}>
                          {item.name}
                        </LocaleLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </Container>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <div ref={mobileRef} className="md:hidden">
        <AnimatePresence>
          {openMobile && (
            <motion.div variants={drawerVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden border-t border-border">
              <Container className="py-4">
                <menu className="flex flex-col list-none divide-y divide-border">
                  {[
                    { name: t.nav.newArrivals, href: "/new-arrivals" },
                    ...brandNav,
                    ...localizeNav(shopByNav, t.nav),
                    { name: t.nav.ourWorld, href: "/our-world" },
                    { name: t.nav.journal, href: "/journal" },
                    ...localizeNav(customerCareNav, t.customerCare),
                    ...localizeNav(aboutNav, { ...t.about, journal: t.nav.journal }),
                  ].map((item) => (
                    <li key={`${item.name}-${item.href}`}>
                      <LocaleLink href={item.href} className="block py-3 text-sm transition-colors text-body hover:text-primary" onClick={() => setOpenMobile(false)}>
                        {item.name}
                      </LocaleLink>
                    </li>
                  ))}
                </menu>
              </Container>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
