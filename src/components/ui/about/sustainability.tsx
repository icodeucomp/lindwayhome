"use client";

import { Container, Img } from "@/components";

import { useApiLocale } from "@/hooks";

import { ArticleFeatureCard, SectionHeading, StoreSkeletonGrid } from "@/components/ui/storefront";

import { articlesApi } from "@/utils";

import type { ApiResponse, Article } from "@/types";

import { useDictionary } from "@/i18n/dictionary-provider";

import type { Dictionary } from "@/i18n/get-dictionary";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Sustainability" (reference/Sustainability.png).
 *
 * The closing "Beyond Sustainability" block is the Journal, not a second content model:
 * the mockup's cards carry a date and a category, which only `Article` has. It shows
 * the four most recent published pieces rather than filtering by category, because
 * category slugs are admin-editable and hardcoding one here would silently empty the
 * section the day someone renames it.
 */

type PillarKey = keyof Dictionary["pages"]["sustainability"]["pillars"];

const PILLARS: PillarKey[] = ["materials", "craftsmanship", "longevity"];

export const SustainabilityContent = () => {
  const t = useDictionary();
  const copy = t.pages.sustainability;

  const locale = useApiLocale();

  const { data, isLoading } = articlesApi.useGetArticles<ApiResponse<Article[]>>({
    key: ["sustainability-journal", locale],
    params: { locale, published: "true", limit: 4, page: 1, order: "desc" },
  });

  const articles = data?.data ?? [];

  return (
    <>
      <Container id="content" className="py-16 scroll-mt-40">
        <p className="max-w-4xl mx-auto text-2xl leading-snug text-center font-heading text-body">{copy.statement}</p>
      </Container>

      <Container className="py-8 space-y-8">
        <SectionHeading title={copy.pillarsHeading} description={copy.pillarsDescription} />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {PILLARS.map((key) => (
            <article key={key} className="space-y-3">
              <Img src={PLACEHOLDER_IMAGE} alt={copy.pillars[key].title} className="w-full aspect-4/5 bg-footer/30" cover />
              <h3 className="text-xl font-heading text-primary">{copy.pillars[key].title}</h3>
              <p className="text-sm leading-relaxed text-body">{copy.pillars[key].body}</p>
            </article>
          ))}
        </div>
      </Container>

      {(isLoading || articles.length > 0) && (
        <Container className="py-16 space-y-8">
          <SectionHeading title={copy.journalHeading} description={copy.journalDescription} />

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
