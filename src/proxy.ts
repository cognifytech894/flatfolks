import { NextResponse, type NextRequest } from "next/server";
import { isDeletedListing } from "@/lib/database";
import { isAllowedOrigin } from "@/lib/same-origin";

// A permanently deleted post's URL answers 410 Gone (not 404), which tells
// search engines the page is gone for good. Pages can't set a 410 status, so
// it's done here. Only URLs shaped like a listing ever reach the database.
const listingSlug = /^\/[a-z0-9-]+\/(?:[a-z0-9-]+\/)*[a-z0-9-]+-([0-9a-f]{8})$/;
const propertyId = /^\/property\/([0-9a-f-]{36})$/;

const goneHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>This post has been removed | FlatFolks</title></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:48px 16px"><main style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:32px">
<h1 style="margin:0 0 12px;font-size:26px">This post has been removed</h1><p style="color:#475569;line-height:1.6">It's no longer on FlatFolks. Find similar rooms and flatmates instead.</p>
<p><a href="/search" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">Search rooms and flatmates</a> &nbsp; <a href="/" style="color:#2563eb">Home</a></p></main></body></html>`;

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // API calls that change something must come from our own pages (CSRF).
  if (path.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    if (!isAllowedOrigin(request.headers.get("origin"), request.headers.get("host"))) {
      return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
    }
    return NextResponse.next();
  }
  const key = path.match(propertyId)?.[1] || path.match(listingSlug)?.[1];
  if (key && (await isDeletedListing(key).catch(() => false))) {
    return new NextResponse(goneHtml, { status: 410, headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
  }
  return NextResponse.next();
}

export const config = {
  // API calls (for the Origin check), and listing URLs: /property/{id} and
  // /{city}/.../{slug-xxxxxxxx}. Skips assets.
  matcher: ["/api/:path*", "/property/:id", "/((?!_next|api|blog|admin|auth|search|dashboard|profile|restore)[^/.]+)/:path+"],
};
