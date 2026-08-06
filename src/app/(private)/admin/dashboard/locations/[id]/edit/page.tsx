import { LocationForm } from "@/components/ui/admin";

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <LocationForm locationId={id} />;
}
