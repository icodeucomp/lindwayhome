import { ArticleForm } from "@/components/ui/admin";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ArticleForm articleId={id} />;
}
