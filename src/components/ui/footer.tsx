import { Container, Img, LocaleLink } from "@/components";

import { aboutNav, brandingNav, customerCareNav, shopNav, socialLinks } from "@/static/navigation";

const columns = [
  { title: "Collections", items: brandingNav },
  { title: "Shop", items: shopNav },
  { title: "Customer Care", items: customerCareNav },
  { title: "About", items: aboutNav },
];

export const Footer = () => {
  return (
    <footer className="mt-8 bg-footer text-body">
      <Container className="grid grid-cols-1 gap-10 py-12 lg:grid-cols-5">
        <div className="flex flex-col justify-between gap-8 lg:col-span-1">
          <LocaleLink href="/" className="mx-auto w-max lg:mx-0">
            <Img src="/icons/dark-logo.png" alt="lindway logo" className="h-14 min-w-36 max-w-36" cover />
          </LocaleLink>
          <div className="space-y-4">
            <p className="text-sm text-center lg:text-start">Jalan Hayam Wuruk Gang XVII No. 36 Denpasar Timur, Bali 80239, Indonesia</p>
            <menu className="flex items-center justify-center gap-4 list-none lg:justify-start">
              <li>
                <a href={socialLinks.maps} target="_blank" rel="noopener noreferrer">
                  <Img src="/icons/location-grey.svg" alt="location icons" className="size-6" />
                </a>
              </li>
              <li>
                <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer">
                  <Img src="/icons/whatsapp-grey.svg" alt="whatsapp icons" className="size-6" />
                </a>
              </li>
              <li>
                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                  <Img src="/icons/instagram-grey.svg" alt="instagram icons" className="size-6" />
                </a>
              </li>
              <li>
                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer">
                  <Img src="/icons/facebook-grey.svg" alt="facebook icons" className="size-6" />
                </a>
              </li>
            </menu>
          </div>
        </div>

        {columns.map((column) => (
          <div key={column.title} className="space-y-3">
            <p className="text-xs tracking-[0.2em] uppercase font-heading text-primary">{column.title}</p>
            <ul className="space-y-2 list-none">
              {column.items.map((item) => (
                <li key={`${column.title}-${item.href}`}>
                  <LocaleLink href={item.href} className="text-sm hover:text-primary">
                    {item.name}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <div className="border-t border-body/10">
        <Container className="py-4">
          <p className="text-xs text-center">© {new Date().getFullYear()} Lindway. All rights reserved.</p>
        </Container>
      </div>
    </footer>
  );
};
