/**
 * MDR (Medical Device Regulation) class color styles
 * Shared across badges and filters for consistent styling
 */
export const MDR_CLASS_STYLES = {
  I: {
    badge: "bg-green-100 text-green-700 border-green-200",
    filter: "bg-green-100 text-green-700",
  },
  IIa: {
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    filter: "bg-yellow-100 text-yellow-700",
  },
  IIb: {
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    filter: "bg-orange-100 text-orange-700",
  },
  III: {
    badge: "bg-red-100 text-red-700 border-red-200",
    filter: "bg-red-100 text-red-700",
  },
} as const;

export type MdrClass = keyof typeof MDR_CLASS_STYLES;
