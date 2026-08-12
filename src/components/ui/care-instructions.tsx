import { Container } from "@/components";

import { FeatureCard, SectionHeading } from "@/components/ui/storefront";

import type { Dictionary } from "@/i18n/get-dictionary";

import { PiDrop, PiSnowflake, PiHandSoap, PiHandsClapping, PiPaintBucket, PiWind, PiThermometer, PiProhibit, PiTShirt } from "react-icons/pi";

/**
 * "Care Instructions" (reference/Care Instructions.png).
 *
 * v1's bulleted list became a nine-card grid, one card per instruction, matching the
 * mockup.
 *
 * Only the icon and the dictionary key live here — the copy is in `pages.careInstructions.items`.
 * Keyed rather than zipped against a parallel array of strings: a key that goes missing
 * is a compile error naming it, where a mismatched array length would silently pair the
 * wrong icon with the wrong instruction.
 */

type InstructionKey = keyof Dictionary["pages"]["careInstructions"]["items"];

const instructions: { key: InstructionKey; icon: React.ReactNode }[] = [
  { key: "washBeforeFirstWear", icon: <PiTShirt /> },
  { key: "washInsideOut", icon: <PiDrop /> },
  { key: "gentleColdWater", icon: <PiSnowflake /> },
  { key: "handWashOnly", icon: <PiHandsClapping /> },
  { key: "mildDetergent", icon: <PiHandSoap /> },
  { key: "noBleach", icon: <PiPaintBucket /> },
  { key: "noTumbleDry", icon: <PiWind /> },
  { key: "warmIron", icon: <PiThermometer /> },
  { key: "noDryClean", icon: <PiProhibit /> },
];

export const CareInstructions = ({ dictionary: t }: { dictionary: Dictionary }) => {
  const copy = t.pages.careInstructions;

  return (
    <Container id="content" className="py-16 space-y-8 scroll-mt-40">
      <SectionHeading title={copy.heading} description={copy.headingDescription} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {instructions.map((instruction) => (
          <FeatureCard key={instruction.key} item={{ icon: instruction.icon, ...copy.items[instruction.key] }} />
        ))}
      </div>
    </Container>
  );
};
