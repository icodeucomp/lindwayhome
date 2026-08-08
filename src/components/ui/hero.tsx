import { PageHero } from "@/components/ui/storefront";

import type { Crumb } from "@/components/ui/storefront";

interface HeroProps {
  imagePath: string;
  title: string;
  description: string;
  crumbs?: Crumb[];
  cta?: string;
}

/**
 * Back-compat shim over `PageHero`.
 *
 * v1's hero rendered the `Header` inside itself, which is why every page had to mount
 * its own shell. The shell moved to the public layout, so this now only draws the hero
 * band — the prop shape is unchanged so the content pages carried over from v1 keep
 * working until each is rewritten against the mockups.
 */
export const Hero = ({ description, title, imagePath, crumbs, cta = "Discover Now" }: HeroProps) => (
  <PageHero title={title} description={description} image={imagePath} crumbs={crumbs} cta={cta} />
);
