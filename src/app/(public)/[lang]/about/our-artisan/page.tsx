import { redirect } from "next/navigation";

/** Folded into the single About page. Kept so existing links and bookmarks resolve. */
export default async function OurArtisanPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  redirect(`/${lang}/about`);
}
