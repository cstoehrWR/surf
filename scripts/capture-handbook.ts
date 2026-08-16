/**
 * Captures admin handbook screenshots via Playwright.
 * Usage: npx tsx scripts/capture-handbook.ts
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE = process.env.APP_URL ?? "http://127.0.0.1:3000";
const OUT = path.join(process.cwd(), "public", "handbook");
const EMAIL = process.env.HANDBOOK_USER ?? "admin@northseasurf.example";
const PASSWORD = process.env.HANDBOOK_PASSWORD ?? "SurfDemo!2026";

const pages: Array<{ file: string; path: string; wait?: string }> = [
  { file: "dashboard.png", path: "/admin" },
  { file: "bookings.png", path: "/admin/bookings" },
  { file: "sessions.png", path: "/admin/sessions" },
  { file: "planner.png", path: "/admin/planner" },
  { file: "products.png", path: "/admin/products" },
  { file: "locations.png", path: "/admin/locations" },
  { file: "instructors.png", path: "/admin/instructors" },
  { file: "resources.png", path: "/admin/resources" },
  { file: "customers.png", path: "/admin/customers" },
  { file: "waivers.png", path: "/admin/waivers" },
  { file: "pricing.png", path: "/admin/pricing" },
  { file: "seasons.png", path: "/admin/seasons" },
  { file: "automations.png", path: "/admin/automations" },
  { file: "website.png", path: "/admin/website" },
  { file: "reports.png", path: "/admin/reports" },
  { file: "lodging.png", path: "/admin/lodging" },
  { file: "waitlist.png", path: "/admin/waitlist" },
  { file: "inbox.png", path: "/admin/inbox" },
  { file: "discount-codes.png", path: "/admin/discount-codes" },
  { file: "booking-public.png", path: "/o/north-sea-surf/book" },
  { file: "hilfe.png", path: "/admin/hilfe" },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 20000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1500);

  if (!page.url().includes("/admin")) {
    // Fallback: some setups use form action without client redirect wait
    await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  }

  for (const item of pages) {
    const url = `${BASE}${item.path}`;
    console.log("capture", item.file, url);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(800);
    // Hide sticky noise if any
    await page.screenshot({
      path: path.join(OUT, item.file),
      fullPage: false,
    });
  }

  await browser.close();
  console.log("done", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
