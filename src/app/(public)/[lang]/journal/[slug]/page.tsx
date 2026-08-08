import { ArticleDetail } from "@/components/ui/journal";

/** Articles are addressed by slug on public routes and by id in admin (D4). */
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArticleDetail slug={slug} />;
}
