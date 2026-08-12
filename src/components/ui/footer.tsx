import { Container, Img, LocaleLink } from "@/components";

import { aboutNav, brandNav, customerCareNav, localizeNav, shopNav, socialLinks } from "@/static/navigation";

import type { Dictionary } from "@/i18n/get-dictionary";

import { PiEnvelopeSimple, PiFacebookLogo, PiInstagramLogo, PiWhatsappLogo } from "react-icons/pi";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * Storefront footer (reference/Homepage - LIndway.png, bottom).
 *
 * Brand block plus four link columns, with a photograph bleeding off the right edge —
 * decorative, so it is hidden below `lg` rather than being squeezed into the column
 * stack. The link columns come from `static/navigation.ts`, which derives Collections
 * from `taxonomy.ts` (D25), so an inactive brand disappears here automatically.
 */

/**
 * Built per render rather than at module scope: the labels depend on the reader’s
 * language, and a module-level array would freeze whichever locale loaded first.
 * Brand, clothing and audience names stay English (D2), so only the two groups that
 * carry dictionary keys are swapped.
 */
const buildColumns = (t: Dictionary) => [
  { title: t.nav.collections, items: brandNav },
  { title: t.nav.shop, items: localizeNav(shopNav, t.nav) },
  { title: t.nav.customerCare, items: localizeNav(customerCareNav, t.customerCare) },
  { title: t.nav.about, items: localizeNav(aboutNav, { ...t.about, journal: t.nav.journal }) },
];

const socials = [
  { href: socialLinks.email, label: "Email", icon: PiEnvelopeSimple },
  { href: socialLinks.whatsapp, label: "WhatsApp", icon: PiWhatsappLogo },
  { href: socialLinks.facebook, label: "Facebook", icon: PiFacebookLogo },
  { href: socialLinks.instagram, label: "Instagram", icon: PiInstagramLogo },
];

export const Footer = ({ dictionary: t }: { dictionary: Dictionary }) => (
  <footer className="relative mt-auto overflow-hidden bg-footer text-body">
    {/* `Img` already positions itself `relative`; the absolute placement belongs on a
        wrapper, or the two position utilities collide and nothing renders. */}
    <div className="absolute inset-y-0 right-0 hidden w-1/4 lg:block">
      <Img src={PLACEHOLDER_IMAGE} alt="" className="w-full h-full" cover />
    </div>
    <div className="absolute inset-y-0 right-0 hidden w-1/3 lg:block bg-linear-to-r from-footer via-footer/80 to-transparent" />

    <Container className="relative grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-5 lg:pr-6">
        <LocaleLink href="/" aria-label={t.header.home}>
          <Img src="/icons/dark-logo.png" alt="Lindway" className="h-14 w-36" cover />
        </LocaleLink>

        <p className="text-base font-heading">{t.footer.tagline}</p>

        <p className="max-w-xs text-sm leading-relaxed text-body/80">{t.footer.description}</p>

        <menu className="flex items-center gap-4 list-none">
          {socials.map(({ href, label, icon: Icon }) => (
            <li key={label}>
              <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="block transition-colors text-body hover:text-primary">
                <Icon className="size-5" />
              </a>
            </li>
          ))}
        </menu>
      </div>

      {buildColumns(t).map((column) => (
        <div key={column.title} className="space-y-4">
          <p className="text-sm tracking-[0.14em] uppercase font-heading">{column.title}</p>
          <ul className="space-y-2.5 list-none">
            {column.items.map((item) => (
              <li key={`${column.title}-${item.href}`}>
                <LocaleLink href={item.href} className="text-sm transition-colors text-body/85 hover:text-primary">
                  {item.name}
                </LocaleLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Container>

    <div className="relative border-t border-body/10">
      <Container className="flex flex-col items-center justify-between gap-3 py-4 text-xs sm:flex-row text-body/80">
        <p>
          © {new Date().getFullYear()} Lindway. {t.footer.address}
        </p>
        <menu className="flex items-center gap-6 list-none">
          <li>
            <LocaleLink href="/privacy-policy" className="transition-colors hover:text-primary">
              {t.footer.privacyPolicy}
            </LocaleLink>
          </li>
          <li>
            <LocaleLink href="/terms-conditions" className="transition-colors hover:text-primary">
              {t.footer.termsConditions}
            </LocaleLink>
          </li>
        </menu>
      </Container>
    </div>
  </footer>
);
