import { Img, LocaleLink } from "@/components";

import { convertDate } from "@/utils";

import type { Article } from "@/types";

import { ArrowLink, IMAGE_FALLBACK } from "./ui";

/**
 * Journal cards (reference/Homepage §Journal, Journal.png).
 *
 * `compact` is the grid card — image above, meta below. `feature` is the wide
 * two-up card on the Journal page and the homepage "Featured Read" row, where the
 * meta sits over a darkened image.
 *
 * `title` is a resolved translation field, so it can legitimately be missing when a
 * locale has no row; the slug is the fallback rather than an empty heading.
 */

/** `convertDate` returns null for an empty string, so the date is filtered, not assumed. */
const meta = (article: Article) => [convertDate(article.publishedAt ?? article.createdAt)?.toUpperCase(), article.category?.name].filter(Boolean) as string[];

export const ArticleCard = ({ article }: { article: Article }) => (
  <article className="space-y-3 group">
    <LocaleLink href={`/journal/${article.slug}`} className="block overflow-hidden aspect-4/3 bg-footer/30">
      <Img src={article.image?.url ?? IMAGE_FALLBACK} alt={article.imageAlt || article.title || article.slug} className="w-full h-full transition-transform duration-700 group-hover:scale-105" cover />
    </LocaleLink>

    <LocaleLink href={`/journal/${article.slug}`} className="block text-base transition-colors font-heading text-primary hover:text-body">
      {article.title || article.slug}
    </LocaleLink>

    <p className="flex flex-wrap items-center text-xs gap-x-3 text-body/70">
      {meta(article).map((part, index) => (
        <span key={part} className="flex items-center gap-3">
          {index > 0 && <span aria-hidden className="text-body/40">&bull;</span>}
          <span className={index > 0 ? "uppercase tracking-[0.1em]" : ""}>{part}</span>
        </span>
      ))}
    </p>

    <ArrowLink href={`/journal/${article.slug}`}>Read More</ArrowLink>
  </article>
);

export const ArticleFeatureCard = ({ article }: { article: Article }) => (
  <article className="relative overflow-hidden group aspect-16/9 bg-footer/30">
    {/* Absolute placement goes on a wrapper — `Img` sets `relative` on its own root. */}
    <div className="absolute inset-0">
      <Img src={article.image?.url ?? IMAGE_FALLBACK} alt={article.imageAlt || article.title || article.slug} className="w-full h-full transition-transform duration-700 group-hover:scale-105" cover />
    </div>
    <div className="absolute inset-0 bg-linear-to-t from-body/80 via-body/25 to-transparent" />

    <div className="absolute inset-x-0 bottom-0 p-6 space-y-2 text-light">
      <p className="flex flex-wrap items-center text-xs gap-x-3 text-light/80">
        {meta(article).map((part, index) => (
          <span key={part} className="flex items-center gap-3">
            {index > 0 && <span aria-hidden className="text-light/50">&bull;</span>}
            <span className={index > 0 ? "uppercase tracking-[0.1em]" : ""}>{part}</span>
          </span>
        ))}
      </p>

      <LocaleLink href={`/journal/${article.slug}`} className="block text-xl font-heading">
        {article.title || article.slug}
      </LocaleLink>

      <ArrowLink href={`/journal/${article.slug}`} className="text-light">
        Read More
      </ArrowLink>
    </div>
  </article>
);
