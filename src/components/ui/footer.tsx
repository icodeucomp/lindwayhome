import { PiEnvelopeSimple, PiFacebookLogo, PiInstagramLogo, PiWhatsappLogo } from "react-icons/pi";

import { Container, Img, LocaleLink } from "@/components";

import { aboutNav, brandingNav, customerCareNav, legalNav, localizeNav, shopNav, socialLinks } from "@/static/navigation";

/**
 * Decorative still life on the right edge. One constant because it is the only piece of
 * the footer the client will want to swap — replace the path, nothing else.
 */
const DECOR_IMAGE = "/images/our-fabric-thoughtfully-image-1.webp";

/** Labels the layout hands down, so the footer speaks the reader's language (F-30). */
export interface FooterLabels {
  tagline: string;
  description: string;
  address: string;
  email: string;
  collections: string;
  shop: string;
  customerCare: string;
  about: string;
  /** Link labels keyed the way `localizeNav` expects — see navigation.ts. */
  aboutLinks: Record<string, string>;
  careLinks: Record<string, string>;
  shopLinks: Record<string, string>;
  legalLinks: Record<string, string>;
}

const LinkColumn = ({ title, items }: { title: string; items: { name: string; href: string }[] }) => (
  <div>
    <p className="font-heading text-sm font-semibold tracking-[0.14em] uppercase text-body">{title}</p>
    <ul className="mt-5 space-y-3 list-none">
      {items.map((item) => (
        <li key={`${title}-${item.href}`}>
          <LocaleLink href={item.href} className="text-sm duration-200 text-body/80 hover:text-primary">
            {item.name}
          </LocaleLink>
        </li>
      ))}
    </ul>
  </div>
);

const SocialLink = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => (
  <li>
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="block duration-200 text-body hover:text-primary">
      {icon}
    </a>
  </li>
);

export const Footer = ({ labels }: { labels: FooterLabels }) => {
  const columns = [
    { title: labels.collections, items: brandingNav },
    { title: labels.shop, items: localizeNav(shopNav, labels.shopLinks) },
    { title: labels.customerCare, items: localizeNav(customerCareNav, labels.careLinks) },
    { title: labels.about, items: localizeNav(aboutNav, labels.aboutLinks) },
  ];

  return (
    <footer className="bg-footer text-body">
      {/* Only this section is a positioning context, so the still life stops above the
          bottom bar rather than showing through behind the copyright line. */}
      <div className="relative overflow-hidden">
        {/* The photo bleeds to the viewport edge, so it sits outside Container. It is
            decorative — aria-hidden, and gone below xl, where there is no room for it
            beside four link columns. */}
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-2/5 xl:block">
          <Img src={DECOR_IMAGE} alt="" className="w-full h-full" cover />
          {/* Fades the photo into the footer colour rather than butting against it. */}
          <div className="absolute inset-0 bg-linear-to-r from-footer via-footer/70 to-transparent" />
        </div>

        <Container className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))] lg:gap-8">
          <div className="max-w-sm">
            <LocaleLink href="/" aria-label="Lindway home" className="block w-max">
              <Img src="/icons/dark-logo.png" alt="Lindway" className="w-31.5 h-21" cover />
            </LocaleLink>

            <p className="mt-8 font-heading text-lg font-semibold text-body">{labels.tagline}</p>
            <p className="mt-3 text-sm leading-relaxed text-body/80">{labels.description}</p>

            <ul className="flex items-center gap-5 mt-8 list-none">
              {/* The envelope points at the contact form rather than a mailto: — the form
                  records an inquiry the admin inbox can track (F-47); a raw address does not. */}
              <li>
                <LocaleLink href="/customer-care/contact-us" aria-label={labels.email} title={labels.email} className="block duration-200 text-body hover:text-primary">
                  <PiEnvelopeSimple className="size-6" />
                </LocaleLink>
              </li>
              <SocialLink href={socialLinks.whatsapp} label="WhatsApp" icon={<PiWhatsappLogo className="size-6" />} />
              <SocialLink href={socialLinks.facebook} label="Facebook" icon={<PiFacebookLogo className="size-6" />} />
              <SocialLink href={socialLinks.instagram} label="Instagram" icon={<PiInstagramLogo className="size-6" />} />
            </ul>
          </div>

          {columns.map((column) => (
            <LinkColumn key={column.title} title={column.title} items={column.items} />
          ))}
        </Container>
      </div>

      <div className="border-t border-body/10">
        <Container className="flex flex-col items-center gap-3 py-5 text-xs sm:flex-row sm:justify-between text-body/80">
          <p className="text-center sm:text-start">
            © {new Date().getFullYear()} Lindway. {labels.address}
          </p>
          <ul className="flex items-center gap-8 list-none">
            {localizeNav(legalNav, labels.legalLinks).map((item) => (
              <li key={item.href}>
                <LocaleLink href={item.href} className="duration-200 hover:text-primary">
                  {item.name}
                </LocaleLink>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </footer>
  );
};
