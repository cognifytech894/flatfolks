import { AirVent, ArrowUpDown, BatteryCharging, Car, Check, CookingPot, WashingMachine, Wifi, type LucideIcon } from "lucide-react";
import { listingAmenities } from "@/data/listing-attributes";

// One icon per amenity tag (listings.tags); anything else gets a plain check.
const icons: Record<string, LucideIcon> = {
  WiFi: Wifi,
  AC: AirVent,
  Parking: Car,
  "Power Backup": BatteryCharging,
  "Washing Machine & Fridge": WashingMachine,
  Kitchen: CookingPot,
  Lift: ArrowUpDown,
};

export function AmenityIcon({ tag, className }: { tag: string; className?: string }) {
  const Icon = icons[tag] || Check;
  return <Icon className={className} aria-hidden />;
}

/** How a stored tag reads: "WiFi" → "Wi-Fi". */
export function amenityLabel(tag: string): string {
  return listingAmenities.find((amenity) => amenity.value === tag)?.label || tag;
}
