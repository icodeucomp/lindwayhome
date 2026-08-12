/**
 * Storefront design kit (phase 2b).
 *
 * The public pages compose from this file the way admin screens compose from
 * `slicing/ui.tsx` (CLAUDE.md §C2). Every mockup in `reference/` repeats the same
 * handful of shapes — a full-bleed hero, an uppercase section heading, a grey promo
 * block, an icon strip — so they live here once instead of being redrawn per page.
 *
 * The language: uppercase letterspaced headings in `primary`, hairline rules instead
 * of card borders, square corners, Raleway for headings and micro-labels. `body`
 * carries solid fills, `primary` is the accent.
 *
 * Non-interactive by design — anything needing state lives in `interactive.tsx` so
 * these stay renderable from server components.
 */

import * as React from "react";

import { Background, Container, LocaleLink } from "@/components";

import { PiCaretDownBold, PiCaretRightBold, PiArrowRight } from "react-icons/pi";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/** Neutral stand-in for the grey image boxes in the mockups, used until real art lands. */
export const IMAGE_FALLBACK = PLACEHOLDER_IMAGE;

// =============================================================================
// Type
// =============================================================================

/** Uppercase letterspaced micro-label — the eyebrow above a heading, and chip text. */
export const Eyebrow = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-xs font-heading uppercase tracking-[0.18em] text-primary ${className ?? ""}`}>{children}</p>
);

interface SectionHeadingProps {
  title: string;
  description?: string;
  /** Rendered flush right on the heading row — an arrow link, or carousel arrows. */
  action?: React.ReactNode;
  /** The mockups use both: uppercase for page sections, title case for sub-sections. */
  variant?: "upper" | "title";
  className?: string;
}

export const SectionHeading = ({ title, description, action, variant = "upper", className }: SectionHeadingProps) => (
  <div className={`flex items-start justify-between gap-6 ${className ?? ""}`}>
    <div className="space-y-2">
      <h2 className={`font-heading text-primary text-2xl sm:text-3xl ${variant === "upper" ? "uppercase tracking-[0.02em]" : ""}`}>{title}</h2>
      {description && <p className="max-w-2xl text-sm sm:text-base text-body">{description}</p>}
    </div>
    {action && <div className="hidden shrink-0 sm:block">{action}</div>}
  </div>
);

// =============================================================================
// Link & button
// =============================================================================

/** "SHOP NOW →" / "READ MORE →" / "VIEW ALL STORIES →". */
export const ArrowLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <LocaleLink href={href} className={`group inline-flex items-center gap-3 text-xs font-heading uppercase tracking-[0.16em] text-primary ${className ?? ""}`}>
    {children}
    <PiArrowRight className="transition-transform duration-300 size-4 group-hover:translate-x-1" />
  </LocaleLink>
);

/** Boxed variant of the same idea — used inside promo blocks. */
export const OutlineLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <LocaleLink
    href={href}
    className={`group inline-flex items-center gap-4 border border-primary px-4 py-3 text-xs font-heading uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary hover:text-light ${className ?? ""}`}
  >
    {children}
    <PiArrowRight className="transition-transform duration-300 size-4 group-hover:translate-x-1" />
  </LocaleLink>
);

type StoreButtonVariant = "solid" | "outline" | "ghost";

const buttonStyles: Record<StoreButtonVariant, string> = {
  solid: "bg-primary text-light hover:bg-primary/90",
  outline: "border border-primary text-primary hover:bg-primary hover:text-light",
  ghost: "border border-light/70 text-light hover:bg-light hover:text-body",
};

export const StoreLinkButton = ({ href, children, variant = "solid", className }: { href: string; children: React.ReactNode; variant?: StoreButtonVariant; className?: string }) => (
  <LocaleLink href={href} className={`inline-flex items-center justify-center px-6 py-3.5 text-xs font-heading uppercase tracking-[0.16em] transition-colors ${buttonStyles[variant]} ${className ?? ""}`}>
    {children}
  </LocaleLink>
);

export const StoreButton = ({
  children,
  variant = "solid",
  className,
  ...props
}: { children: React.ReactNode; variant?: StoreButtonVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center px-6 py-3.5 text-xs font-heading uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant]} ${className ?? ""}`}
  >
    {children}
  </button>
);

// =============================================================================
// Breadcrumb
// =============================================================================

export interface Crumb {
  name: string;
  href?: string;
}

