import { PagePlaceholder } from "@/components/ui";

import type { Metadata } from "next";

import { isLocale } from "@/i18n/config";

import { getDictionary } from "@/i18n/get-dictionary";

import { localizedMetadata } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  // The layout already 404s an unknown locale; metadata just declines to guess.
  if (!isLocale(lang)) return {};
  const t = await getDictionary(lang);
  return localizedMetadata(lang, "/privacy-policy", t.meta.privacyPolicy);
}

export default function PrivacyPolicyPage() {
  return <PagePlaceholder title="Privacy Policy" phase="phase 4 (Content)" />;
}
