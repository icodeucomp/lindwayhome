import Link from "next/link";

import { Container, Img } from "@/components";

import { navLists } from "@/static/navigation";

const featureLists = [
  {
    title: "My Lindway",
    href: "/my-lindway",
    menus: ["Discover the Brand"],
  },
  {
    title: "Simply Lindway",
    href: "/simply-lindway",
    menus: ["Discover the Brand"],
  },
  {
    title: "Lure by Lindway",
    href: "/lure-by-lindway",
    menus: ["Discover the Brand"],
  },
];

export const Footer = () => {
  return (
    <footer className="mt-8 shadow-footer text-gray">
      <Container className="grid grid-cols-1 gap-8 py-8 sm:grid-cols-2">
        <div className="flex flex-col justify-between space-y-12">
          <Link href="/" className="mx-auto w-max sm:mx-0">
            <Img src="/icons/dark-logo.png" alt="lindway logo" className="h-14 min-w-36 max-w-36" cover />
          </Link>
          <p className="text-sm text-center sm:text-start">© 2025 Lindway. Jalan Hayam Wuruk Gang XVII No. 36 Denpasar Timur, Bali 80239, Indonesia</p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 place-items-center sm:place-items-start">
            {featureLists.map((item, i) => (
              <div key={i} className="w-full px-4 space-y-2 text-sm sm:px-0">
                <p className="font-medium">{item.title}</p>
                {item.menus.map((menu, j) => (
                  <Link href={item.href} key={j}>
                    {menu}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 place-items-center sm:place-items-start">
            {navLists.map((item, index) => (
              <Link href={item.href} key={index} className="block w-full px-4 text-sm font-medium text-start sm:px-0">
                {item.name}
              </Link>
            ))}
          </div>
          <div className="pt-4 space-y-1 sm:pt-0">
            <p className="font-bold text-center sm:text-start">Reach out and follow us at</p>
            <menu className="flex items-center justify-center gap-4 list-none sm:justify-start">
              <li>
                <a href="https://maps.app.goo.gl/2pUxXSh99bSCWTtd6" target="_blank" rel="noopener noreferrer">
                  <Img src="/icons/location-grey.svg" alt="location icons" className="size-7" />
                </a>
              </li>
              <li>
                <a href="https://api.whatsapp.com/send?phone=6282339936682" target="_blank" rel="noopener noreferrer">
                  <Img src="/icons/whatsapp-grey.svg" alt="whatsapp icons" className="size-7" />
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/mylindway" target="_blank" rel="noopener noreferrer">
                  <Img src="/icons/instagram-grey.svg" alt="instagram icons" className="size-7" />
                </a>
              </li>
              <li>
                <a href="https://www.facebook.com/mylindwaybrand" target="_blank" rel="noopener noreferrer">
                  <Img src="/icons/facebook-grey.svg" alt="facebook icons" className="size-7" />
                </a>
              </li>
            </menu>
          </div>
        </div>
      </Container>
      <div className="w-full h-4 bg-gray"></div>
    </footer>
  );
};
