import { Container, Img } from "@/components";

import { ArrowLink, Eyebrow, SectionHeading, StoreLinkButton } from "@/components/ui/storefront";

import { BestSellersCarousel } from "@/components/ui/catalog";

import { LABELS, WORLD_SECTIONS, type WorldSectionKey } from "@/static/our-world";

import { brandBySlug } from "@/static/taxonomy";

import { socialLinks } from "@/static/navigation";

import type { Dictionary } from "@/i18n/get-dictionary";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Our World" — the house-level story (client wording document, 10 sections).
 *
 * The order is the document's, and it is an argument rather than a list: who we are →
 * how we make → where we come from → what our labels are → what we use → who wears it →
 * who we work with → how we choose to make → the stories behind it → an open ending.
 *
 * Alternating image/text for the editorial sections, so the page reads as a scroll
 * rather than a stack of identical blocks. Sections 4 and 7 break the rhythm on purpose:
 * they carry lists, and the change of shape is what marks them as different in kind.
 *
 * **Lindway × AWP appears only in §7.** The document is explicit that it is a
 * collaboration, not a permanent label. Nothing in the schema says so — it is an
 * ordinary `BrandType` — so the distinction is made here, in what each section is
 * allowed to show. See the note in `static/our-world.ts`.
 */

const sectionByKey = (key: WorldSectionKey) => WORLD_SECTIONS.find((section) => section.key === key)!;

/** Internal paths go through LocaleLink; the one external link is Instagram. */
const Cta = ({ href, children }: { href: string; children: React.ReactNode }) =>
  href === "instagram" ? (
    <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-heading uppercase tracking-[0.14em] text-primary hover:gap-3">
      {children} <span aria-hidden>&rarr;</span>
    </a>
  ) : (
    <ArrowLink href={href}>{children}</ArrowLink>
  );

/** The repeated editorial block: eyebrow, title, two paragraphs, a link, and an image. */
const Editorial = ({ copy, section, flip }: { copy: Dictionary["pages"]["ourWorld"]["sections"]["craft"]; section: (typeof WORLD_SECTIONS)[number]; flip?: boolean }) => (
  <Container id={section.id} className="grid items-center grid-cols-1 gap-10 py-16 lg:grid-cols-2 scroll-mt-40">
    <div className={`space-y-4 ${flip ? "lg:order-2" : ""}`}>
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <h2 className="text-3xl font-heading text-primary">{copy.title}</h2>
      <p className="leading-relaxed text-body">{copy.body}</p>
      {copy.body2 && <p className="text-sm leading-relaxed text-body/80">{copy.body2}</p>}
      <div className="pt-2">
        <Cta href={section.href}>{copy.cta}</Cta>
      </div>
    </div>

    <Img src={PLACEHOLDER_IMAGE} alt={copy.title} className={`w-full aspect-4/3 bg-footer/30 ${flip ? "lg:order-1" : ""}`} cover />
  </Container>
);

