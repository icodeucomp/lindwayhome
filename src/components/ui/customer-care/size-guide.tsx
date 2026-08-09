"use client";

import { Container, Img } from "@/components";

import { useApiLocale } from "@/hooks";

import { PromoBanner, SectionHeading, StoreEmptyState, StoreSkeletonGrid } from "@/components/ui/storefront";

import { sizeGuidesApi } from "@/utils";

import type { ApiResponse, SizeGuide } from "@/types";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * Public size guide (reference/Size Guide.png).
 *
 * **Deliberately a flat list, not the mockup's tabs.** The mockup groups guides under
 * Women / Men / Baby & Kids and then again under Kebaya / Batik Skirts, but D21 removed
 * grouping from `SizeGuide` on purpose — a `group` column would be a second source of
 * truth beside the translated title, and D1 specifies a flat list ordered by `order`.
 * Reinstating the tabs is a schema change, not a layout one.
 *
 * `published=true` is what makes a guide public; `publishedAt = null` is the draft
 * switch (D1), and there is no `isActive` beside it.
 */

const measurementTips = [
  "Bust - Measure around the fullest part of your chest.",
  "Waist - Measure at the narrowest part of your waist.",
  "Hips - Measure around the widest part of your hips.",
  "Shoulders - From edge to edge, across the back.",
  "Arm Length - From shoulder to wrist for long sleeves.",
  "Skirt Length - From waistline down to desired length.",
];

export const SizeGuideContent = () => {
  const locale = useApiLocale();

  const { data, isLoading, isError } = sizeGuidesApi.useGetSizeGuides<ApiResponse<SizeGuide[]>>({
    key: ["public-size-guides", locale],
    params: { locale, limit: 50, page: 1 },
    published: true,
  });

  const guides = data?.data ?? [];

  return (
    <>
      <Container id="content" className="py-14 scroll-mt-40">
        <p className="max-w-4xl text-xl leading-snug font-heading text-body">Explore our guide below to help you choose the size that fits you best—or reach out for a custom fit designed with you in mind.</p>
      </Container>

      <Container className="pb-8 space-y-12">
        {isLoading ? (
          <StoreSkeletonGrid count={2} />
        ) : isError ? (
          <StoreEmptyState title="We could not load the size guides" description="Something went wrong on our side. Please try again in a moment." />
        ) : guides.length === 0 ? (
          <StoreEmptyState title="No size guides published yet" description="Message us and we will send the measurements for any piece." />
        ) : (
          guides.map((guide) => {
            // Rows are ordered by `size.order` — there is no row-level order column,
            // so there is only ever one ordering source (D21).
            const rows = [...(guide.rows ?? [])].sort((a, b) => (a.size?.order ?? 0) - (b.size?.order ?? 0));
            const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row.measurements ?? {}))));

            return (
              <section key={guide.id} className="space-y-4">
                <SectionHeading variant="title" title={guide.title ?? "Size Guide"} description={guide.description ?? undefined} />

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-125">
                    <thead>
                      <tr>
                        <th className="p-3 text-left border border-border" />
                        {rows.map((row) => (
                          <th key={row.id} className="p-3 font-medium text-center border border-border text-body">
                            {row.size?.code}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((key, index) => (
                        <tr key={key}>
                          <td className="p-3 font-medium border border-border text-body">
                            {index + 1}. {guide.parameterLabels?.[key] ?? key}
                          </td>
                          {rows.map((row) => (
                            <td key={`${row.id}-${key}`} className="p-3 text-center border border-border text-body">
                              {row.measurements?.[key] ?? "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })
        )}
      </Container>

      <Container className="grid grid-cols-1 gap-10 py-8 lg:grid-cols-2">
        <Img src={PLACEHOLDER_IMAGE} alt="Measuring a garment" className="w-full aspect-4/3 bg-footer/30" cover />

        <div className="space-y-4 text-sm text-body">
          <p>*Most of our garments follow a tailored silhouette. If you&apos;re between sizes or prefer a looser fit, we recommend sizing up. Many of our skirts include an adjustable or elastic waistband for comfort.</p>

          <div className="space-y-2">
            <h3 className="text-base font-heading text-primary">How to Measure</h3>
            <p>No measuring tape? No problem. Here&apos;s a quick guide to help you get it right:</p>
            <ul className="pl-5 space-y-1 list-disc">
              {measurementTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>

          <p className="italic text-body/80">Tip: Keep the tape comfortably snug—not tight.</p>
        </div>
      </Container>

      <Container className="py-8">
        <PromoBanner
          title="Learn How to Shop"
          description="From browsing to checkout, and where to reach us if you get stuck."
          href="/customer-care/how-to-shop"
          cta="Discover Now"
          image={PLACEHOLDER_IMAGE}
        />
      </Container>
    </>
  );
};
