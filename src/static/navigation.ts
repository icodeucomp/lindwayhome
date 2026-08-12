/**
 * v2 navigation (CLAUDE.md §B2.2).
 *
 * The three Collections columns are derived from `taxonomy.ts`, not queried. Brand,
 * audience and clothing are Prisma enums (D25), so the menu changes with a deploy, not
 * with a database row — `isActive` in taxonomy.ts is what hides an entry meanwhile.
 */

import { activeAudience, activeBrand, activeClothing } from "./taxonomy";

export interface NavItem {
  name: string;
  href: string;
  /** Dictionary key for this label, where one exists. See `localizeNav`. */
  key?: string;
}

/**
 * Swaps the English default for the reader's language.
 *
 * The arrays below are plain data so they can be imported anywhere, including client
 * components, while the dictionaries reach the client through `DictionaryProvider`. The
 * English label therefore ships in the array and the translation is applied at render.
 *
 * Taxonomy entries carry no key on purpose — brand, audience and clothing names are not
 * translated (D2), so they fall through unchanged.
 */
export const localizeNav = (items: NavItem[], labels?: Record<string, string>): NavItem[] =>
  labels ? items.map((item) => (item.key && labels[item.key] ? { ...item, name: labels[item.key] } : item)) : items;

export const brandNav: NavItem[] = activeBrand().map((entry) => ({ name: entry.label, href: `/collections/${entry.slug}` }));

export const audienceNav: NavItem[] = activeAudience().map((entry) => ({ name: entry.label, href: `/shop/${entry.slug}` }));

export const clothingNav: NavItem[] = activeClothing().map((entry) => ({ name: entry.label, href: `/shop/${entry.slug}` }));

/**
 * The Collections menu's second column: Best Sellers, then clothing, then audience.
 *
 * Audience and clothing used to be two columns of their own. They are one list because
 * a reader picking their way into the catalogue is answering a single question — what
 * am I shopping for — and two headed columns of three links each made them read the
 * headings before the links (D16). Best Sellers leads, being the one entry that asks
 * no decision of the reader.
 *
 * Every entry here lands on `/shop/…`, while the Brand column lands on `/collections/…`
 * — so the two columns also mark the difference between a filterable grid and an
 * editorial page.
 */
export const shopByNav: NavItem[] = [{ key: "bestSellers", name: "Best Sellers", href: "/best-sellers" }, ...clothingNav, ...audienceNav];

/**
 * Our Story and Our Artisan are sections of the single About page (reference/About
 * Us.png), so they point at anchors rather than routes of their own. The old routes
 * still exist as redirects.
 */
export const aboutNav: NavItem[] = [
  { key: "ourStory", name: "Our Story", href: "/about" },
  { key: "ourProduction", name: "Our Production", href: "/about/our-production" },
  { key: "ourArtisan", name: "Our Artisan", href: "/about#artisan" },
  { key: "sustainability", name: "Sustainability", href: "/about/sustainability" },
  { key: "ourFabrics", name: "Our Fabrics", href: "/about/our-fabrics" },
  // Journal appears here as well as at top level — intentional (D13).
  { key: "journal", name: "Journal", href: "/journal" },
];

export const customerCareNav: NavItem[] = [
  { key: "sizeGuide", name: "Size Guide", href: "/customer-care/size-guide" },
  { key: "howToShop", name: "How to Shop", href: "/customer-care/how-to-shop" },
  { key: "shippingDelivery", name: "Shipping & Delivery", href: "/customer-care/shipping-delivery" },
  { key: "returnExchanges", name: "Return & Exchanges", href: "/customer-care/return-exchanges" },
  { key: "careInstructions", name: "Care Instructions", href: "/customer-care/care-instructions" },
  { key: "contactUs", name: "Contact Us", href: "/customer-care/contact-us" },
  { key: "faq", name: "FAQ", href: "/customer-care/faq" },
];

export const shopNav: NavItem[] = [
  { key: "newArrivals", name: "New Arrivals", href: "/new-arrivals" },
  { key: "bestSellers", name: "Best Sellers", href: "/best-sellers" },
  ...clothingNav,
  ...audienceNav,
];

export const socialLinks = {
  email: "mailto:mylindway@gmail.com",
  maps: "https://maps.app.goo.gl/2pUxXSh99bSCWTtd6",
  whatsapp: "https://api.whatsapp.com/send?phone=6282339936682",
  instagram: "https://www.instagram.com/mylindway",
  facebook: "https://www.facebook.com/mylindwaybrand",
};
