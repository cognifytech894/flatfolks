// FlatFolks UI audit: screenshots, layout, tap targets, text, images, axe,
// console/network, internal links, mobile bottom nav, interactions, content
// claims and Lighthouse. Writes ui-audit/REPORT.md. Read-only by design:
// every non-GET request from the browser is blocked, and the local dev server
// is started with DISABLE_VIEW_TRACKING=1 so listing views aren't counted.
//
//   npm run ui-audit                                  # local dev server (started for you)
//   BASE_URL=https://flatfolks.in npm run ui-audit    # live site
//   SKIP_LIGHTHOUSE=1 npm run ui-audit                # faster re-run
//
// Note: against a remote BASE_URL the server counts listing-page views as usual.

import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const shotsDir = path.join(here, "screenshots");
const localPort = Number(process.env.AUDIT_PORT || 3100);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${localPort}`).replace(/\/$/, "");
const isLocal = !process.env.BASE_URL;

const viewports = [
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "mobile-360", width: 360, height: 800, mobile: true },
  { name: "tablet-768", width: 768, height: 1024, mobile: false },
  { name: "desktop-1440", width: 1440, height: 900, mobile: false },
];

// Which source file most likely renders each route (for the report).
const fileFor = (route) => {
  if (route === "/") return "src/app/page.tsx (+ src/components/home/*)";
  if (route.startsWith("/search")) return "src/app/search/page.tsx, src/components/search/*";
  if (route.startsWith("/flatmates")) return "src/app/flatmates/page.tsx, src/components/flatmates/*";
  if (route.startsWith("/property")) return "src/app/property/page.tsx";
  if (route.startsWith("/blog/")) return "src/app/blog/[slug]/page.tsx, src/data/blog.ts";
  if (route.startsWith("/blog")) return "src/app/blog/page.tsx";
  if (route.startsWith("/admin")) return "src/app/admin/login/page.tsx";
  if (route.startsWith("/auth")) return "src/app/auth/page.tsx";
  if (route.startsWith("/dashboard")) return "src/app/dashboard/page.tsx";
  if (["/about", "/contact", "/privacy-policy", "/terms"].includes(route)) return `src/app${route}/page.tsx`;
  if (route.startsWith("/listing:")) return "src/components/listing/listing-detail.tsx, photo-carousel.tsx";
  if (route === "/this-page-does-not-exist-404") return "src/app/not-found.tsx (missing → Next default)";
  return "src/components/seo/landing-page.tsx, src/lib/seo/*";
};

const issues = [];
const pageStats = new Map();
function addIssue(issue) {
  issues.push(issue);
  const key = `${issue.page}|${issue.viewport}`;
  const stat = pageStats.get(key) || { Critical: 0, High: 0, Medium: 0, Low: 0 };
  stat[issue.severity] += 1;
  pageStats.set(key, stat);
}

// ---------------------------------------------------------------- server ---
async function reachable(url) {
  try { return (await fetch(url, { redirect: "manual" })).status > 0; } catch { return false; }
}

async function startDevServer() {
  if (await reachable(BASE_URL)) throw new Error(`Port ${localPort} is already in use. Stop that server or set AUDIT_PORT.`);
  console.log(`Starting next dev on :${localPort} with DISABLE_VIEW_TRACKING=1 ...`);
  const child = spawn("npx", ["next", "dev", "-p", String(localPort)], {
    cwd: path.join(here, ".."), shell: true, stdio: "ignore",
    env: { ...process.env, DISABLE_VIEW_TRACKING: "1" },
  });
  for (let i = 0; i < 120; i++) {
    if (await reachable(BASE_URL)) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return child;
}

function stopServer(child) {
  if (!child) return;
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { shell: true });
  else child.kill("SIGTERM");
}

// ----------------------------------------------------------------- pages ---
async function firstSitemapPath(name) {
  try {
    const xml = await (await fetch(`${BASE_URL}/sitemap-${name}.xml`)).text();
    const loc = xml.match(/<loc>([^<]+)<\/loc>/)?.[1];
    return loc ? new URL(loc).pathname : undefined;
  } catch { return undefined; }
}

// Warm up dev-mode compilation so the first viewport isn't measured mid-compile.
async function warm(paths) {
  for (const p of paths) { try { await fetch(BASE_URL + p); } catch {} }
}

// ------------------------------------------------------------ in-page checks ---
function pageChecks({ mobile }) {
  const vw = window.innerWidth;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
    const text = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("alt") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `<${el.tagName.toLowerCase()}${id}${cls}>${text ? ` "${text}"` : ""}`;
  };
  // Inside a horizontal scroller (carousel, chip row) overflow is intended.
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
    }
    return false;
  };
  const out = {};

  // 1. Horizontal overflow
  out.docScrollWidth = document.documentElement.scrollWidth;
  out.overflowing = [];
  if (out.docScrollWidth > vw + 1) {
    for (const el of document.body.querySelectorAll("*")) {
      if (!visible(el) || inScroller(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) {
        // keep the deepest offenders only
        if (![...el.children].some((c) => c.getBoundingClientRect().right > vw + 1)) out.overflowing.push(`${describe(el)} right=${Math.round(r.right)}px`);
      }
      if (out.overflowing.length >= 8) break;
    }
  }

  // 2. Tap targets (mobile)
  out.smallTargets = [];
  out.crowdedTargets = [];
  if (mobile) {
    const targets = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], summary")].filter(visible);
    // A form control inside a <label> (or a box that focuses it on tap) is as big as that box.
    const hitBox = (el) => (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && el.closest("label, [data-tap-target]")) || el;
    const rects = targets.map((el) => ({ el, r: hitBox(el).getBoundingClientRect() }));
    for (const { el, r } of rects) {
      // Inline links inside running text are exempt (WCAG 2.5.8 inline exception).
      const inline = el.tagName === "A" && getComputedStyle(el).display === "inline" && el.parentElement && /^(P|LI|SPAN|SMALL)$/.test(el.parentElement.tagName);
      // A link stretched over its card with ::after covers the whole card.
      const stretched = getComputedStyle(el, "::after").position === "absolute";
      // Plain text links (no background or border: footer, breadcrumbs, "View all") need
      // 24px (WCAG 2.5.8); buttons, chips and form controls need 44px.
      const s = getComputedStyle(el);
      const textLink = (el.tagName === "A" || el.tagName === "SUMMARY") && s.backgroundColor === "rgba(0, 0, 0, 0)" && parseFloat(s.borderTopWidth) === 0;
      const min = textLink ? 24 : 44;
      if (!inline && !stretched && (r.width < min || r.height < min)) out.smallTargets.push(`${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)} (min ${min})`);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r, b = rects[j].r;
        if (rects[i].el.contains(rects[j].el) || rects[j].el.contains(rects[i].el)) continue;
        const gapX = Math.max(b.left - a.right, a.left - b.right);
        const gapY = Math.max(b.top - a.bottom, a.top - b.bottom);
        const gap = Math.max(gapX, gapY);
        if (gap >= 0 && gap < 8 && (a.height < 44 || b.height < 44)) out.crowdedTargets.push(`${describe(rects[i].el)} ↔ ${describe(rects[j].el)} (${Math.round(gap)}px)`);
      }
      if (out.crowdedTargets.length > 40) break;
    }
  }

  // 3. Text: tiny and clipped
  out.tinyText = [];
  out.clippedText = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const el = node.parentElement;
    if (!el || seen.has(el) || !node.textContent.trim() || !visible(el)) continue;
    seen.add(el);
    if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || el.closest(".sr-only") || el.getBoundingClientRect().width <= 1) continue;
    const s = getComputedStyle(el);
    if (mobile && parseFloat(s.fontSize) < 12) out.tinyText.push(`${describe(el)} ${s.fontSize}`);
    const clipsX = (s.overflow === "hidden" || s.overflowX === "hidden" || s.overflowX === "clip") && el.scrollWidth > el.clientWidth + 1;
    const clipsY = (s.overflow === "hidden" || s.overflowY === "hidden") && el.scrollHeight > el.clientHeight + 2 && !s.webkitLineClamp?.match(/\d/);
    if ((clipsX && s.textOverflow !== "ellipsis") || clipsY) out.clippedText.push(`${describe(el)} scroll ${el.scrollWidth}x${el.scrollHeight} > box ${el.clientWidth}x${el.clientHeight}`);
  }

  // 4. Images
  out.brokenImages = [];
  out.missingAlt = [];
  out.oversizedImages = [];
  const dpr = window.devicePixelRatio || 1;
  for (const img of document.querySelectorAll("img")) {
    const src = (img.currentSrc || img.src || "").slice(0, 140);
    if (!img.hasAttribute("alt")) out.missingAlt.push(src);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("loading") !== "lazy") out.brokenImages.push(src);
    const r = img.getBoundingClientRect();
    if (img.naturalWidth && r.width > 0 && img.naturalWidth > r.width * dpr * 2.5 && img.naturalWidth > 600) out.oversizedImages.push(`${src} natural ${img.naturalWidth}px vs shown ${Math.round(r.width)}px @${dpr}x`);
  }

  // 5. Mobile bottom nav
  const nav = document.querySelector('nav[aria-label="Main"]');
  if (nav && getComputedStyle(nav).position === "fixed" && visible(nav)) {
    const navRect = nav.getBoundingClientRect();
    const bodyPad = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
    const sheets = [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join(""); } catch { return ""; } }).join("");
    out.bottomNav = {
      height: Math.round(navRect.height),
      bodyPaddingBottom: bodyPad,
      safeAreaCss: sheets.includes("safe-area-inset-bottom"),
      viewportFitCover: /viewport-fit=cover/.test(document.querySelector('meta[name="viewport"]')?.content || ""),
    };
  }

  // 6. Text for content checks
  out.text = document.body.innerText;
  // Page content without the site chrome (header, bottom nav, footer), so e.g. the
  // nav's "Login" tab doesn't count as the page asking the visitor to log in.
  const content = document.body.cloneNode(true);
  content.querySelectorAll("header, nav, footer, script, style").forEach((el) => el.remove());
  out.contentText = content.textContent.replace(/\s+/g, " ");
  out.links = [...document.querySelectorAll("a[href]")].map((a) => a.href);
  out.hasTelOrWhatsApp = [...document.querySelectorAll("a[href]")].some((a) => /^tel:|wa\.me/.test(a.getAttribute("href") || ""));
  return out;
}

// ---------------------------------------------------------------- helpers ---
async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
}

// Hides the Next.js dev-mode indicator, which sits over the bottom nav's Home tab
// and intercepts clicks. It never ships to production.
const hideDevOverlay = () => {
  const style = document.createElement("style");
  style.textContent = "nextjs-portal{display:none!important}";
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
};

async function blockWrites(context, blocked) {
  await context.addInitScript(hideDevOverlay);
  return context.route("**/*", (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return route.continue();
    blocked.push(`${method} ${route.request().url()}`);
    return route.abort();
  });
}

const linkStatus = new Map();
async function checkLink(request, url) {
  if (linkStatus.has(url)) return linkStatus.get(url);
  let status;
  try { status = (await request.get(url, { maxRedirects: 5, timeout: 60000 })).status(); } catch (e) { status = `ERR ${e.message.split("\n")[0]}`; }
  linkStatus.set(url, status);
  return status;
}

const short = (list, n = 6) => list.slice(0, n).map((x) => `\`${String(x).replace(/`/g, "'")}\``).join(", ") + (list.length > n ? `, … (+${list.length - n} more)` : "");

