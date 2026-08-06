import { EmptyState, PageHeader } from "@/components/ui/admin/slicing";

// Rebuilt next against the new Product shape: size guide → variants → package
// dimensions, plus 5 Tiptap fields behind an EN | ID tab. The kit those screens
// compose from — form controls, list toolbar, pagination — is already in place.
export default function ProductsDashboardPage() {
  return (
    <>
      <PageHeader eyebrow="Catalog" title="Products" description="The catalog, its per-size variants and its translated content." />
      <EmptyState title="Not built yet" description="The product form and listing are the next piece of work. The admin design system they compose from now exists." />
    </>
  );
}
