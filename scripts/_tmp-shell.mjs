import fs from "node:fs";

/**
 * Header and footer moved into the [lang] layout, so every page that rendered its own
 * copy drops it — including the three heroes that wrapped the header inside a
 * background image, an arrangement the solid v2 header makes impossible.
 */
const edits = [
  // ---- pages: drop <Footer /> and its import, and the now-redundant <main> ----
  [
    "src/app/(public)/[lang]/page.tsx",
    'import { EverySnap, Footer } from "@/components/ui";',
    'import { EverySnap } from "@/components/ui";',
  ],
  [
    "src/app/(public)/[lang]/about/our-story/page.tsx",
    'import { Footer, EverySnap } from "@/components/ui";',
    'import { EverySnap } from "@/components/ui";',
  ],
  [
    "src/app/(public)/[lang]/about/our-fabrics/page.tsx",
    'import { Footer, EverySnap, Hero, OurFabrics } from "@/components/ui";',
    'import { EverySnap, Hero, OurFabrics } from "@/components/ui";',
  ],
  [
    "src/app/(public)/[lang]/customer-care/care-instructions/page.tsx",
    'import { Footer, EverySnap, Hero, CareInstructions } from "@/components/ui";',
    'import { EverySnap, Hero, CareInstructions } from "@/components/ui";',
  ],
  [
    "src/app/(public)/[lang]/customer-care/how-to-shop/page.tsx",
    'import { Footer, EverySnap, Hero, HowToShop } from "@/components/ui";',
    'import { EverySnap, Hero, HowToShop } from "@/components/ui";',
  ],
  [
    "src/app/(public)/[lang]/customer-care/return-exchanges/page.tsx",
    'import { Footer, EverySnap, ReturnExchanges, Hero } from "@/components/ui";',
    'import { EverySnap, ReturnExchanges, Hero } from "@/components/ui";',
  ],

  // ---- heroes: the header no longer floats over the image ----
  [
    "src/components/ui/hero.tsx",
    'import { Background, Container, Motion } from "@/components";\nimport { Header } from "@/components/ui";',
    'import { Background, Container, Motion } from "@/components";',
  ],
  ["src/components/ui/hero.tsx", "      <Header />\n      <Container className=\"pt-32", '      <Container className="pt-24'],
  [
    "src/components/ui/home/hero.tsx",
    'import { Background, Motion } from "@/components";\nimport { Header } from "@/components/ui";',
    'import { Background, Motion } from "@/components";',
  ],
  ["src/components/ui/home/hero.tsx", '      <Header />\n      <div className="w-full max-w-7xl px-4 pt-40', '      <div className="w-full max-w-7xl px-4 pt-28'],
];

let changed = 0;
for (const [file, from, to] of edits) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes(from)) throw new Error(`not found in ${file}:\n  ${from.slice(0, 90)}`);
  fs.writeFileSync(file, source.replace(from, to));
  changed += 1;
}

// `<main>` wrappers and stray <Footer /> tags, removed by line.
for (const file of [
  "src/app/(public)/[lang]/page.tsx",
  "src/app/(public)/[lang]/about/our-story/page.tsx",
  "src/app/(public)/[lang]/about/our-fabrics/page.tsx",
  "src/app/(public)/[lang]/customer-care/care-instructions/page.tsx",
  "src/app/(public)/[lang]/customer-care/how-to-shop/page.tsx",
  "src/app/(public)/[lang]/customer-care/return-exchanges/page.tsx",
]) {
  const source = fs.readFileSync(file, "utf8");
  const next = source
    .replace(/^\s*<Footer \/>\n/m, "")
    .replace(/^(\s*)return \(\n\s*<main>\n/m, "$1return (\n$1  <>\n")
    .replace(/^(\s*)<\/main>\n/m, "$1</>\n");
  if (next !== source) changed += 1;
  fs.writeFileSync(file, next);
}

console.log(`updated ${changed} spots`);
