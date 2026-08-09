import { Container, Img, LocaleLink } from "@/components";

import { aboutNav, brandingNav, customerCareNav, shopNav, socialLinks } from "@/static/navigation";

import { PiEnvelopeSimple, PiFacebookLogo, PiInstagramLogo, PiWhatsappLogo } from "react-icons/pi";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * Storefront footer (reference/Homepage - LIndway.png, bottom).
 *
 * Brand block plus four link columns, with a photograph bleeding off the right edge —
 * decorative, so it is hidden below `lg` rather than being squeezed into the column
 * stack. The link columns come from `static/navigation.ts`, which derives Collections
 * from `taxonomy.ts` (D25), so an inactive branding disappears here automatically.
 */

const columns = [
  { title: "Collections", items: brandingNav },
  { title: "Shop", items: shopNav },
  { title: "Customer Care", items: customerCareNav },
  { title: "About", items: aboutNav },
];

const socials = [
  { href: socialLinks.email, label: "Email", icon: PiEnvelopeSimple },
  { href: socialLinks.whatsapp, label: "WhatsApp", icon: PiWhatsappLogo },
  { href: socialLinks.facebook, label: "Facebook", icon: PiFacebookLogo },
  { href: socialLinks.instagram, label: "Instagram", icon: PiInstagramLogo },
];

export const Footer = () => (
  <footer className="relative mt-auto overflow-hidden bg-footer text-body">
    {/* `Img` already positions itself `relative`; the absolute placement belongs on a
        wrapper, or the two position utilities collide and nothing renders. */}
    <div className="absolute inset-y-0 right-0 hidden w-1/4 lg:block">
      <Img src={PLACEHOLDER_IMAGE} alt="" className="w-full h-full" cover />
    </div>
    <div className="absolute inset-y-0 right-0 hidden w-1/3 lg:block bg-linear-to-r from-footer via-footer/80 to-transparent" />

    <Container className="relative grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-5 lg:pr-6">
        <LocaleLink href="/" aria-label="Lindway home">
          <Img src="/icons/dark-logo.png" alt="Lindway" className="h-14 w-36" cover />
        </LocaleLink>

        <p className="text-base font-heading">House of Artisanal Fashion</p>

        <p className="max-w-xs text-sm leading-relaxed text-body/80">
          Lindway is the parent house of distinctive brands—each with a unique story, yet united by a shared commitment to craftsmanship, cultural heritage, and design excellence.
        </p>

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

      {columns.map((column) => (
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
        <p>© {new Date().getFullYear()} Lindway. Jalan Hayam Wuruk Gang XVII No. 36 Denpasar Timur, Bali 80239, Indonesia</p>
        <menu className="flex items-center gap-6 list-none">
          <li>
            <LocaleLink href="/privacy-policy" className="transition-colors hover:text-primary">
              Privacy Policy
            </LocaleLink>
          </li>
          <li>
            <LocaleLink href="/terms-conditions" className="transition-colors hover:text-primary">
              Terms &amp; Conditions
            </LocaleLink>
          </li>
        </menu>
      </Container>
    </div>
  </footer>
);