// ----------------------------------------------------------------- main ---
async function main() {
  await rm(shotsDir, { recursive: true, force: true });
  await mkdir(shotsDir, { recursive: true });
  const server = isLocal ? await startDevServer() : undefined;
  const started = Date.now();
  try {
    const listingPath = await firstSitemapPath("listings");
    const blogPath = await firstSitemapPath("blog");
    const pages = [
      ["home", "/"], ["search", "/search"], ["flatmates", "/flatmates"], ["noida", "/noida"], ["greater-noida", "/greater-noida"],
      ["gaur-city-2", "/greater-noida/noida-extension/gaur-city-2"], ["gurgaon", "/gurgaon"], ["ghaziabad", "/ghaziabad"],
      ...(listingPath ? [["listing", listingPath]] : []),
      ["post-flat", "/property?intent=flat"], ["post-flatmate", "/property?intent=flatmate"], ["about", "/about"], ["blog", "/blog"],
      ...(blogPath ? [["blog-post", blogPath]] : []),
      ["privacy-policy", "/privacy-policy"], ["terms", "/terms"], ["contact", "/contact"], ["login", "/auth"], ["admin", "/admin"],
      ["not-found", "/this-page-does-not-exist-404"], ["dashboard-logged-out", "/dashboard"],
    ];
    if (!listingPath) addIssue({ severity: "High", page: "listing", viewport: "all", what: "No listing found in sitemap-listings.xml, so the listing page was not audited.", shot: "-", file: "src/lib/seo/sitemap.ts", fix: "Check the database connection / listing indexability." });
    console.log(`Warming ${pages.length} pages ...`);
    await warm(pages.map(([, p]) => p));

    const browser = await chromium.launch();
    const pageTexts = new Map();
    const allInternalLinks = new Map(); // url -> first page seen on
    const blocked = [];

    for (const vp of viewports) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1, isMobile: vp.mobile, hasTouch: vp.mobile });
      await blockWrites(context, blocked);
      for (const [name, route] of pages) {
        const label = name === "listing" ? `listing (${route})` : route;
        const shot = `${vp.name}_${name}.png`;
        const page = await context.newPage();
        const consoleErrors = [];
        const failed = [];
        page.on("console", (m) => { if (m.type() === "error" && !(name === "not-found" && /status of 404/.test(m.text()))) consoleErrors.push(m.text().slice(0, 200)); });
        page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`));
        page.on("response", (r) => {
          const u = r.url();
          if (r.status() >= 400 && !(name === "not-found" && u.includes("does-not-exist")) && !u.includes("/__nextjs") && !u.includes("webpack-hmr")) failed.push(`${r.status()} ${u.slice(0, 140)}`);
        });
        let response;
        try {
          response = await page.goto(BASE_URL + route, { waitUntil: "networkidle", timeout: 90000 });
        } catch (e) {
          addIssue({ severity: "Critical", page: label, viewport: vp.name, what: `Page failed to load: ${e.message.split("\n")[0]}`, shot: "-", file: fileFor(route), fix: "Check the server log for this route." });
          await page.close();
          continue;
        }
        const status = response?.status() ?? 0;
        const finalPath = new URL(page.url()).pathname;
        await scrollThrough(page);
        await page.screenshot({ path: path.join(shotsDir, shot), fullPage: true });
        const r = await page.evaluate(pageChecks, { mobile: vp.mobile });
        const file = name === "listing" ? fileFor("/listing:") : fileFor(route);
        const base = { page: label, viewport: vp.name, shot, file };

        if (name === "not-found") {
          if (status !== 404) addIssue({ ...base, severity: "High", what: `Non-existent URL returned ${status} instead of 404.`, fix: "Call notFound() for unknown routes." });
          if (!/not found|404|doesn.t exist/i.test(r.text)) addIssue({ ...base, severity: "Medium", what: "404 page has no clear 'not found' message.", fix: "Add src/app/not-found.tsx with a message and links home/search." });
          if (!r.links.some((l) => l.startsWith(BASE_URL))) addIssue({ ...base, severity: "Medium", what: "404 page offers no way back into the site (no internal links).", fix: "Add src/app/not-found.tsx using the site layout with Home / Search links." });
        } else if (name === "dashboard-logged-out") {
          const asksLogin = finalPath.startsWith("/auth") || /log ?in|sign ?in|login/i.test(r.contentText);
          if (!asksLogin) addIssue({ ...base, severity: "Critical", what: `Logged-out /dashboard renders the full dashboard (final URL ${finalPath}) without redirecting to or asking for login. Content: "${r.contentText.slice(0, 160).trim()}…"`, fix: "Redirect logged-out users to /auth?next=/dashboard on the server (cookies() + redirect in the page or proxy)." });
          else if (!finalPath.startsWith("/auth")) addIssue({ ...base, severity: "Low", what: `Logged-out /dashboard stays on ${finalPath} and shows a login prompt instead of redirecting.`, fix: "Optional: redirect to /auth?next=/dashboard for a cleaner flow." });
        } else if (status >= 400) {
          addIssue({ ...base, severity: "Critical", what: `Page returned HTTP ${status}.`, fix: "Fix the route or the data it depends on." });
        }

        if (r.docScrollWidth > vp.width + 1) addIssue({ ...base, severity: vp.mobile ? "High" : "Medium", what: `Page scrolls sideways: content is ${r.docScrollWidth}px wide in a ${vp.width}px viewport. Offenders: ${short(r.overflowing, 4) || "(not isolated)"}`, fix: "Constrain the offending element (max-w-full, min-w-0 on flex/grid children, break-words, overflow-x-auto on wide tables)." });
        if (r.smallTargets.length) addIssue({ ...base, severity: "Medium", what: `${r.smallTargets.length} tap target(s) smaller than 44×44px: ${short(r.smallTargets)}`, fix: "Give icon buttons/links min-h-11 min-w-11 (or padding) on mobile." });
        if (r.crowdedTargets.length) addIssue({ ...base, severity: "Low", what: `${r.crowdedTargets.length} pair(s) of small tap targets closer than 8px: ${short(r.crowdedTargets, 4)}`, fix: "Increase gap between adjacent small links/buttons on mobile." });
        if (r.tinyText.length) addIssue({ ...base, severity: "Medium", what: `${r.tinyText.length} text element(s) under 12px on mobile: ${short(r.tinyText)}`, fix: "Raise text-[10px]/text-[11px] to text-xs (12px) or larger below sm." });
        if (r.clippedText.length) addIssue({ ...base, severity: "Medium", what: `${r.clippedText.length} element(s) with text cut off by overflow:hidden (no ellipsis): ${short(r.clippedText, 4)}`, fix: "Allow wrapping, add truncate/line-clamp intentionally, or give the box more room." });
        if (r.brokenImages.length) addIssue({ ...base, severity: "High", what: `Broken image(s): ${short(r.brokenImages, 4)}`, fix: "Fix the image URL or add a fallback." });
        if (r.missingAlt.length) addIssue({ ...base, severity: "Medium", what: `${r.missingAlt.length} <img> without an alt attribute: ${short(r.missingAlt, 3)}`, fix: 'Add descriptive alt, or alt="" for decorative images.' });
        if (r.oversizedImages.length) addIssue({ ...base, severity: "Medium", what: `${r.oversizedImages.length} image(s) loaded much larger than displayed: ${short(r.oversizedImages, 3)}`, fix: "Pass an accurate `sizes` prop to next/image (or a smaller width param) for cards/thumbnails." });
        if (consoleErrors.length) addIssue({ ...base, severity: "Medium", what: `${consoleErrors.length} console error(s): ${short([...new Set(consoleErrors)], 3)}`, fix: "Fix the underlying error (hydration mismatch, failed fetch, etc.)." });
        const uniqFailed = [...new Set(failed)];
        if (uniqFailed.length) addIssue({ ...base, severity: uniqFailed.some((f) => f.startsWith("5")) ? "High" : "Medium", what: `${uniqFailed.length} failed network request(s): ${short(uniqFailed, 4)}`, fix: "Fix or remove the failing request." });
        if (vp.mobile && r.bottomNav) {
          const bn = r.bottomNav;
          if (bn.bodyPaddingBottom < bn.height - 1) addIssue({ ...base, severity: "High", what: `Bottom nav (${bn.height}px) is taller than the page's bottom padding (${bn.bodyPaddingBottom}px), so it covers the end of the page/footer.`, fix: "Match body padding-bottom to the nav height plus safe-area inset." });
          if (!bn.safeAreaCss || !bn.viewportFitCover) addIssue({ ...base, severity: "Medium", what: `Bottom nav safe-area handling incomplete (safe-area CSS: ${bn.safeAreaCss}, viewport-fit=cover: ${bn.viewportFitCover}).`, fix: "Use pb-[env(safe-area-inset-bottom)] and viewportFit: 'cover'." });
        }
        if (name === "listing" && r.hasTelOrWhatsApp) addIssue({ ...base, severity: "Critical", what: "Logged-out visitor can see Call/WhatsApp links (contact phone exposed).", fix: "Render contact actions only when isLoggedIn." });

        // axe (serious/critical only)
        try {
          const axe = await new AxeBuilder({ page }).analyze();
          for (const v of axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")) {
            addIssue({ ...base, severity: "High", what: `axe ${v.impact}: ${v.id} — ${v.help} (${v.nodes.length} node(s), e.g. ${short(v.nodes.map((n) => n.target.join(" ")), 3)})`, fix: v.helpUrl });
          }
        } catch (e) { console.warn("axe failed", label, e.message); }

        if (vp.name === "desktop-1440") pageTexts.set(label, r.text);
        for (const href of r.links) {
          try {
            const u = new URL(href);
            if (u.origin !== new URL(BASE_URL).origin || u.pathname.startsWith("/api/")) continue;
            u.hash = "";
            if (!allInternalLinks.has(u.href)) allInternalLinks.set(u.href, label);
          } catch {}
        }
        await page.close();
        console.log(`  ${vp.name} ${label} ✓`);
      }
      await context.close();
    }

    // Internal links (checked once each)
    console.log(`Checking ${allInternalLinks.size} internal links ...`);
    const req = await (await import("playwright")).request.newContext();
    for (const [url, from] of allInternalLinks) {
      const st = await checkLink(req, url);
      if (typeof st !== "number" || st >= 400) addIssue({ severity: "High", page: from, viewport: "all", what: `Broken internal link: ${url.replace(BASE_URL, "")} → ${st}`, shot: "-", file: fileFor(new URL(url).pathname), fix: "Fix the href or the target route." });
    }
    await req.dispose();

    await interactions(browser, listingPath, blocked);
    contentChecks(pageTexts);
    if (blocked.length) addIssue({ severity: "Low", page: "(audit)", viewport: "all", what: `Blocked ${blocked.length} write request(s) the pages tried to send during the audit: ${short([...new Set(blocked)], 4)}`, shot: "-", file: "-", fix: "Informational: these were aborted to keep the audit read-only." });
    await browser.close();

    const previous = process.env.REUSE_LIGHTHOUSE ? await import("node:fs/promises").then((fs) => fs.readFile(path.join(here, "issues.json"), "utf8")).then((s) => JSON.parse(s).lighthouse).catch(() => null) : null;
    const lighthouse = previous || (process.env.SKIP_LIGHTHOUSE ? null : await runLighthouse([["/", "/"], ["/search", "/search"], ["/noida", "/noida"], ...(listingPath ? [["listing", listingPath]] : [])]));
    await writeReport({ pages, lighthouse, linksChecked: allInternalLinks.size, minutes: ((Date.now() - started) / 60000).toFixed(1) });
    console.log(`\nDone. Report: ui-audit/REPORT.md (${issues.length} issues)`);
  } finally {
    stopServer(server);
  }
}

