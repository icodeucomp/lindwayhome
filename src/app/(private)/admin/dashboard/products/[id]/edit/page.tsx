import { EditProductDashboard } from "@/components/ui/admin";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditProductDashboard id={id} />;
}
