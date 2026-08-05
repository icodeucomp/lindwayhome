import { Prisma } from "prisma-client/client";

/**
 * Adapters between Zod-parsed payloads and Prisma create inputs.
 *
 * Two mismatches keep coming up and are worth solving once:
 *
 *  · Prisma's nullable `Json` columns accept `undefined` (leave unset) or
 *    `Prisma.DbNull`, but NOT plain `null` — which is exactly what Zod's
 *    `.nullish()` produces. Passing it through raises a type error at best and
 *    writes a JSON `null` literal at worst.
 *  · A nested `create` array is typed against the *checked* input, which wants a
 *    `size: { connect: … }` relation rather than a raw `sizeId`.
 */

type JsonInput = Record<string, unknown> | null | undefined;

const json = (value: JsonInput): Prisma.InputJsonValue | undefined => (value ? (value as Prisma.InputJsonValue) : undefined);

export interface VariantInput {
  sizeId: string;
  quantity: number;
  packageDimensions?: { weight_g: number; length_cm: number; width_cm: number; height_cm: number } | null;
}

export const toVariantCreate = (variant: VariantInput): Prisma.ProductVariantCreateWithoutProductInput => ({
  size: { connect: { id: variant.sizeId } },
  quantity: variant.quantity,
  packageDimensions: json(variant.packageDimensions as JsonInput),
});

export interface ProductTranslationInput {
  locale: "EN" | "ID";
  name: string;
  description?: JsonInput;
  notes?: JsonInput;
  fabricInformation?: JsonInput;
  shippingDelivery?: JsonInput;
  returnPolicy?: JsonInput;
}

export const toTranslationCreate = (translation: ProductTranslationInput): Prisma.ProductTranslationCreateWithoutProductInput => ({
  locale: translation.locale,
  name: translation.name,
  description: json(translation.description),
  notes: json(translation.notes),
  fabricInformation: json(translation.fabricInformation),
  shippingDelivery: json(translation.shippingDelivery),
  returnPolicy: json(translation.returnPolicy),
});