// ----------------------------------------------------------- interactions ---
async function interactions(browser, listingPath, blocked) {
  const check = async (name, vp, fn) => {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile });
    await blockWrites(context, blocked);
    const page = await context.newPage();
    try { await fn(page, vp); } catch (e) {
      const shot = `interaction_${vp.name}_${name}.png`;
      await page.screenshot({ path: path.join(shotsDir, shot), fullPage: false }).catch(() => {});
      addIssue({ severity: "High", page: `interaction: ${name}`, viewport: vp.name, what: `Interaction check failed: ${e.message.split("\n")[0]}`, shot, file: e.file || "-", fix: e.fix || "See screenshot; reproduce manually." });
    }
    await context.close();
  };
  const fail = (msg, file, fix) => Object.assign(new Error(msg), { file, fix });
  const mobile = viewports[0], desktop = viewports[3];
  console.log("Running interaction checks ...");

  for (const vp of [mobile, desktop]) {
    await check("home search", vp, async (page) => {
      await page.goto(BASE_URL + "/", { waitUntil: "networkidle" });
      await page.fill("#home-city", "Noi");
      await page.waitForTimeout(300);
      const suggestions = page.locator("#home-city ~ div");
      if (!(await suggestions.locator("button").count())) throw fail("Typing in Location shows no suggestions.", "src/components/home/search-card.tsx");
      const covers = await page.evaluate(() => {
        const list = document.querySelector("#home-city ~ div")?.getBoundingClientRect();
        const submit = document.querySelector('#home-city')?.closest("form")?.querySelector('button[type="submit"]')?.getBoundingClientRect();
        return Boolean(list && submit && list.bottom > submit.top && list.top < submit.bottom && list.right > submit.left && list.left < submit.right);
      });
      if (covers) addIssue({ severity: "Medium", page: "interaction: home search", viewport: vp.name, what: "While typing a location, the suggestion list covers the Search (and Filters) button, so a tap meant for Search picks a suggestion instead.", shot: "-", file: "src/components/home/search-card.tsx", fix: "Cap the list height (e.g. max-h-48), or close it when the input loses focus / on scroll; keep Search reachable." });
      await suggestions.locator("button").first().click();
      const filters = page.locator("#home-filters");
      const filterToggle = page.getByRole("button", { name: /Filters/ });
      if (vp.mobile) {
        if (await page.locator("#home-filters select").first().isVisible()) throw fail("Filter fields visible before tapping Filters on mobile.", "src/components/home/search-card.tsx");
        await filterToggle.click();
        if (!(await page.locator("#home-filters select").first().isVisible())) throw fail("Tapping Filters doesn't reveal the filter fields.", "src/components/home/search-card.tsx");
        await filterToggle.click();
        if (await page.locator("#home-filters select").first().isVisible()) throw fail("Tapping Filters again doesn't hide the fields.", "src/components/home/search-card.tsx");
        await filterToggle.click();
      }
      for (const sel of await filters.locator("select").all()) {
        const options = await sel.locator("option").allTextContents();
        if (options.length < 2) throw fail(`A dropdown has only ${options.length} option(s).`, "src/components/home/search-card.tsx");
        await sel.selectOption({ index: 1 });
      }
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await page.waitForURL(/\/search\?/, { timeout: 30000 });
      const url = new URL(page.url());
      if (!url.searchParams.get("location") || !url.searchParams.get("propertyType")) throw fail(`Search URL missing params: ${url.search}`, "src/components/home/search-card.tsx");
    });

    await check("search filter", vp, async (page) => {
      await page.goto(BASE_URL + "/search", { waitUntil: "networkidle" });
      const before = (await page.locator("h1 + p").first().textContent()) || "";
      const keyword = page.getByPlaceholder("Search title, area or metro");
      await keyword.fill("Gaur");
      await keyword.press("Enter");
      await page.waitForURL(/q=Gaur/, { timeout: 30000 }).catch(() => { throw fail("Applying a keyword filter didn't update the URL (q=).", "src/components/search/search-filters.tsx"); });
      await page.waitForLoadState("networkidle");
      const after = (await page.locator("h1 + p").first().textContent()) || "";
      if (!/found/.test(after)) throw fail("Result count line missing after filtering.", "src/app/search/page.tsx");
      if (before === after && !/Gaur/i.test(await page.locator("body").innerText())) throw fail("Results did not change after filtering.", "src/app/search/page.tsx");
      await page.goto(BASE_URL + "/search?q=zzqqxxnomatch", { waitUntil: "networkidle" });
      if (!/No rooms match/i.test(await page.locator("body").innerText())) throw fail("No empty-state message when nothing matches.", "src/components/search/search-results.tsx");
    });

    if (listingPath) await check("listing", vp, async (page) => {
      await page.goto(BASE_URL + listingPath, { waitUntil: "networkidle" });
      const next = page.getByRole("button", { name: "Next photo" });
      if (await next.count()) {
        const img = page.locator("img").filter({ has: page.locator("xpath=.") }).first();
        const src1 = await page.evaluate(() => [...document.querySelectorAll("img")].map((i) => i.currentSrc).join("|"));
        await next.first().click();
        await page.waitForTimeout(500);
        const src2 = await page.evaluate(() => [...document.querySelectorAll("img")].map((i) => i.currentSrc).join("|"));
        const dotActive = await page.locator('[aria-label="Go to photo 2"][aria-current], [aria-label="Go to photo 2"][aria-pressed="true"]').count();
        if (src1 === src2 && !dotActive) throw fail("Next photo arrow did not change the photo.", "src/components/listing/photo-carousel.tsx");
        void img;
        if (vp.mobile) {
          const box = await page.locator('[aria-label="Next photo"]').first().evaluate((el) => { const r = el.parentElement.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
          const swipeWorks = await page.evaluate(async ({ x, y, w }) => {
            const target = document.elementFromPoint(x, y);
            const before = [...document.querySelectorAll("img")].map((i) => i.currentSrc).join("|");
            const touch = (type, cx) => target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === "touchend" ? [] : [new Touch({ identifier: 1, target, clientX: cx, clientY: y })], changedTouches: [new Touch({ identifier: 1, target, clientX: cx, clientY: y })] }));
            touch("touchstart", x + w * 0.3); touch("touchmove", x - w * 0.3); touch("touchend", x - w * 0.3);
            await new Promise((r) => setTimeout(r, 500));
            return before !== [...document.querySelectorAll("img")].map((i) => i.currentSrc).join("|");
          }, box);
          if (!swipeWorks) addIssue({ severity: "Medium", page: "interaction: listing", viewport: vp.name, what: "Photo carousel does not respond to a swipe gesture (arrows only).", shot: "-", file: "src/components/listing/photo-carousel.tsx", fix: "Add touch swipe (or CSS scroll-snap) to the carousel." });
        }
      } else {
        addIssue({ severity: "Low", page: "interaction: listing", viewport: vp.name, what: "Listing has no 'Next photo' control (single or no photo), carousel not tested.", shot: "-", file: "src/components/listing/photo-carousel.tsx", fix: "Pick a listing with 2+ photos to test." });
      }
      const contact = await page.locator('a[href^="tel:"], a[href*="wa.me"]').count();
      if (contact) throw fail("Call/WhatsApp links are visible to a logged-out visitor.", "src/components/listing/listing-detail.tsx", "Only render contact actions when isLoggedIn.");
    });

    for (const intent of ["flat", "flatmate"]) await check(`post form (${intent})`, vp, async (page) => {
      await page.goto(`${BASE_URL}/property?intent=${intent}`, { waitUntil: "networkidle" });
      const final = new URL(page.url()).pathname;
      if (final !== "/property") return addIssue({ severity: "Low", page: `interaction: post form (${intent})`, viewport: vp.name, what: `Logged out, /property?intent=${intent} goes to ${final}; form validation not testable without login.`, shot: "-", file: "src/app/property/page.tsx", fix: "Informational." });
      const submit = page.locator('form button[type="submit"], form button:not([type])').last();
      if (!(await submit.count())) throw fail("No submit button found on the post form.", "src/app/property/page.tsx");
      const bodyBefore = await page.locator("body").innerText();
      await submit.click();
      await page.waitForTimeout(800);
      // Inline errors: fields marked aria-invalid, each pointing at a visible message.
      const inline = await page.evaluate(() => [...document.querySelectorAll('form [aria-invalid="true"]')].map((el) => document.getElementById(el.getAttribute("aria-describedby") || "")?.textContent || ""));
      const usesNative = await page.evaluate(() => [...document.querySelectorAll("form")].some((f) => !f.noValidate) && document.querySelectorAll("form :invalid").length > 0);
      const bodyAfter = await page.locator("body").innerText();
      const appMessage = bodyAfter !== bodyBefore && /required|please|enter|add|select|login|log in|sign in/i.test(bodyAfter);
      if (!inline.length && !usesNative && !appMessage) throw fail("Submitting the empty form shows no validation message.", "src/app/property/page.tsx", "Show inline errors on required fields.");
      if (!inline.length && usesNative) addIssue({ severity: "Low", page: `interaction: post form (${intent})`, viewport: vp.name, what: "Empty submit is blocked only by native browser bubbles, which show one field at a time.", shot: "-", file: "src/app/property/page.tsx", fix: "Show inline per-field errors (noValidate + aria-invalid + message)." });
      if (inline.some((msg) => !msg.trim())) addIssue({ severity: "Medium", page: `interaction: post form (${intent})`, viewport: vp.name, what: "A field is marked invalid but its aria-describedby message is missing or empty.", shot: "-", file: "src/app/property/page.tsx", fix: "Point aria-describedby at the rendered error text." });
    });
  }

  // Navigation: bottom nav (mobile) and header (desktop)
  await check("bottom nav", mobile, async (page) => {
    const targets = [["Home", "/"], ["Find Room", "/search"], ["Flatmates", "/flatmates"], ["Login", "/auth"]];
    for (const [label, dest] of targets) {
      await page.goto(BASE_URL + "/about", { waitUntil: "networkidle" });
      await page.locator('nav[aria-label="Main"]').getByRole("link", { name: label, exact: true }).click();
      await page.waitForURL((u) => new URL(u).pathname === dest, { timeout: 30000 }).catch(() => { throw fail(`Bottom nav "${label}" went to ${new URL(page.url()).pathname}, expected ${dest}.`, "src/components/layout/navbar.tsx"); });
    }
    await page.goto(BASE_URL + "/about", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Post a listing" }).click();
    for (const [label, intent] of [["Looking for a flat", "flat"], ["Looking for a flatmate", "flatmate"]]) {
      const link = page.locator('nav[aria-label="Main"]').getByRole("link", { name: new RegExp(`^${label}(?!mate)`) });
      if (!(await link.isVisible())) throw fail(`Post menu item "${label}" not visible after tapping Post.`, "src/components/layout/navbar.tsx");
      if (!(await link.getAttribute("href"))?.includes(`intent=${intent}`)) throw fail(`Post menu item "${label}" has the wrong href.`, "src/components/layout/navbar.tsx");
    }
  });
  await check("header nav", desktop, async (page) => {
    for (const [label, dest] of [["Home", "/"], ["Find Room", "/search"], ["Find Flatmates", "/flatmates"], ["About Us", "/about"]]) {
      await page.goto(BASE_URL + "/contact", { waitUntil: "networkidle" });
      await page.locator("header").getByRole("link", { name: label, exact: true }).click();
      await page.waitForURL((u) => new URL(u).pathname === dest, { timeout: 30000 }).catch(() => { throw fail(`Header "${label}" went to ${new URL(page.url()).pathname}, expected ${dest}.`, "src/components/layout/navbar.tsx"); });
    }
    await page.locator("header").getByRole("button", { name: /Post Property/ }).hover();
    if (!(await page.locator("header").getByRole("link", { name: /Looking for a flat\b/ }).isVisible())) throw fail("Post Property dropdown doesn't open on hover.", "src/components/layout/navbar.tsx");
  });
}

