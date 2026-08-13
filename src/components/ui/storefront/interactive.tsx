"use client";

/**
 * Stateful half of the storefront kit (§C2's convention, public side).
 * Split from `ui.tsx` so the presentational pieces stay usable from server components.
 */

import * as React from "react";

import { PiMinus, PiPlus, PiArrowLeft, PiArrowRight } from "react-icons/pi";

// =============================================================================
// Accordion — Product Details content panels, and the FAQ list
// =============================================================================

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  /** The first panel on Product Details is open on load. */
  defaultOpen?: boolean;
  /** FAQ rows sit on a tinted band; product panels are separated by hairlines only. */
  tone?: "plain" | "filled";
}

export const AccordionItem = ({
  title,
  children,
  defaultOpen = false,
  tone = "plain",
}: AccordionItemProps) => {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className={tone === "filled" ? "bg-muted" : "border-b border-border"}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-6 text-left hover:cursor-pointer ${tone === "filled" ? "px-6 py-5" : "py-5"}`}
      >
        <span className="text-lg font-heading text-primary">{title}</span>
        {open ? (
          <PiMinus className="shrink-0 size-4 text-primary" />
        ) : (
          <PiPlus className="shrink-0 size-4 text-primary" />
        )}
      </button>

      {open && (
        <div
          className={`text-sm text-body ${tone === "filled" ? "px-6 pb-5" : "pb-6"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Tabs — Our Production, Size Guide, About philosophy
// =============================================================================

export interface TabItem {
  key: string;
  label: string;
}

/** Underlined tab row. Controlled, so the page owns which panel it renders. */
export const TabBar = ({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) => (
  <div
    className={`grid border-b border-border ${className ?? ""}`}
    style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
  >
    {items.map((item) => {
      const isActive = item.key === active;
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          aria-selected={isActive}
          role="tab"
          className={`-mb-px border-b-2 pb-3 text-center text-sm font-heading uppercase tracking-[0.12em] transition-colors ${
            isActive
              ? "border-primary text-primary"
              : "border-transparent text-body/60 hover:text-body hover:cursor-pointer"
          }`}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);

/** Convenience wrapper for the common "tabs own their own state" case. */
export const Tabs = ({
  items,
  children,
  className,
}: {
  items: TabItem[];
  children: (active: string) => React.ReactNode;
  className?: string;
}) => {
  const [active, setActive] = React.useState(items[0]?.key ?? "");

  return (
    <div className={className}>
      <TabBar items={items} active={active} onChange={setActive} />
      <div className="pt-8">{children(active)}</div>
    </div>
  );
};

// =============================================================================
// Carousel — "Just Arrived", "You May Also Like", "Featured Read"
// =============================================================================

/**
 * A horizontal scroller rather than a slide-index carousel: the mockups show the
 * next card bleeding off the right edge, which is what `overflow-x` gives for free
 * and what a transform-based track would have to fake.
 */
export const useCarousel = () => {
  const ref = React.useRef<HTMLDivElement>(null);

  const scrollBy = (direction: 1 | -1) => {
    const node = ref.current;
    if (!node) return;
    // One "page" is the visible width minus a card's worth of overlap, so the card
    // that was peeking becomes the first fully-visible one.
    node.scrollBy({
      left: direction * node.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  return { ref, scrollBy };
};

export const CarouselArrows = ({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: () => void;
}) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={onPrev}
      aria-label="Previous"
      className="grid transition-colors size-11 place-items-center bg-primary text-light hover:bg-primary/90 hover:cursor-pointer"
    >
      <PiArrowLeft className="size-5" />
    </button>
    <button
      type="button"
      onClick={onNext}
      aria-label="Next"
      className="grid transition-colors size-11 place-items-center bg-primary text-light hover:bg-primary/90 hover:cursor-pointer"
    >
      <PiArrowRight className="size-5" />
    </button>
  </div>
);

export const CarouselTrack = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className?: string }
>(({ children, className }, ref) => (
  <div
    ref={ref}
    className={`flex gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className ?? ""}`}
  >
    {children}
  </div>
));

CarouselTrack.displayName = "CarouselTrack";
