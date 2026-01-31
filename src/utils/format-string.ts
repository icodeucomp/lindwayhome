export const formatUnderscoreToDash = (str: string): string => {
  if (!str) return "";
  return str.toLowerCase().replace(/_/g, "-");
};

export const formatDashToUnderscore = (str: string): string => {
  if (!str) return "";
  return str.toUpperCase().replace(/-/g, "_");
};

export const formatSpaceToDash = (str: string): string => {
  if (!str) return "";
  return str.toLowerCase().replace(/ /g, "-");
};

export const formatDashToSpace = (str: string): string => {
  if (!str) return "";
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const formatUnderscoreToSpace = (str: string): string => {
  if (!str) return "";
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};
