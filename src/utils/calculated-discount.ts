import { DiscountType } from "@/types";

interface PriceProps {
  basePrice: number;
  shipping: number;
  tax: number;
  taxType: DiscountType;
  promo: number;
  promoType: DiscountType;
  member: number;
  memberType: DiscountType;
}

export const calculateDiscountedPrice = (price: number, discount: number): number => {
  const safeDiscount = Math.min(100, Math.max(0, discount));
  const result = price - price * (safeDiscount / 100);
  return parseFloat(result.toFixed(2));
};

const applyAmount = (base: number, value: number, type: DiscountType, isDiscount: boolean = false): number => {
  const amount = type === "PERCENTAGE" ? (base * value) / 100 : value;
  return isDiscount ? -amount : amount;
};

export const calculateTotalPrice = ({ basePrice, shipping, tax, taxType, promo, promoType, member, memberType }: PriceProps): number => {
  const taxAmount = applyAmount(basePrice, tax, taxType);
  const promoAmount = applyAmount(basePrice, promo, promoType, true);
  const memberAmount = applyAmount(basePrice, member, memberType, true);

  return basePrice + taxAmount + promoAmount + memberAmount + shipping;
};
