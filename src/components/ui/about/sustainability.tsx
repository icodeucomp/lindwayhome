"use client";

import { Container, Img } from "@/components";

import { useApiLocale } from "@/hooks";

import { ArticleFeatureCard, SectionHeading, StoreSkeletonGrid } from "@/components/ui/storefront";

import { articlesApi } from "@/utils";

import type { ApiResponse, Article } from "@/types";

/**
 * "Sustainability" (reference/Sustainability.png).
 *
 * The closing "Beyond Sustainability" block is the Journal, not a second content model:
 * the mockup's cards carry a date and a category, which only `Article` has. It shows
 * the four most recent published pieces rather than filtering by category, because
 * category slugs are admin-editable and hardcoding one here would silently empty the
 * section the day someone renames it.
 */

const pillars = [
  {
    title: "Thoughtful Materials",
    body: "We carefully select high-quality fabrics that are durable, comfortable, and made to be worn for years. Every material is chosen with longevity and responsible sourcing in mind.",
    image: "/images/home-conscious-initiatives-1.webp",
  },
  {
    title: "Timeless Craftsmanship",
    body: "Every Lindway piece is crafted with precision and care by skilled artisans, combining traditional techniques with refined construction to create garments that stand the test of time.",
    image: "/images/home-conscious-initiatives-2.webp",
  },
  {
    title: "Conscious Longevity",
    body: "We believe the most sustainable wardrobe is one built to last. By creating timeless designs instead of chasing trends, we encourage mindful purchasing and lasting wear.",
    image: "/images/home-conscious-initiatives-3.webp",
  },
];

export const SustainabilityContent = () => {
  const locale = useApiLocale();

  const { data, isLoading } = articlesApi.useGetArticles<ApiResponse<Article[]>>({
    key: ["sustainability-journal", locale],
    params: { locale, published: "true", limit: 4, page: 1, order: "desc" },
  });

  const articles = data?.data ?? [];

  return (
    <>
      <Container id="content" className="py-16 scroll-mt-40">
        <p className="max-w-4xl mx-auto text-2xl leading-snug text-center font-heading text-body">Fashion should leave something behind worth keeping—not unnecessary waste.</p>
      </Container>

      <Container className="py-8 space-y-8">
        <SectionHeading title="Our Sustainability Pillars" description="Our commitment to sustainability is built on thoughtful choices—from responsible materials and skilled craftsmanship to timeless designs made to last." />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="space-y-3">
              <Img src={pillar.image} alt={pillar.title} className="w-full aspect-4/5 bg-footer/30" cover />
              <h3 className="text-xl font-heading text-primary">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-body">{pillar.body}</p>
            </article>
          ))}
        </div>
      </Container>

      {(isLoading || articles.length > 0) && (
        <Container className="py-16 space-y-8">
          <SectionHeading title="Beyond Sustainability" description="Go beyond the label with editorial stories about craftsmanship, circular thinking, and the lasting value of timeless fashion." />

          {isLoading ? (
            <StoreSkeletonGrid count={4} />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {articles.map((article) => (
                <ArticleFeatureCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </Container>
      )}
    </>
  );
};
