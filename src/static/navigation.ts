/**
 * v2 navigation (CLAUDE.md §B2.2).
 *
 * The three Collections columns are derived from `taxonomy.ts`, not queried. Branding,
 * audience and clothing are Prisma enums (D25), so the menu changes with a deploy, not
 * with a database row — `isActive` in taxonomy.ts is what hides an entry meanwhile.
 */

import { activeAudience, activeBranding, activeClothing } from "./taxonomy";

export interface NavItem {
  name: string;
  href: string;
}

export const brandingNav: NavItem[] = activeBranding().map((entry) => ({ name: entry.label, href: `/collections/${entry.slug}` }));

export const audienceNav: NavItem[] = activeAudience().map((entry) => ({ name: entry.label, href: `/shop/for/${entry.slug}` }));

export const clothingNav: NavItem[] = activeClothing().map((entry) => ({ name: entry.label, href: `/shop/${entry.slug}` }));

/**
 * Our Story and Our Artisan are sections of the single About page (reference/About
 * Us.png), so they point at anchors rather than routes of their own. The old routes
 * still exist as redirects.
 */
export const aboutNav: NavItem[] = [
  { name: "Our Story", href: "/about" },
  { name: "Our Production", href: "/about/our-production" },
  { name: "Our Artisan", href: "/about#artisan" },
  { name: "Sustainability", href: "/about/sustainability" },
  { name: "Our Fabrics", href: "/about/our-fabrics" },
  // Journal appears here as well as at top level — intentional (D13).
  { name: "Journal", href: "/journal" },
];

export const customerCareNav: NavItem[] = [
  { name: "Size Guide", href: "/customer-care/size-guide" },
  { name: "How to Shop", href: "/customer-care/how-to-shop" },
  { name: "Shipping & Delivery", href: "/customer-care/shipping-delivery" },
  { name: "Return & Exchanges", href: "/customer-care/return-exchanges" },
  { name: "Care Instructions", href: "/customer-care/care-instructions" },
  { name: "Contact Us", href: "/customer-care/contact-us" },
  { name: "FAQ", href: "/customer-care/faq" },
];

export const shopNav: NavItem[] = [{ name: "New Arrivals", href: "/new-arrivals" }, { name: "Best Sellers", href: "/best-sellers" }, ...clothingNav, ...audienceNav];

export const socialLinks = {
  email: "mailto:mylindway@gmail.com",
  maps: "https://maps.app.goo.gl/2pUxXSh99bSCWTtd6",
  whatsapp: "https://api.whatsapp.com/send?phone=6282339936682",
  instagram: "https://www.instagram.com/mylindway",
  facebook: "https://www.facebook.com/mylindwaybrand",
};
