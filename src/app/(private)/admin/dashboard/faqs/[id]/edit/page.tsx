import { FaqForm } from "@/components/ui/admin";

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <FaqForm faqId={id} />;
}
