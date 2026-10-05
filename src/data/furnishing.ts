// Stored values match the CHECK constraint on listings.furnishing in
// data/schema.sql. Listings posted before the field existed have none.
export const furnishingOptions = [
  { value: "furnished", label: "Furnished" },
  { value: "semi-furnished", label: "Semi-furnished" },
  { value: "unfurnished", label: "Unfurnished" },
] as const;

export type Furnishing = (typeof furnishingOptions)[number]["value"];

export function isFurnishing(value: unknown): value is Furnishing {
  return furnishingOptions.some((option) => option.value === value);
}

export function furnishingLabel(value?: string): string | undefined {
  return furnishingOptions.find((option) => option.value === value)?.label;
}

/** Longest nearby-metro text accepted, matching listings.nearby_metro VARCHAR(120). */
export const nearbyMetroMaxLength = 120;

/** Trims and collapses whitespace; empty means "not provided". */
export function cleanNearbyMetro(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, nearbyMetroMaxLength);
  return cleaned || undefined;
}
