// Which page loads count as a listing view: people's browsers yes; crawlers,
// link previews and scripts no.
//   npm run test:views
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isAutomatedUserAgent } from "@/lib/automated-agent";

const people = {
  "Chrome on Windows": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Safari on iPhone": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Samsung Internet": "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  "Instagram in-app browser": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0",
  "Facebook in-app browser": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0]",
};

const automated = {
  Googlebot: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.69 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  Bingbot: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "WhatsApp link preview": "WhatsApp/2.23.20.0 A",
  "Facebook link preview": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  curl: "curl/8.4.0",
  Lighthouse: "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
  "Headless Chrome": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
  "no user agent": "",
};

describe("listing views", () => {
  for (const [name, agent] of Object.entries(people)) test(`${name} counts`, () => assert.equal(isAutomatedUserAgent(agent), false));
  for (const [name, agent] of Object.entries(automated)) test(`${name} doesn't count`, () => assert.equal(isAutomatedUserAgent(agent), true));
});
