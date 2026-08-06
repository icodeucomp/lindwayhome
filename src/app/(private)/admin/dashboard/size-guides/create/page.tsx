import { SizeGuideForm } from "@/components/ui/admin";

// `?from=<id>` is the F-38 fork: start from an existing guide, adjust the
// measurements, save as a new one.
export default async function CreateSizeGuidePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;

  return <SizeGuideForm duplicateFromId={from} />;
}
