import { existsSync } from "node:fs";

const src = new URL("../../src/", import.meta.url);

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = new URL(specifier.slice(2), src).href;
    const found = [".ts", ".tsx", "/index.ts"].map((ending) => new URL(base + ending)).find((url) => existsSync(url));
    if (found) return next(found.href, context);
  }
  return next(specifier, context);
}
