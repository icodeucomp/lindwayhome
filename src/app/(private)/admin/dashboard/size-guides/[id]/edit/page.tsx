import { SizeGuideForm } from "@/components/ui/admin";

export default async function EditSizeGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <SizeGuideForm guideId={id} />;
}
