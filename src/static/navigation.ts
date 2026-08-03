/**
 * v2 navigation (CLAUDE.md §B2.2).
 *
 * The three taxonomy arrays below are PLACEHOLDERS. Phase 1 replaces them with live
 * `BrandingType` / `AudienceType` / `GarmentType` queries so the Collections mega-menu
 * is admin-driven and a new branding appears without a deploy (D16). Until then they
 * keep the header shell honest — every entry points at a route that exists.
 */

export interface NavItem {
  name: string;
  href: string;
}

/** Placeholder — replace with BrandingType rows in phase 1. */
export const brandingNav: NavItem[] = [
  { name: "My Lindway", href: "/my-lindway" },
  { name: "Simply Lindway", href: "/simply-lindway" },
  { name: "Lure by Lindway", href: "/lure-by-lindway" },
];

/** Placeholder — replace with AudienceType rows in phase 1. */
export const audienceNav: NavItem[] = [
  { name: "Women", href: "/shop/for/women" },
  { name: "Men", href: "/shop/for/men" },
  { name: "Kids", href: "/shop/for/kids" },
];

/** Placeholder — replace with GarmentType rows in phase 1. */
export const garmentNav: NavItem[] = [
  { name: "Dresses", href: "/shop/dresses" },
  { name: "Tops", href: "/shop/tops" },
  { name: "Skirts", href: "/shop/skirts" },
];

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