// -------------------------------------------------------- content checks ---
function contentChecks(pageTexts) {
  const claims = [
    [/\bverified\b/gi, "verified"], [/10,000\+/g, "10,000+"], [/25k\+/gi, "25k+"], [/5,000\+/g, "5,000+"], [/\b98%/g, "98%"],
    [/24\/7 support/gi, "24/7 support"], [/AI[- ]?(recommends|powered)/gi, "AI recommends / AI-powered"], [/smart matching/gi, "Smart Matching"], [/chat instantly/gi, "Chat instantly"],
  ];
  for (const [label, text] of pageTexts) {
    for (const [re, name] of claims) {
      const hits = [...text.matchAll(re)].map((m) => text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, " ").trim());
      if (hits.length) addIssue({ severity: "Medium", page: label, viewport: "desktop-1440", what: `Unproven claim "${name}" ×${hits.length}: ${short(hits, 2)}`, shot: "-", file: name === "verified" || name.includes("AI") ? "grep the phrase in src/" : "src/components/layout/footer.tsx / src/app/page.tsx", fix: "Remove or replace with something verifiable." });
    }
    const roomMate = (text.match(/Room ?Mates?\b/g) || []).filter((m) => m !== "Flatmates");
    if (/Room Mate/i.test(text)) addIssue({ severity: "Low", page: label, viewport: "desktop-1440", what: `Inconsistent naming: "Room Mate" used (${roomMate.length}×) while the rest of the site says "Flatmates".`, shot: "-", file: "src/components/layout/navbar.tsx (desktop header)", fix: 'Rename to "Find Flatmates".' });
    // Noida/Gurgaon sectors go up to 3 digits, so a 4+ digit "sector" is a count glued on.
    const glued = [...text.matchAll(/\bSector \d{4,}\b|\b[A-Za-z]+\d+ (listings?|rooms?|places?|flats?)\b/g)].map((m) => text.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20).replace(/\s+/g, " "));
    if (glued.length) addIssue({ severity: "Medium", page: label, viewport: "desktop-1440", what: `Count glued to an area name ("Sector 1371" bug): ${short(glued, 3)}`, shot: "-", file: "src/components/seo/landing-page.tsx (child place list)", fix: "Render the count in its own element with a space or badge, e.g. `Sector 137 · 1`." });
  }
}

