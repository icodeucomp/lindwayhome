"use client";

import * as React from "react";

import { usePathname } from "next/navigation";

import { useCartDrawer, useCartStore, useToggleState, useWishlistStore } from "@/hooks";

import { AnimatePresence, motion } from "framer-motion";

import { Img, Container, LocaleLink } from "@/components";

import { aboutNav, audienceNav, brandingNav, customerCareNav, clothingNav } from "@/static/navigation";

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
  label: string;
  href?: string;
  menu?: MenuKey;
  /** Path prefixes that light this item up. Defaults to `href`. */
  match?: string[];
}

const navEntries: NavEntry[] = [
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Collections", menu: "collections", match: ["/collections", "/shop", "/best-sellers"] },
  { label: "Our World", href: "/our-world" },
  { label: "Journal", href: "/journal" },
  { label: "Customer Care", menu: "customerCare", match: ["/customer-care"] },
  { label: "About", menu: "about", match: ["/about"] },
];

const Counter = ({ value }: { value: number }) => <span className="text-primary">({value})</span>;

export const Header = () => {
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

  const menuColumns: Record<MenuKey, { title: string; items: { name: string; href: string }[] }[]> = {
    collections: [
      { title: "Branding", items: brandingNav },
      { title: "Audience", items: audienceNav },
      { title: "Clothing", items: clothingNav },
    ],
    customerCare: [{ title: "Customer Care", items: customerCareNav }],
    about: [{ title: "About", items: aboutNav }],
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-light border-border" onMouseLeave={() => setOpenMenu(null)}>
      {/* Row 1 — logo */}
      <Container className="flex justify-center pt-4">
        <LocaleLink href="/" aria-label="Lindway home">
          <Img src="/icons/dark-logo.png" alt="Lindway" className="h-12 w-28" cover />
        </LocaleLink>
      </Container>

      {/* Row 2 — language, tagline, bag */}
      <Container className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center flex-1">
          <LanguageSwitch />
        </div>

        <p className="hidden text-sm text-center font-heading uppercase tracking-[0.14em] text-primary lg:block">House of Artisanal Fashion</p>

        <div className="flex items-center justify-end flex-1 gap-5">
          <LocaleLink href="/wishlist" className="flex items-center gap-2 text-sm text-body font-heading" aria-label="Wishlist">
            <PiHeartStraight className="size-5" />
            <span className="hidden sm:inline">
              Wishlist <Counter value={wishlist.count()} />
            </span>
          </LocaleLink>

          <button type="button" onClick={openCart} className="flex items-center gap-2 text-sm text-body font-heading" aria-label="Open bag">
            <PiHandbagSimple className="size-5" />
            <span className="hidden sm:inline">
              Bag <Counter value={getCartItemByProduct()} />
            </span>
          </button>

          <button type="button" onClick={toggleMobile} className="md:hidden text-body" aria-label="Toggle menu" aria-expanded={openMobile}>
            {openMobile ? <PiX className="size-6" /> : <PiList className="size-6" />}
          </button>
        </div>
      </Container>

      {/* Row 3 — primary nav */}
      <Container className="justify-center hidden md:flex pt-4">
        <menu className="flex items-end gap-6 list-none lg:gap-9">
          {navEntries.map((entry) => {
            const active = isActive(entry);
            const className = `flex items-center gap-1 border-b-2 pb-3 pt-1 text-sm font-heading uppercase tracking-[0.06em] transition-colors ${
              active ? "border-primary text-primary" : "border-transparent text-body hover:text-primary"
            }`;

            return (
              <li key={entry.label} className="-mb-px" onMouseEnter={() => setOpenMenu(entry.menu ?? null)}>
                {entry.href ? (
                  <LocaleLink href={entry.href} className={className}>
                    {entry.label}
                  </LocaleLink>
                ) : (
                  <button type="button" className={className} aria-expanded={openMenu === entry.menu}>
                    {entry.label}
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
                    { name: "New Arrivals", href: "/new-arrivals" },
                    { name: "Best Sellers", href: "/best-sellers" },
                    ...brandingNav,
                    ...clothingNav,
                    ...audienceNav,
                    { name: "Our World", href: "/our-world" },
                    { name: "Journal", href: "/journal" },
                    ...customerCareNav,
                    ...aboutNav,
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