export const Breadcrumb = ({ items, tone = "light" }: { items: Crumb[]; tone?: "light" | "dark" }) => {
  const idle = tone === "light" ? "text-light/70" : "text-body/60";
  const active = tone === "light" ? "text-light" : "text-primary";

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm list-none">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.name}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <LocaleLink href={item.href} className={`${idle} transition-colors hover:${active}`}>
                  {item.name}
                </LocaleLink>
              ) : (
                <span className={isLast ? active : idle}>{item.name}</span>
              )}
              {!isLast && <PiCaretRightBold className={`size-3 ${idle}`} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// =============================================================================
// Page hero
// =============================================================================

interface PageHeroProps {
  title: string;
  description?: string;
  image?: string;
  crumbs?: Crumb[];
  /** Label of the scroll-down button. Omitted renders no button. */
  cta?: string;
  /** Element id the button scrolls to — every page that uses `cta` must render it. */
  ctaTarget?: string;
  /** `center` is the Collections Details treatment; `left` is everywhere else. */
  align?: "left" | "center";
}

export const PageHero = ({ title, description, image = IMAGE_FALLBACK, crumbs, cta, ctaTarget = "content", align = "left" }: PageHeroProps) => (
  <Background src={image} alt={`${title} hero`} parentClassName="shadow-none" className="flex flex-col justify-center min-h-110" imgClassName="brightness-[0.72]">
    <Container className={`py-20 ${align === "center" ? "text-center" : ""}`}>
      {crumbs && (
        <div className={align === "center" ? "flex justify-start" : ""}>
          <Breadcrumb items={crumbs} />
        </div>
      )}

      <div className={`mt-10 space-y-4 ${align === "center" ? "mx-auto max-w-2xl" : "max-w-xl"}`}>
        <h1 className="text-4xl font-heading sm:text-5xl">{title}</h1>
        {description && <p className="text-sm sm:text-base text-light/90">{description}</p>}

        {cta && (
          <div className={`pt-4 ${align === "center" ? "flex justify-center" : ""}`}>
            <a href={`#${ctaTarget}`} className="inline-flex items-center gap-4 px-5 py-3.5 text-xs border font-heading uppercase tracking-[0.16em] border-light/70 text-light transition-colors hover:bg-light hover:text-body">
              {cta}
              <PiCaretDownBold className="size-3" />
            </a>
          </div>
        )}
      </div>
    </Container>
  </Background>
);

// =============================================================================
// Blocks
// =============================================================================

/**
 * The image call-out — "Inside the Atelier", "Our Fabric Library", "Learn How to Shop",
 * "Discover Our Sustainability Principles".
 *
 * The artwork is the container's own background rather than an absolutely-positioned
 * `<Img>` filling half the card, so the copy sits over one continuous surface instead
 * of butting against a hard vertical seam.
 *
 * That means no `next/image` here — no srcset, no lazy loading. Acceptable while every
 * banner shows the same placeholder SVG, which none of that would help. **When the
 * client's photography lands, this is the component to reconsider**: a real photograph
 * behind text wants both the optimisation and a scrim, since `text-body` over an
 * unknown image is a legibility gamble.
 */
export const PromoBanner = ({ title, description, href, cta, image = IMAGE_FALLBACK }: { title: string; description: string; href: string; cta: string; image?: string }) => (
  <div
    style={{ backgroundImage: `url("${image}")` }}
    className="relative flex flex-col justify-center overflow-hidden bg-center bg-no-repeat bg-cover bg-footer/40 min-h-64"
  >
    <div className="relative z-10 max-w-md p-8 space-y-4 sm:p-10">
      <h3 className="text-xl uppercase font-heading text-primary sm:text-2xl">{title}</h3>
      <p className="text-sm text-body">{description}</p>
      <OutlineLink href={href}>{cta}</OutlineLink>
    </div>
  </div>
);

export interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

/**
 * The icon row under the hero, and the same content again above the footer.
 *
 * The column count follows the item count rather than being fixed. It used to be
 * `lg:grid-cols-5`, which fits `craftValues` (five) exactly and left `careValues`
 * (four) with an empty fifth column — the strip bunched to the left with dead space on
 * the right. A CSS variable carries the count because Tailwind cannot see a class name
 * built at runtime, and an inline `grid-template-columns` could not be held back to
 * `md` and up.
 */
export const FeatureStrip = ({ items, className }: { items: Feature[]; className?: string }) => (
  <div className={`bg-muted ${className ?? ""}`}>
    <Container
      style={{ "--feature-cols": items.length } as React.CSSProperties}
      className="grid grid-cols-2 gap-6 py-8 md:grid-cols-[repeat(var(--feature-cols),minmax(0,1fr))]"
    >
      {items.map((item) => (
        <div key={item.title} className="flex items-start gap-3">
          <span className="mt-0.5 text-primary [&>svg]:size-6">{item.icon}</span>
          <div className="space-y-1">
            <p className="text-xs font-heading uppercase tracking-[0.14em] text-primary">{item.title}</p>
            <p className="text-xs leading-snug text-body">{item.description}</p>
          </div>
        </div>
      ))}
    </Container>
  </div>
);

/** Bordered icon card — the "Why Choose Us?" grid on About. */
export const FeatureCard = ({ item }: { item: Feature }) => (
  <div className="flex items-start gap-4 p-6 border border-primary/40">
    <span className="mt-0.5 text-primary [&>svg]:size-7">{item.icon}</span>
    <div className="space-y-1">
      <p className="text-sm font-heading uppercase tracking-[0.12em] text-primary">{item.title}</p>
      <p className="text-sm text-body">{item.description}</p>
    </div>
  </div>
);

// =============================================================================
// States
// =============================================================================

export const StoreEmptyState = ({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) => (
  <div className="py-20 space-y-3 text-center">
    <p className="text-lg uppercase font-heading text-primary tracking-[0.06em]">{title}</p>
    {description && <p className="text-sm text-body/70">{description}</p>}
    {action && <div className="pt-2">{action}</div>}
  </div>
);

export const StoreSkeletonGrid = ({ count = 8, className }: { count?: number; className?: string }) => (
  <div className={`grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 ${className ?? ""}`}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="space-y-3 animate-pulse">
        <div className="aspect-4/5 bg-footer/50" />
        <div className="w-2/3 h-4 bg-footer/50" />
        <div className="w-1/2 h-4 bg-footer/40" />
      </div>
    ))}
  </div>
);
