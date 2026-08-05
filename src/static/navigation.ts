/**
 * v2 navigation (CLAUDE.md §B2.2).
 *
 * The three Collections columns are derived from `taxonomy.ts`, not queried. Branding,
 * audience and garment are Prisma enums (D25), so the menu changes with a deploy, not
 * with a database row — `isActive` in taxonomy.ts is what hides an entry meanwhile.
 */

import { activeAudience, activeBranding, activeGarment } from "./taxonomy";

export interface NavItem {
  name: string;
  href: string;
}

export const brandingNav: NavItem[] = activeBranding().map((entry) => ({ name: entry.label, href: `/collections/${entry.slug}` }));

export const audienceNav: NavItem[] = activeAudience().map((entry) => ({ name: entry.label, href: `/shop/for/${entry.slug}` }));

export const garmentNav: NavItem[] = activeGarment().map((entry) => ({ name: entry.label, href: `/shop/${entry.slug}` }));

export const aboutNav: NavItem[] = [
  { name: "Our Story", href: "/about/our-story" },
  { name: "Our Production", href: "/about/our-production" },
  { name: "Our Artisan", href: "/about/our-artisan" },
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

export const shopNav: NavItem[] = [{ name: "New Arrivals", href: "/new-arrivals" }, { name: "Best Sellers", href: "/best-sellers" }, ...garmentNav, ...audienceNav];

export const socialLinks = {
  maps: "https://maps.app.goo.gl/2pUxXSh99bSCWTtd6",
  whatsapp: "https://api.whatsapp.com/send?phone=6282339936682",
  instagram: "https://www.instagram.com/mylindway",
  facebook: "https://www.facebook.com/mylindwaybrand",
};
