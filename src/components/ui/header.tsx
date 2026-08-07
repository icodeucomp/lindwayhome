"use client";

import * as React from "react";

import { usePathname } from "next/navigation";

import { AnimatePresence, motion } from "framer-motion";

import { PiCaretDown, PiHandbagSimple, PiHeartStraight, PiList, PiX } from "react-icons/pi";

import { Container, Img, LocaleLink } from "@/components";

import { useCartStore, useIsHydrated, useScrolled, useWishlistStore } from "@/hooks";

import { aboutNav, audienceNav, brandingNav, customerCareNav, garmentNav, type NavItem } from "@/static/navigation";

import { stripLocale } from "@/utils/locale-path";

import { LanguageSwitch } from "./language-switch";

/** Labels the layout hands down, so the nav speaks the reader's language (F-30). */
export interface HeaderLabels {
  newArrivals: string;
  collections: string;
  ourWorld: string;
  journal: string;
  customerCare: string;
  about: string;
  wishlist: string;
  bag: string;
  branding: string;
  audience: string;
  garment: string;
}

type MenuKey = "collections" | "customerCare" | "about";

const panelVariants = {
  hidden: { opacity: 0, y: -6, transition: { duration: 0.15 } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const drawerVariants = {
  hidden: { opacity: 0, height: 0, transition: { duration: 0.2 } },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.25 } },
};

/* -------------------------------------------------------------------------- */
/*                                 Utilities                                  */
/* -------------------------------------------------------------------------- */

/**
 * Active when the reader is on that page or anywhere beneath it, compared without the
 * locale prefix so `/id/journal/some-post` still lights up Journal.
 */
const useIsActive = () => {
  const path = stripLocale(usePathname() ?? "/");

  return React.useCallback(
    (href: string, children: NavItem[] = []) => {
      const matches = (target: string) => path === target || path.startsWith(`${target}/`);
      return matches(href) || children.some((child) => matches(child.href));
    },
    [path],
  );
};

