export const formatIDR = (amount: number): string => {
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return `IDR ${formatted}`;
};
