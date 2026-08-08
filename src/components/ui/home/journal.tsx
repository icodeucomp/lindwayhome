"use client";

import { Container } from "@/components";

import { useApiLocale } from "@/hooks";

import { ArrowLink, ArticleCard, SectionHeading, StoreSkeletonGrid } from "@/components/ui/storefront";

import { articlesApi } from "@/utils";

import type { ApiResponse, Article } from "@/types";

/**
 * The homepage Journal row (reference/Homepage - LIndway.png).
 *
 * `published: "true"` is not optional here — the admin list shows drafts by design
 * (§C4), so a storefront query that omits it would leak unfinished articles.
 */
export const Journal = ({ title = "Journal", description = "From special moments to everyday elegance." }: { title?: string; description?: string } = {}) => {
  const locale = useApiLocale();

  const { data, isLoading, isError } = articlesApi.useGetArticles<ApiResponse<Article[]>>({
    key: ["home-journal", locale],
    params: { locale, published: "true", limit: 4, page: 1, order: "desc" },
  });

  const articles = data?.data ?? [];

  if (!isLoading && (isError || articles.length === 0)) return null;

  return (
    <Container className="py-16 space-y-8">
      <SectionHeading title={title} description={description} action={<ArrowLink href="/journal">View All Stories</ArrowLink>} />

      {isLoading ? (
        <StoreSkeletonGrid count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </Container>
  );
};
