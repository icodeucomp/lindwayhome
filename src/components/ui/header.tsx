"use client";

import Link from "next/link";

import { useCartStore, useToggleState } from "@/hooks";

import { AnimatePresence, motion } from "framer-motion";

import { Img, Container } from "@/components";

import { navLists } from "@/static/navigation";

const navFeatureLists = [
  { name: "My Lindway", href: "/my-lindway" },
  { name: "Simply Lindway", href: "/simply-lindway" },
  { name: "Lure by Lindway", href: "/lure-by-lindway" },
];

const dropdownVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, staggerChildren: 0.08 } },
  exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } },
};

const menuItemVariants = {
  hidden: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const Header = ({ isDark }: { isDark?: boolean }) => {
  const { getCartItemByProduct } = useCartStore();

  const { ref, state: openDropdown, toggleState: toggleDropdown } = useToggleState();
  return (
    <>
      {/* Logo Header */}
      <header className={`w-full transition-all duration-300 border-b ${isDark ? "text-gray bg-light border-gray" : "bg-transparent text-light"}`}>
        <Container className="flex items-center justify-between h-24 gap-8">
          <menu className="items-center hidden gap-4 list-none lg:flex">
            <li>
              <a href="https://maps.app.goo.gl/2pUxXSh99bSCWTtd6" target="_blank" rel="noopener noreferrer">
                <Img src={isDark ? "/icons/location-grey.svg" : "/icons/location-light.svg"} alt="location icons" className="size-7" />
              </a>
            </li>
            <li>
              <a href="https://api.whatsapp.com/send?phone=6282339936682" target="_blank" rel="noopener noreferrer">
                <Img src={isDark ? "/icons/whatsapp-grey.svg" : "/icons/whatsapp-light.svg"} alt="whatsapp icons" className="size-7" />
              </a>
            </li>
            <li>
              <a href="https://www.instagram.com/mylindway" target="_blank" rel="noopener noreferrer">
                <Img src={isDark ? "/icons/instagram-grey.svg" : "/icons/instagram-light.svg"} alt="instagram icons" className="size-7" />
              </a>
            </li>
            <li>
              <a href="https://www.facebook.com/mylindwaybrand" target="_blank" rel="noopener noreferrer">
                <Img src={isDark ? "/icons/facebook-grey.svg" : "/icons/facebook-light.svg"} alt="facebook icons" className="size-7" />
              </a>
            </li>
          </menu>
          <div className="relative lg:absolute lg:transform lg:-translate-x-1/2 lg:left-1/2">
            <Link href="/">
              <Img src={isDark ? "/icons/dark-logo.png" : "/icons/light-logo.png"} alt="lindway logo" className="h-12 mx-auto xl:h-14 min-w-28 lg:min-w-32 xl:min-w-36" cover />
            </Link>
          </div>
          <div ref={ref} className="flex items-center justify-center gap-4 xl:gap-6">
            <menu className="items-center justify-center hidden gap-4 list-none sm:flex xl:gap-6">
              {navFeatureLists.map((item, index) => (
                <li key={index} className="relative text-sm group xl:text-base">
                  <Link href={item.href}>{item.name}</Link>
                  <span className={`absolute h-0.5 transition-all -bottom-1.5 left-1/2 ${isDark ? "bg-gray" : "bg-light"} w-0 group-hover:w-10`}></span>
                  <span className={`absolute h-0.5 transition-all -bottom-1.5 right-1/2 ${isDark ? "bg-gray" : "bg-light"} w-0 group-hover:w-10`}></span>
                </li>
              ))}
            </menu>
            <button onClick={toggleDropdown} className="flex flex-col items-center justify-center size-8 space-y-1.5 md:hidden" aria-label="Toggle mobile menu">
              <span className={`w-6 h-0.5 transition-all duration-300 ${isDark ? "bg-gray" : "bg-light"} ${openDropdown ? "rotate-45 translate-y-2" : ""}`}></span>
              <span className={`w-6 h-0.5 transition-all duration-300 ${isDark ? "bg-gray" : "bg-light"} ${openDropdown ? "opacity-0" : ""}`}></span>
              <span className={`w-6 h-0.5 transition-all duration-300 ${isDark ? "bg-gray" : "bg-light"} ${openDropdown ? "-rotate-45 -translate-y-2" : ""}`}></span>
            </button>
            <div className="relative">
              <Link href="/cart" className="block">
                <Img src={isDark ? "/icons/cart-dark.svg" : "/icons/cart-light.svg"} alt="cart icons" className="size-7" />
              </Link>
              {getCartItemByProduct() > 0 && <span className="absolute text-xs text-center rounded-full -top-2 -right-2 bg-gray text-light size-4">{getCartItemByProduct()}</span>}
            </div>
          </div>
        </Container>
      </header>

      <nav className={`w-full md:flex md:items-center h-full md:h-12 ${isDark ? "bg-light text-gray shadow-md" : "bg-transparent text-light"}`}>
        <Container className="items-center justify-between hidden md:flex md:justify-center">
          <menu className="items-center justify-center hidden gap-2 list-none md:flex lg:gap-6">
            {navLists.map((item, index) => (
              <li key={index} className="relative text-xs lg:text-sm group whitespace-nowrap">
                <Link href={item.href}>{item.name}</Link>
                <span className={`absolute h-0.5 transition-all -bottom-1.5 left-1/2 ${isDark ? "bg-gray" : "bg-light"} w-0 group-hover:w-8`}></span>
                <span className={`absolute h-0.5 transition-all -bottom-1.5 right-1/2 ${isDark ? "bg-gray" : "bg-light"} w-0 group-hover:w-8`}></span>
              </li>
            ))}
          </menu>
        </Container>
        <div className="relative flex items-center w-full md:hidden">
          <AnimatePresence>
            {openDropdown && (
              <motion.div className={`absolute right-0 top-0 w-full bg-gray shadow-lg overflow-hidden z-50 text-light`} variants={dropdownVariants} initial="hidden" animate="visible" exit="exit">
                <menu className="flex flex-col list-none">
                  {navFeatureLists.map((item, index) => (
                    <motion.li key={index} variants={menuItemVariants} className="block sm:hidden">
                      <Link href={item.href} className="block px-4 py-3 text-sm transition-colors hover:bg-opacity-10 hover:bg-light hover:text-gray" onClick={toggleDropdown}>
                        {item.name}
                      </Link>
                    </motion.li>
                  ))}
                  {navLists.map((item, index) => (
                    <motion.li key={index} variants={menuItemVariants}>
                      <Link href={item.href} className="block px-4 py-3 text-sm transition-colors hover:bg-opacity-10 hover:bg-light hover:text-gray" onClick={toggleDropdown}>
                        {item.name}
                      </Link>
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
