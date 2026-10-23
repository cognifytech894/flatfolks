// Budgets are only ever what the visitor typed: never preset, guessed,
// prefilled or widened. One number, a monthly maximum, matched strictly.

/** Positive whole rupees, or undefined for anything else. */
function amount(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 ? Math.floor(number) : undefined;
}

/**
 * The visitor's max budget from a query string: `?budget=9500`. Old links
 * carried a range (`?budget=5000-10000`) or `?maxBudget=`; only their maximum
 * is kept. A minimum budget is never read.
 */
export function parseBudget(params: { budget?: string; maxBudget?: string }): number | undefined {
  const raw = (params.budget || "").trim();
  if (raw) return amount(raw.includes("-") ? raw.slice(raw.lastIndexOf("-") + 1) : raw);
  return amount(params.maxBudget);
}

/** The rent an owner typed on the flatmates pages: `?rent=8000`. */
export function parseRent(value?: string): number | undefined {
  return amount(value);
}

/** A room or flat fits when its rent is at most the budget; no budget means everything fits. */
export function withinBudget(listing: { rent: number }, budget?: number): boolean {
  return !budget || listing.rent <= budget;
}

/** A flat requirement can afford a rent when its max budget (stored as `rent`) is at least that much. */
export function affordsRent(requirement: { rent: number }, rent?: number): boolean {
  return !rent || requirement.rent >= rent;
}

export function rupees(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

/** How every monthly amount reads on cards and pages: "₹8,000/month". */
export function perMonth(value: number): string {
  return `${rupees(value)}/month`;
}
