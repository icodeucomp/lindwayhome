"use client";

import * as React from "react";

import { useCartStore, useToggleState, useWishlistStore } from "@/hooks";

import { AnimatePresence, motion } from "framer-motion";

import { Img, Container, LocaleLink } from "@/components";

import { aboutNav, audienceNav, brandingNav, garmentNav, socialLinks } from "@/static/navigation";

import { LanguageSwitch } from "./language-switch";

import { PiCaretDownBold, PiHeartStraight, PiHandbagSimple } from "react-icons/pi";

const dropdownVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, staggerChildren: 0.08 } },
  exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } },
};

const menuItemVariants = {
  hidden: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const megaMenuVariants = {
  hidden: { opacity: 0, y: -8, transition: { duration: 0.15 } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const Counter = ({ value }: { value: number }) =>
  value > 0 ? <span className="absolute grid text-[10px] rounded-full -top-2 -right-2 bg-primary text-light size-4 place-items-center">{value}</span> : null;

export const Header = ({ isDark }: { isDark?: boolean }) => {
  const { getCartItemByProduct } = useCartStore();
  const wishlist = useWishlistStore();

  const { ref: mobileRef, state: openMobile, toggleState: toggleMobile } = useToggleState();
  const [openMenu, setOpenMenu] = React.useState<"collections" | "about" | null>(null);

  const tone = isDark ? "text-body" : "text-light";
  const rule = isDark ? "bg-primary" : "bg-light";

  return (
    <>
      <header className={`w-full transition-all duration-300 border-b ${isDark ? "bg-light border-border text-body" : "bg-transparent border-transparent text-light"}`}>
        <Container className="flex items-center justify-between h-24 gap-8">
          <menu className="items-center hidden gap-4 list-none lg:flex">
            <li>
              <a href={socialLinks.maps} target="_blank" rel="noopener noreferrer">
                <Img src={isDark ? "/icons/location-grey.svg" : "/icons/location-light.svg"} alt="location icons" className="size-6" />
              </a>
            </li>
            <li>
              <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer">
                <Img src={isDark ? "/icons/whatsapp-grey.svg" : "/icons/whatsapp-light.svg"} alt="whatsapp icons" className="size-6" />
              </a>
            </li>
            <li>
              <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                <Img src={isDark ? "/icons/instagram-grey.svg" : "/icons/instagram-light.svg"} alt="instagram icons" className="size-6" />
              </a>
            </li>
            <li>
              <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer">
                <Img src={isDark ? "/icons/facebook-grey.svg" : "/icons/facebook-light.svg"} alt="facebook icons" className="size-6" />
              </a>
            </li>
          </menu>

          <div className="relative lg:absolute lg:transform lg:-translate-x-1/2 lg:left-1/2">
            <LocaleLink href="/">
              <Img src={isDark ? "/icons/dark-logo.png" : "/icons/light-logo.png"} alt="lindway logo" className="h-12 mx-auto xl:h-14 min-w-28 lg:min-w-32 xl:min-w-36" cover />
            </LocaleLink>
          </div>

          <div ref={mobileRef} className="flex items-center justify-center gap-4 xl:gap-5">
            <LanguageSwitch isDark={isDark} />

            <div className="relative">
              <LocaleLink href="/wishlist" className="block" aria-label="Wishlist">
                <PiHeartStraight className={`size-6 ${tone}`} />
              </LocaleLink>
              <Counter value={wishlist.count()} />
            </div>

            <div className="relative">
              <LocaleLink href="/cart" className="block" aria-label="Bag">
                <PiHandbagSimple className={`size-6 ${tone}`} />
              </LocaleLink>
              <Counter value={getCartItemByProduct()} />
            </div>

            <button onClick={toggleMobile} className="flex flex-col items-center justify-center size-8 space-y-1.5 md:hidden" aria-label="Toggle mobile menu">
              <span className={`w-6 h-0.5 transition-all duration-300 ${rule} ${openMobile ? "rotate-45 translate-y-2" : ""}`}></span>
              <span className={`w-6 h-0.5 transition-all duration-300 ${rule} ${openMobile ? "opacity-0" : ""}`}></span>
              <span className={`w-6 h-0.5 transition-all duration-300 ${rule} ${openMobile ? "-rotate-45 -translate-y-2" : ""}`}></span>
            </button>
          </div>
        </Container>
      </header>

      <nav
        className={`relative w-full md:flex md:items-center h-full md:h-12 ${isDark ? "bg-light text-body shadow-sm" : "bg-transparent text-light"}`}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <Container className="items-center justify-center hidden md:flex">
          <menu className="items-center justify-center hidden gap-6 list-none md:flex lg:gap-10">
            <li className="relative text-xs font-heading lg:text-sm group whitespace-nowrap">
              <LocaleLink href="/new-arrivals">New Arrivals</LocaleLink>
            </li>

            <li className="text-xs font-heading lg:text-sm whitespace-nowrap" onMouseEnter={() => setOpenMenu("collections")}>
              <button className="flex items-center gap-1" aria-expanded={openMenu === "collections"}>
                Collections <PiCaretDownBold className="size-3" />
              </button>
            </li>

            <li className="relative text-xs font-heading lg:text-sm whitespace-nowrap">
              <LocaleLink href="/our-world">Our World</LocaleLink>
            </li>

            <li className="relative text-xs font-heading lg:text-sm whitespace-nowrap">
              <LocaleLink href="/journal">Journal</LocaleLink>
            </li>

            <li className="text-xs font-heading lg:text-sm whitespace-nowrap" onMouseEnter={() => setOpenMenu("about")}>
              <button className="flex items-center gap-1" aria-expanded={openMenu === "about"}>
                About <PiCaretDownBold className="size-3" />
              </button>
            </li>
          </menu>
        </Container>

        {/* Collections mega-menu — three taxonomy columns (D16). */}
        <AnimatePresence>
          {openMenu === "collections" && (
            <motion.div variants={megaMenuVariants} initial="hidden" animate="visible" exit="hidden" className="absolute left-0 z-50 hidden w-full border-t shadow-md top-full bg-light border-border md:block">
              <Container className="grid grid-cols-3 gap-10 py-8 text-body">
                {[
                  { title: "Branding", items: brandingNav },
                  { title: "Audience", items: audienceNav },
                  { title: "Garment", items: garmentNav },
                ].map((column) => (
                  <div key={column.title} className="space-y-3">
                    <p className="text-xs tracking-[0.2em] uppercase font-heading text-primary">{column.title}</p>
                    <ul className="space-y-2 list-none">
                      {column.items.map((item) => (
                        <li key={item.href}>
                          <LocaleLink href={item.href} className="text-sm hover:text-primary" onClick={() => setOpenMenu(null)}>
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

          {openMenu === "about" && (
            <motion.div variants={megaMenuVariants} initial="hidden" animate="visible" exit="hidden" className="absolute left-0 z-50 hidden w-full border-t shadow-md top-full bg-light border-border md:block">
              <Container className="flex flex-wrap gap-x-10 gap-y-2 py-6 text-body">
                {aboutNav.map((item) => (
                  <LocaleLink key={item.href} href={item.href} className="text-sm hover:text-primary" onClick={() => setOpenMenu(null)}>
                    {item.name}
                  </LocaleLink>
                ))}
              </Container>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile drawer */}
        <div className="relative flex items-center w-full md:hidden">
          <AnimatePresence>
            {openMobile && (
              <motion.div className="absolute right-0 top-0 z-50 w-full overflow-hidden shadow-lg bg-body text-light" variants={dropdownVariants} initial="hidden" animate="visible" exit="exit">
                <menu className="flex flex-col list-none">
                  {[
                    { name: "New Arrivals", href: "/new-arrivals" },
                    { name: "Best Sellers", href: "/best-sellers" },
                    ...brandingNav,
                    ...audienceNav,
                    ...garmentNav,
                    { name: "Our World", href: "/our-world" },
                    ...aboutNav,
                  ].map((item) => (
                    <motion.li key={`${item.name}-${item.href}`} variants={menuItemVariants}>
                      <LocaleLink href={item.href} className="block px-4 py-3 text-sm transition-colors hover:bg-light/10" onClick={toggleMobile}>
                        {item.name}
                      </LocaleLink>
                    </motion.li>
                  ))}
                </menu>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </>
  );
};