// ------------------------------------------------------------- lighthouse ---
async function runLighthouse(targets) {
  console.log("Running Lighthouse (mobile) ...");
  const { default: lighthouse } = await import("lighthouse");
  const chromeLauncher = await import("chrome-launcher");
  const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ["--headless=new", "--no-sandbox"] });
  const results = [];
  try {
    for (const [label, route] of targets) {
      try {
        await fetch(BASE_URL + route).catch(() => {});
        const { lhr } = await lighthouse(BASE_URL + route, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility", "best-practices", "seo"] });
        const score = (k) => Math.round((lhr.categories[k]?.score ?? 0) * 100);
        const lcpItem = lhr.audits["largest-contentful-paint-element"]?.details?.items?.[0];
        const lcpNode = lcpItem?.items?.[0]?.node || lcpItem?.node;
        const opportunities = Object.values(lhr.audits)
          .filter((a) => a.details?.type === "opportunity" && (a.numericSavings ?? a.details.overallSavingsMs ?? 0) > 0 && a.score !== null && a.score < 1)
          .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
          .slice(0, 3)
          .map((a) => `${a.title}${a.details.overallSavingsMs ? ` (~${Math.round(a.details.overallSavingsMs)} ms)` : ""}`);
        const insights = opportunities.length ? opportunities : Object.values(lhr.audits).filter((a) => a.id.endsWith("-insight") && a.score !== null && a.score < 1).slice(0, 3).map((a) => a.title);
        results.push({ label, route, perf: score("performance"), a11y: score("accessibility"), bp: score("best-practices"), seo: score("seo"), lcp: lhr.audits["largest-contentful-paint"]?.displayValue, lcpEl: lcpNode ? `${lcpNode.nodeLabel || ""} \`${(lcpNode.selector || lcpNode.snippet || "").slice(0, 80)}\`` : "n/a", top: insights });
        console.log(`  lighthouse ${route} ✓`);
      } catch (e) { results.push({ label, route, error: e.message.split("\n")[0] }); }
    }
  } finally { await chrome.kill(); }
  return results;
}