const NavLink = ({ href, label, isActive, onClick }: { href: string; label: string; isActive: boolean; onClick?: () => void }) => (
  <LocaleLink
    href={href}
    onClick={onClick}
    aria-current={isActive ? "page" : undefined}
    className={`relative block py-4 font-heading text-sm tracking-[0.1em] uppercase duration-200 ${isActive ? "text-primary" : "text-body hover:text-primary"}`}
  >
    {label}
    {/* The underline sits on the header's bottom edge rather than under the text, so
        it reads as a tab marker instead of a text decoration. */}
    {isActive && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
  </LocaleLink>
);

const NavTrigger = ({ label, isActive, isOpen, onOpen }: { label: string; isActive: boolean; isOpen: boolean; onOpen: () => void }) => (
  <button
    type="button"
    onMouseEnter={onOpen}
    onFocus={onOpen}
    aria-expanded={isOpen}
    aria-haspopup="true"
    className={`relative flex items-center gap-1.5 py-4 font-heading text-sm tracking-[0.1em] uppercase duration-200 cursor-pointer ${isActive || isOpen ? "text-primary" : "text-body hover:text-primary"}`}
  >
    {label}
    <PiCaretDown className={`size-3 duration-200 ${isOpen ? "rotate-180" : ""}`} />
    {isActive && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
  </button>
);

const CountLink = ({ href, label, count, icon }: { href: string; label: string; count: number; icon: React.ReactNode }) => (
  <LocaleLink href={href} className="flex items-center gap-2 duration-200 group text-body hover:text-primary">
    <span className="text-primary">{icon}</span>
    <span className="font-heading text-sm tracking-[0.08em] uppercase whitespace-nowrap">
      {label} ({count})
    </span>
  </LocaleLink>
);

/* -------------------------------------------------------------------------- */
/*                                   Header                                   */
/* -------------------------------------------------------------------------- */

export const Header = ({ labels }: { labels: HeaderLabels }) => {
  const { getCartItemByProduct } = useCartStore();
  const wishlist = useWishlistStore();

  const isActive = useIsActive();

  const [openMenu, setOpenMenu] = React.useState<MenuKey | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  // Counts come from localStorage, so the server renders zero and the browser knows
  // better — see useIsHydrated for why this is not an effect.
  const isHydrated = useIsHydrated();

  // Past this point the wordmark shrinks and the header tightens. Held expanded while
  // the mobile drawer is open, since condensing under an open menu just makes the page
  // jump.
  const isCondensed = useScrolled(24) && !isDrawerOpen;

  const bagCount = isHydrated ? getCartItemByProduct() : 0;
  const wishlistCount = isHydrated ? wishlist.count() : 0;

  const closeAll = () => {
    setOpenMenu(null);
    setIsDrawerOpen(false);
  };

  const columns = [
    { title: labels.branding, items: brandingNav },
    { title: labels.audience, items: audienceNav },
    { title: labels.garment, items: garmentNav },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-light border-border" onMouseLeave={() => setOpenMenu(null)}>
      <Container>
        {/* Row 1 — language, wordmark, and the two counters, all on one line. A three-column
            grid rather than flex justify-between, so the wordmark stays optically centred no
            matter how wide the two sides get: with justify-between the middle item drifts
            off-centre the moment the counts go from (0) to (12).

            Scrolling only shrinks the wordmark and tightens the padding. It is the same
            element throughout rather than one per state, so the size animates instead of
            one node unmounting and another appearing in its place. */}
        <div className={`grid items-center grid-cols-[1fr_auto_1fr] gap-4 duration-300 ${isCondensed ? "py-3" : "py-5 lg:py-6"}`}>
          <div className="justify-self-start">
            <LanguageSwitch />
          </div>

          <LocaleLink href="/" aria-label="Lindway home" className="justify-self-center">
            <Img
              src="/icons/dark-logo.png"
              alt="Lindway"
              className={`duration-300 ${isCondensed ? "w-24 h-9 lg:w-28 lg:h-10" : "w-32 h-12 lg:w-40 lg:h-14"}`}
              cover
            />
          </LocaleLink>

          <div className="flex items-center gap-5 lg:gap-7 justify-self-end">
            <span className="hidden sm:block">
              <CountLink href="/wishlist" label={labels.wishlist} count={wishlistCount} icon={<PiHeartStraight className="size-5" />} />
            </span>
            <span className="hidden sm:block">
              <CountLink href="/cart" label={labels.bag} count={bagCount} icon={<PiHandbagSimple className="size-5" />} />
            </span>

            {/* Small screens keep the icons but drop the words, and gain the drawer. */}
            <span className="flex items-center gap-4 sm:hidden">
              <LocaleLink href="/wishlist" aria-label={labels.wishlist} className="relative text-primary">
                <PiHeartStraight className="size-6" />
                {wishlistCount > 0 && <span className="absolute grid rounded-full -top-1.5 -right-2 size-4 place-items-center bg-primary text-light text-xxs">{wishlistCount}</span>}
              </LocaleLink>
              <LocaleLink href="/cart" aria-label={labels.bag} className="relative text-primary">
                <PiHandbagSimple className="size-6" />
                {bagCount > 0 && <span className="absolute grid rounded-full -top-1.5 -right-2 size-4 place-items-center bg-primary text-light text-xxs">{bagCount}</span>}
              </LocaleLink>
            </span>

            <button type="button" onClick={() => setIsDrawerOpen((open) => !open)} aria-label="Menu" aria-expanded={isDrawerOpen} className="cursor-pointer text-body lg:hidden">
              {isDrawerOpen ? <PiX className="size-6" /> : <PiList className="size-6" />}
            </button>
          </div>
        </div>

        {/* Row 2 — the nav itself. */}
        <nav className="justify-center hidden lg:flex">
          <ul className="flex items-center list-none gap-9 xl:gap-12">
            <li>
              <NavLink href="/new-arrivals" label={labels.newArrivals} isActive={isActive("/new-arrivals")} />
            </li>
            <li>
              <NavTrigger
                label={labels.collections}
                isOpen={openMenu === "collections"}
                isActive={isActive("/collections", [...audienceNav, ...garmentNav])}
                onOpen={() => setOpenMenu("collections")}
              />
            </li>
            <li>
              <NavLink href="/our-world" label={labels.ourWorld} isActive={isActive("/our-world")} />
            </li>
            <li>
              <NavLink href="/journal" label={labels.journal} isActive={isActive("/journal")} />
            </li>
            <li>
              <NavTrigger label={labels.customerCare} isOpen={openMenu === "customerCare"} isActive={isActive("/customer-care")} onOpen={() => setOpenMenu("customerCare")} />
            </li>
            <li>
              <NavTrigger label={labels.about} isOpen={openMenu === "about"} isActive={isActive("/about")} onOpen={() => setOpenMenu("about")} />
            </li>
          </ul>
        </nav>
      </Container>

      {/* Collections mega-menu — three taxonomy columns, straight from taxonomy.ts. */}
      <AnimatePresence>
        {openMenu === "collections" && (
          <motion.div variants={panelVariants} initial="hidden" animate="visible" exit="hidden" className="absolute inset-x-0 z-50 hidden border-t border-b shadow-sm top-full bg-light border-border lg:block">
            <Container className="grid grid-cols-3 py-10 gap-x-10">
              {columns.map((column) => (
                <div key={column.title}>
                  <p className="font-heading text-xxs tracking-[0.2em] uppercase text-primary mb-4">{column.title}</p>
                  <ul className="space-y-2.5 list-none">
                    {column.items.map((item) => (
                      <li key={item.href}>
                        <LocaleLink href={item.href} onClick={closeAll} className="text-sm duration-200 text-body hover:text-primary">
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

        {(openMenu === "customerCare" || openMenu === "about") && (
          <motion.div variants={panelVariants} initial="hidden" animate="visible" exit="hidden" className="absolute inset-x-0 z-50 hidden border-t border-b shadow-sm top-full bg-light border-border lg:block">
            <Container className="flex flex-wrap justify-center py-8 gap-x-10 gap-y-3">
              {(openMenu === "about" ? aboutNav : customerCareNav).map((item) => (
                <LocaleLink key={item.href} href={item.href} onClick={closeAll} className="text-sm duration-200 text-body hover:text-primary">
                  {item.name}
                </LocaleLink>
              ))}
            </Container>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile drawer — one flat list, since a nested accordion on a phone hides more
          than it organises at this menu size. */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div variants={drawerVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden border-t bg-light border-border lg:hidden">
            <Container className="py-4">
              <ul className="list-none divide-y divide-border/70">
                {[
                  { name: labels.newArrivals, href: "/new-arrivals" },
                  ...brandingNav,
                  ...audienceNav,
                  ...garmentNav,
                  { name: labels.ourWorld, href: "/our-world" },
                  { name: labels.journal, href: "/journal" },
                  ...customerCareNav,
                  ...aboutNav,
                ].map((item) => (
                  <li key={`${item.name}-${item.href}`}>
                    <LocaleLink
                      href={item.href}
                      onClick={closeAll}
                      className={`block py-3 font-heading text-sm tracking-[0.08em] uppercase duration-200 ${isActive(item.href) ? "text-primary" : "text-body hover:text-primary"}`}
                    >
                      {item.name}
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
