"use client";

import { notFound } from "next/navigation";

import { Container, Img, RichText } from "@/components";

import { useApiLocale } from "@/hooks";

import { ArticleCard, Breadcrumb, IMAGE_FALLBACK, SectionHeading, StoreSkeletonGrid } from "@/components/ui/storefront";

import { articlesApi, convertDate } from "@/utils";

import type { ApiResponse, Article } from "@/types";

/**
 * Article detail.
 *
 * There is no mockup for this page — `reference/Journal.png` only covers the index — so
 * the layout is composed from the kit rather than traced: the same breadcrumb, meta and
 * heading treatment as the rest of the storefront, over a single measure-limited
 * column. Body copy is `ArticleTranslation.content`, rendered by the JSON walker rather
 * than injected as HTML (§E6).
 */
export const ArticleDetail = ({ slug }: { slug: string }) => {
  const locale = useApiLocale();

  const { data, isLoading, isError } = articlesApi.useGetArticle<{ success: boolean; data: Article }>({
    key: ["article", slug, locale],
    id: slug,
    params: { locale },
  });

  const article = data?.data;

  const { data: relatedData } = articlesApi.useGetArticles<ApiResponse<Article[]>>({
    key: ["article-related", article?.categoryId ?? "", locale],
    params: { locale, published: "true", categoryId: article?.categoryId, limit: 5, page: 1 },
    enabled: Boolean(article?.categoryId),
  });

  if (isLoading) {
    return (
      <Container className="py-16">
        <StoreSkeletonGrid count={4} />
      </Container>
    );
  }

  // A draft has `publishedAt: null` and must 404 publicly, exactly like a missing slug —
  // the detail route serves drafts so the admin preview works.
  if (isError || !article || !article.publishedAt) notFound();

  const related = (relatedData?.data ?? []).filter((item) => item.id !== article.id).slice(0, 4);
  const published = convertDate(article.publishedAt);

  return (
    <>
      <Container className="pt-8">
        <Breadcrumb tone="dark" items={[{ name: "Home", href: "/" }, { name: "Journal", href: "/journal" }, { name: article.title || article.slug }]} />
      </Container>

      <Container className="max-w-3xl py-10 space-y-6">
        <header className="space-y-3">
          <p className="flex flex-wrap items-center text-xs gap-x-3 text-body/70">
            {published && <span>{published.toUpperCase()}</span>}
            {article.category?.name && (
              <>
                <span aria-hidden className="text-body/40">
                  &bull;
                </span>
                <span className="uppercase tracking-[0.1em]">{article.category.name}</span>
              </>
            )}
          </p>

          <h1 className="text-3xl leading-tight font-heading text-primary sm:text-4xl">{article.title || article.slug}</h1>

          {article.excerpt && <p className="text-base text-body/85">{article.excerpt}</p>}
        </header>

        <Img src={article.image?.url ?? IMAGE_FALLBACK} alt={article.imageAlt || article.title || article.slug} className="w-full aspect-16/9 bg-footer/30" cover />

        <RichText value={article.content} className="text-body leading-relaxed [&_h2]:pt-4 [&_h2]:text-2xl [&_h3]:pt-2 [&_h3]:text-xl" />
      </Container>

      {related.length > 0 && (
        <Container className="py-16 space-y-8">
          <SectionHeading title="More From The Journal" description="Keep reading." />
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {related.map((item) => (
              <ArticleCard key={item.id} article={item} />
            ))}
          </div>
        </Container>
      )}
    </>
  );
};
