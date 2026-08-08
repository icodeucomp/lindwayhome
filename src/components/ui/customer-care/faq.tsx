"use client";

import * as React from "react";

import { Container, RichText } from "@/components";

import { useApiLocale } from "@/hooks";

import { AccordionItem, PromoBanner, SectionHeading, StoreEmptyState, StoreSkeletonGrid } from "@/components/ui/storefront";

import { faqsApi } from "@/utils";

import type { Faq } from "@/types";

/**
 * FAQ page (reference/Frequently Asked Questions.png).
 *
 * Entries are grouped by `topic`, which is the field's whole purpose — one component
 * serves several pages (§B4.5). The mockup also shows a sentence under each topic
 * heading, but `Faq` has only `topic: String` with no description column, so those
 * blurbs live in the map below rather than in the database. A topic with no entry here
 * still renders; it just gets no blurb.
 *
 * `isActive: true` is passed explicitly — the admin list shows deactivated entries by
 * design, so omitting it would publish them.
 */

const TOPIC_BLURBS: Record<string, string> = {
  "Orders & Shopping": "How to place an order, modify it, and what made-to-order means.",
  "Shipping & Delivery": "Information about shipping methods, delivery times, and international orders.",
  "Returns & Exchanges": "What can be returned, and under which conditions.",
  "Sizing & Fit": "Finding your size, and asking for a custom fit.",
  "Product & Care": "Fabrics, craftsmanship, and looking after your pieces.",
  Payment: "Accepted methods, confirmation, and receipts.",
};

export const FaqContent = () => {
  const locale = useApiLocale();

  const { data, isLoading, isError } = faqsApi.useGetFaqs<{ success: boolean; data: Faq[] }>({
    key: ["public-faqs", locale],
    params: { locale },
    isActive: true,
  });

  // Grouped in arrival order, which the API already sorts by topic then creation —
  // so a Map preserves both without a second sort. The `?? []` lives inside the memo:
  // outside it, a fresh array literal on every render would defeat the memo entirely.
  const groups = React.useMemo(() => {
    const map = new Map<string, Faq[]>();
    (data?.data ?? []).forEach((faq) => {
      const list = map.get(faq.topic) ?? [];
      list.push(faq);
      map.set(faq.topic, list);
    });
    return Array.from(map.entries());
  }, [data?.data]);

  return (
    <>
      <Container id="content" className="py-14 space-y-12 scroll-mt-40">
        {isLoading ? (
          <StoreSkeletonGrid count={4} />
        ) : isError ? (
          <StoreEmptyState title="We could not load the FAQ" description="Something went wrong on our side. Please try again in a moment." />
        ) : groups.length === 0 ? (
          <StoreEmptyState title="No questions published yet" description="Message us directly and we will answer personally." />
        ) : (
          groups.map(([topic, entries]) => (
            <section key={topic} className="space-y-5">
              <SectionHeading variant="title" title={topic} description={TOPIC_BLURBS[topic]} />

              <div className="space-y-2">
                {entries.map((faq, index) => (
                  <AccordionItem key={faq.id} title={faq.question ?? ""} tone="filled" defaultOpen={index === 0}>
                    <RichText value={faq.answer} />
                  </AccordionItem>
                ))}
              </div>
            </section>
          ))
        )}
      </Container>

      <Container className="py-8">
        <PromoBanner
          title="Still Have a Question?"
          description="Our team answers within 1–2 business days."
          href="/customer-care/contact-us"
          cta="Contact Us"
          image="/images/contact-us-header-background.webp"
        />
      </Container>
    </>
  );
};
