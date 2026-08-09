import { Container, Img, LocaleLink } from "@/components";

import { activeAudience, activeClothing } from "@/static/taxonomy";

import { IMAGE_FALLBACK } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * The row of category shortcuts under the listing hero (reference/Product Search.png).
 *
 * Derived from `taxonomy.ts` plus the two computed listings, so it never drifts from
 * the header's Collections menu. Scrolls sideways below `lg` rather than wrapping into
 * a ragged second row.
 */

const links = [
  { name: "New Arrivals", href: "/new-arrivals", image: PLACEHOLDER_IMAGE },
  { name: "Best Sellers", href: "/best-sellers", image: PLACEHOLDER_IMAGE },
  ...activeClothing().map((entry) => ({ name: entry.label, href: `/shop/${entry.slug}`, image: "" })),
  ...activeAudience().map((entry) => ({ name: entry.label, href: `/shop/for/${entry.slug}`, image: "" })),
];

export const ShopLinks = () => (
  <Container className="pt-10">
    <ul className="flex gap-5 pb-2 overflow-x-auto list-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map((link) => (
        <li key={link.href} className="w-32 shrink-0">
          <LocaleLink href={link.href} className="block space-y-2 group">
            <span className="block overflow-hidden aspect-4/3 bg-footer/30">
              <Img src={link.image || IMAGE_FALLBACK} alt={link.name} className="w-full h-full transition-transform duration-700 group-hover:scale-105" cover />
            </span>
            <span className="block text-xs text-center font-heading uppercase tracking-[0.12em] text-body group-hover:text-primary">{link.name}</span>
          </LocaleLink>
        </li>
      ))}
    </ul>
  </Container>
);
