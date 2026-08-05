/**
 * Size guide tables lifted verbatim out of the v1 hardcoded modals before those
 * components were deleted (women-modal.tsx, men-modal.tsx, baby-modal.tsx).
 *
 * These are real measurements the brand published, not sample data — the phase-1
 * seed turns each block into a `SizeGuide` + `SizeGuideRow` set (D1).
 *
 * `measurements` keys are stable identifiers. Their display labels are per-locale
 * and belong in SizeGuideTranslation.parameterLabels, not here.
 */

export interface SeedSizeGuide {
  /** EN title. v1's Women/Men/Baby grouping now lives in the title itself (D1). */
  title: string;
  description?: string;
  parameterLabels: { en: Record<string, string>; id: Record<string, string> };
  rows: { size: string; measurements: Record<string, number> }[];
}

export const SIZE_GUIDES: SeedSizeGuide[] = [
  {
    title: "Women — Kebaya",
    description: "For kebaya and fitted upper garments.",
    parameterLabels: {
      en: { bust: "Bust (cm)", hips: "Hips (cm)" },
      id: { bust: "Lingkar Dada (cm)", hips: "Lingkar Pinggul (cm)" },
    },
    rows: [
      { size: "XS", measurements: { bust: 86, hips: 96 } },
      { size: "S", measurements: { bust: 90, hips: 100 } },
      { size: "M", measurements: { bust: 94, hips: 104 } },
      { size: "L", measurements: { bust: 98, hips: 108 } },
      { size: "XL", measurements: { bust: 102, hips: 112 } },
      { size: "XXL", measurements: { bust: 106, hips: 116 } },
      { size: "XXXL", measurements: { bust: 110, hips: 120 } },
    ],
  },
  {
    title: "Women — Batik",
    description: "For batik skirts and wrapped lower garments.",
    parameterLabels: {
      en: { length: "Length (cm)", waist: "Waist (cm)", bottom_width: "Bottom Width (cm)" },
      id: { length: "Panjang (cm)", waist: "Lingkar Pinggang (cm)", bottom_width: "Lebar Bawah (cm)" },
    },
    rows: [
      { size: "XS", measurements: { length: 98, waist: 63, bottom_width: 140 } },
      { size: "S", measurements: { length: 100, waist: 66, bottom_width: 144 } },
      { size: "M", measurements: { length: 102, waist: 70, bottom_width: 148 } },
      { size: "L", measurements: { length: 104, waist: 74, bottom_width: 152 } },
      { size: "XL", measurements: { length: 106, waist: 78, bottom_width: 156 } },
      { size: "XXL", measurements: { length: 108, waist: 82, bottom_width: 160 } },
      { size: "XXXL", measurements: { length: 110, waist: 86, bottom_width: 164 } },
    ],
  },
  {
    title: "Men — Shirt & Everyday Wear",
    parameterLabels: {
      en: { bust: "Bust (cm)", hips: "Hips (cm)" },
      id: { bust: "Lingkar Dada (cm)", hips: "Lingkar Pinggul (cm)" },
    },
    rows: [
      { size: "XS", measurements: { bust: 119, hips: 112 } },
      { size: "S", measurements: { bust: 123, hips: 116 } },
      { size: "M", measurements: { bust: 127, hips: 120 } },
      { size: "L", measurements: { bust: 131, hips: 124 } },
      { size: "XL", measurements: { bust: 135, hips: 128 } },
      { size: "XXL", measurements: { bust: 139, hips: 132 } },
      { size: "XXXL", measurements: { bust: 143, hips: 136 } },
    ],
  },
  {
    // WARNING: these size codes are a different vocabulary from XS…XXXL. Every one
    // of them has to exist as a `Size` row AND have a matching `package_dimensions`
    // config key, or checkout returns 404 for any kids product. See CLAUDE.md §B4.2.
    title: "Baby & Kids",
    description: "Soft, breathable cotton tees designed for our littlest customers.",
    parameterLabels: {
      en: { height: "Height (cm)", weight: "Weight (kg)" },
      id: { height: "Tinggi (cm)", weight: "Berat (kg)" },
    },
    rows: [
      { size: "0000-NB", measurements: { height: 56, weight: 1.5 } },
      { size: "000-0-3M", measurements: { height: 62, weight: 3.5 } },
      { size: "00-3-6M", measurements: { height: 68, weight: 5.5 } },
      { size: "0-6-12M", measurements: { height: 76, weight: 6.5 } },
      { size: "1Y", measurements: { height: 78, weight: 9 } },
      { size: "2Y", measurements: { height: 92, weight: 12 } },
      { size: "3Y", measurements: { height: 95, weight: 14 } },
      { size: "4Y", measurements: { height: 100, weight: 16 } },
      { size: "5Y", measurements: { height: 112, weight: 18 } },
      { size: "6Y", measurements: { height: 115, weight: 20 } },
      { size: "7Y", measurements: { height: 122, weight: 22 } },
      { size: "8Y", measurements: { height: 128, weight: 25 } },
      { size: "9Y", measurements: { height: 133, weight: 29 } },
      { size: "10Y", measurements: { height: 138, weight: 33 } },
      { size: "11Y", measurements: { height: 144, weight: 37 } },
      { size: "12Y", measurements: { height: 152, weight: 41 } },
    ],
  },
];

/** Shown under every guide in v1; keep it on the public page. */
export const SIZE_GUIDE_NOTE = "Please note a 1-2cm size variation from the guide.";