// ----------------------------------------------------------------- report ---
async function writeReport({ pages, lighthouse, linksChecked, minutes }) {
  const order = ["Critical", "High", "Medium", "Low"];
  const L = [];
  L.push("# FlatFolks UI Audit", "");
  L.push(`- Target: \`${BASE_URL}\`${isLocal ? " (local `next dev`, view tracking disabled)" : ""}`);
  L.push(`- Run: ${new Date().toISOString()} · ${minutes} min · ${pages.length} pages × ${viewports.length} viewports · ${linksChecked} internal links checked`);
  L.push(`- Totals: ${order.map((s) => `**${s}** ${issues.filter((i) => i.severity === s).length}`).join(" · ")}`);
  L.push("- Screenshots: `ui-audit/screenshots/<viewport>_<page>.png`");
  if (isLocal) L.push("- Performance scores come from the dev server (unminified, no caching) and will be lower than production. Re-run with `BASE_URL=https://flatfolks.in` for real numbers.");
  L.push("", "## Summary", "", "| Page | Viewport | Critical | High | Medium | Low |", "|---|---|---|---|---|---|");
  const keys = [...pageStats.keys()].sort();
  for (const k of keys) {
    const [p, v] = k.split("|");
    const s = pageStats.get(k);
    L.push(`| ${p} | ${v} | ${s.Critical || ""} | ${s.High || ""} | ${s.Medium || ""} | ${s.Low || ""} |`);
  }
  for (const sev of order) {
    const list = issues.filter((i) => i.severity === sev);
    L.push("", `## ${sev} (${list.length})`, "");
    if (!list.length) { L.push("None."); continue; }
    for (const i of list) {
      L.push(`- **${i.page}** · ${i.viewport} — ${i.what}`);
      L.push(`  - Screenshot: \`${i.shot}\` · File: \`${i.file}\``);
      L.push(`  - Fix: ${i.fix}`);
    }
  }
  if (lighthouse) {
    L.push("", "## Lighthouse (mobile)", "", "| Page | Perf | A11y | Best Pr. | SEO | LCP | LCP element | Top opportunities |", "|---|---|---|---|---|---|---|---|");
    for (const r of lighthouse) {
      if (r.error) L.push(`| ${r.route} | error: ${r.error} | | | | | | |`);
      else L.push(`| ${r.label === "listing" ? `listing` : r.route} | ${r.perf} | ${r.a11y} | ${r.bp} | ${r.seo} | ${r.lcp} | ${r.lcpEl.replace(/\|/g, "/")} | ${r.top.join("; ").replace(/\|/g, "/")} |`);
    }
  }
  L.push("", "## Top 10 fixes", "", "_Written by hand after reviewing the results; see the section below the line if this run was regenerated._", "", "<!-- TOP10 -->", "");
  await writeFile(path.join(here, "REPORT.md"), L.join("\n"));
  await writeFile(path.join(here, "issues.json"), JSON.stringify({ issues, lighthouse }, null, 2));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
