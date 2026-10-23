// Optional listing attributes the search filters work on. Stored values match
// the CHECK constraints in data/schema.sql; listings posted before a field
// existed have none and drop out only while that filter is on.

export const flatConfigurationOptions = [
  { value: "1rk", label: "1 RK" },
  { value: "1bhk", label: "1 BHK" },
  { value: "2bhk", label: "2 BHK" },
  { value: "3bhk", label: "3 BHK" },
] as const;

export const roomTypeOptions = [
  { value: "private", label: "Private room" },
  { value: "shared", label: "Shared room" },
] as const;

/** No value means the poster is open to anyone, so "any" is never stored. */
export const tenantPreferenceOptions = [
  { value: "students", label: "Students" },
  { value: "working-professionals", label: "Working professionals" },
] as const;

export type FlatConfiguration = (typeof flatConfigurationOptions)[number]["value"];
export type RoomType = (typeof roomTypeOptions)[number]["value"];
export type TenantPreference = (typeof tenantPreferenceOptions)[number]["value"];

type Option = { readonly value: string; readonly label: string };
const isOneOf = <T extends string>(options: readonly Option[]) => (value: unknown): value is T => options.some((option) => option.value === value);
const labelOf = (options: readonly Option[]) => (value?: string) => options.find((option) => option.value === value)?.label;

export const isFlatConfiguration = isOneOf<FlatConfiguration>(flatConfigurationOptions);
export const isRoomType = isOneOf<RoomType>(roomTypeOptions);
export const isTenantPreference = isOneOf<TenantPreference>(tenantPreferenceOptions);
export const flatConfigurationLabel = labelOf(flatConfigurationOptions);
export const roomTypeLabel = labelOf(roomTypeOptions);
export const tenantPreferenceLabel = labelOf(tenantPreferenceOptions);

/**
 * Amenity tags a poster can tick. `value` is what's stored in listings.tags —
 * WiFi and Power Backup keep their original spelling so older listings still match.
 */
export const listingAmenities = [
  { value: "WiFi", label: "Wi-Fi" },
  { value: "AC", label: "AC" },
  { value: "Parking", label: "Parking" },
  { value: "Washing Machine & Fridge", label: "Washing machine & fridge" },
  { value: "Power Backup", label: "Power backup" },
  { value: "Kitchen", label: "Kitchen" },
  { value: "Lift", label: "Lift" },
] as const;

/** The amenity tags offered as search filters ("Furnished" is filtered via listings.furnishing). */
export const searchableAmenities = listingAmenities.filter((amenity) => !["Kitchen", "Lift"].includes(amenity.value));