export const OurWorld = ({ dictionary: t }: { dictionary: Dictionary }) => {
  const copy = t.pages.ourWorld;
  const s = copy.sections;

  return (
    <>
      {/* §1 — the opener sets out the house, then hands the reader to the first section
          rather than sending them off-site before they have read anything. */}
      <Container id={sectionByKey("opener").id} className="max-w-4xl py-20 space-y-5 text-center scroll-mt-40">
        <Eyebrow>{s.opener.eyebrow}</Eyebrow>
        <h1 className="text-4xl leading-tight font-heading text-primary sm:text-5xl">{s.opener.title}</h1>
        <p className="leading-relaxed text-body">{s.opener.body}</p>
        <p className="text-sm leading-relaxed text-body/80">{s.opener.body2}</p>
        <div className="pt-2">
          <Cta href={sectionByKey("opener").href}>{s.opener.cta}</Cta>
        </div>
      </Container>

      {/* §2, §3 */}
      <Editorial copy={s.craft} section={sectionByKey("craft")} />
      <div className="bg-muted">
        <Editorial copy={s.artistry} section={sectionByKey("artistry")} flip />
      </div>

      {/* §4 — the four permanent labels. AWP is deliberately absent. */}
      <Container id={sectionByKey("labels").id} className="py-16 space-y-8 scroll-mt-40">
        <SectionHeading title={s.labels.title} description={s.labels.eyebrow} action={<Cta href={sectionByKey("labels").href}>{s.labels.cta}</Cta>} />

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {LABELS.map((label) => {
            const brand = brandBySlug(label.brandSlug);
            const text = copy.labels[label.key];

            return (
              <article key={label.key} className="space-y-3">
                <Img src={PLACEHOLDER_IMAGE} alt={text.name} className="w-full aspect-3/4 bg-footer/30" cover />
                <p className="text-lg uppercase font-heading text-primary tracking-[0.06em]">{text.name}</p>
                <p className="text-xs italic text-body/70">{text.tagline}</p>
                <p className="text-sm leading-relaxed text-body">{text.body}</p>
                {/* An inactive label has no collection page, so it renders as copy only
                    rather than as a link into a 404. */}
                {brand && <ArrowLink href={`/collections/${brand.slug}`}>{text.name}</ArrowLink>}
              </article>
            );
          })}
        </div>
      </Container>

      {/* §5, §6 */}
      <div className="bg-muted">
        <Editorial copy={s.materials} section={sectionByKey("materials")} />
      </div>
      <Editorial copy={s.stories} section={sectionByKey("stories")} flip />

      {/* §7 — collaborations, with AWP featured. Its own shape, because it is its own
          kind of thing: neither a label nor an editorial aside. */}
      <div className="bg-muted">
        <Container id={sectionByKey("collaborations").id} className="py-16 space-y-8 scroll-mt-40">
          <div className="max-w-3xl space-y-4">
            <Eyebrow>{s.collaborations.eyebrow}</Eyebrow>
            <h2 className="text-3xl font-heading text-primary">{s.collaborations.title}</h2>
            <p className="leading-relaxed text-body">{s.collaborations.body}</p>
            <p className="text-sm leading-relaxed text-body/80">{s.collaborations.body2}</p>
          </div>

          <div className="grid items-center grid-cols-1 gap-10 p-8 border border-border bg-light lg:grid-cols-2">
            <Img src={PLACEHOLDER_IMAGE} alt={copy.collaboration.awp.name} className="w-full aspect-4/3 bg-footer/30" cover />

            <div className="space-y-4">
              <p className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">{copy.collaboration.badge}</p>
              <h3 className="text-2xl uppercase font-heading text-primary tracking-[0.06em]">{copy.collaboration.awp.name}</h3>
              <p className="text-sm italic text-body/70">{copy.collaboration.awp.tagline}</p>
              <p className="text-sm leading-relaxed text-body">{copy.collaboration.awp.body}</p>
              <div className="pt-2">
                <Cta href={sectionByKey("collaborations").href}>{s.collaborations.cta}</Cta>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* §8, §9 */}
      <Editorial copy={s.making} section={sectionByKey("making")} />
      <div className="bg-muted">
        <Editorial copy={s.journal} section={sectionByKey("journal")} flip />
      </div>

      {/* §10 — an ending that opens rather than closes, and gives the reader somewhere
          to go. The closing line alone left a screen of empty page; the best sellers
          under it turn the end of the story into the start of a browse. */}
      <Container id={sectionByKey("closing").id} className="max-w-3xl pt-24 pb-4 space-y-6 text-center scroll-mt-40">
        <h2 className="text-3xl leading-tight font-heading text-primary sm:text-4xl">{s.closing.title}</h2>
      </Container>

      <BestSellersCarousel
        title={s.closing.heading}
        description={s.closing.description}
        emptyTitle={s.closing.emptyTitle}
        emptyDescription={s.closing.emptyDescription}
        cacheKey="our-world-best-sellers"
      />

      <Container className="flex justify-center pb-24">
        <StoreLinkButton href={sectionByKey("closing").href}>{s.closing.cta}</StoreLinkButton>
      </Container>
    </>
  );
};

