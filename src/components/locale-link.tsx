"use client";

import Link from "next/link";

import { ComponentProps } from "react";

import { useLocale } from "@/hooks";

import { withLocale } from "@/utils/locale-path";

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * Drop-in replacement for next/link on public routes. Prefixes the active locale so a
 * link never bounces through the middleware redirect and loses the reader's language.
 */
export const LocaleLink = ({ href, ...props }: LocaleLinkProps) => {
  const locale = useLocale();
  return <Link href={withLocale(locale, href)} {...props} />;
};
