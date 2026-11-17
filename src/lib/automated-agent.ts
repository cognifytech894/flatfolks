// Tells people's browsers apart from crawlers, link-preview fetchers
// (WhatsApp, Facebook), monitoring tools and HTTP libraries, by user agent.
//
// Kept free of "@/..." and Next imports so Node can load it directly in tests.

const automatedAgent = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|skype|discord|slack|embedly|lighthouse|pagespeed|headless|phantom|puppeteer|playwright|selenium|python|curl|wget|httpclient|okhttp|axios|node-fetch|undici|go-http|java\/|libwww|scrapy|monitor|uptime|pingdom/i;

/** True for requests that don't come from a person's browser. A missing user agent counts as automated. */
export function isAutomatedUserAgent(userAgent: string | null | undefined): boolean {
  return !userAgent || automatedAgent.test(userAgent);
}
