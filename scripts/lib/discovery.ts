import type {Page} from 'playwright';
import {parseDeliveryFromText} from './delivery.js';
import type {DeliveryRule, DiscoveredProduct} from './types.js';

const TIMEOUT = 15_000;
const SETTLE_MS = 1500;

export interface DiscoverByPatternOptions {
  /** Caliber being discovered. Tagged onto every result. */
  caliber: string
  /** Origin (used for absolute resolution if links are relative). */
  baseUrl: string
  /** Category URL(s) to crawl. Multiple = paginated or tag-filtered URLs. */
  categoryUrls: string[]
  /** Regex matched against each discovered href; non-matches are dropped. */
  productUrlPattern: RegExp
  /** Optional: per-page wait selector before collecting links. */
  waitForSelector?: string
}

/**
 * Generic category-page crawler: visits each category URL, collects all <a>
 * elements whose href matches `productUrlPattern`, dedupes by URL.
 */
export async function discoverByPattern(
  page: Page,
  opts: DiscoverByPatternOptions,
): Promise<DiscoveredProduct[]> {
  const seen = new Set<string>();
  const results: DiscoveredProduct[] = [];

  for (const categoryUrl of opts.categoryUrls) {
    try {
      await page.goto(categoryUrl, {timeout: TIMEOUT, waitUntil: 'domcontentloaded'});
      if (opts.waitForSelector) {
        await page.waitForSelector(opts.waitForSelector, {timeout: 5000}).catch(() => {/* ok */});
      }
      await page.waitForTimeout(SETTLE_MS);

      const links = await page.evaluate(({patternSrc, base}) => {
        const re = new RegExp(patternSrc);
        const out: { url: string; productName: string }[] = [];
        document.querySelectorAll('a[href]').forEach(a => {
          const raw = (a as HTMLAnchorElement).getAttribute('href') ?? '';
          if (!raw) return;
          // Resolve relative URLs against base
          let abs: string;
          try {
            abs = new URL(raw, base).toString();
          } catch {
            return;
          }
          if (!re.test(abs)) return;
          const name = a.textContent?.trim() ?? '';
          out.push({url: abs, productName: name});
        });
        return out;
      }, {patternSrc: opts.productUrlPattern.source, base: opts.baseUrl});

      for (const l of links) {
        if (seen.has(l.url)) continue;
        seen.add(l.url);
        results.push({url: l.url, caliber: opts.caliber, productName: l.productName});
      }
    } catch {
      // Single-page failure shouldn't kill the whole adapter; keep going.
      continue;
    }
  }

  return results;
}

export interface FetchDeliveryOptions {
  shippingUrl: string
  /** Default method label if the parser can't infer one. */
  method?: string
  /** Notes to attach to the rule if scraping succeeds. */
  notes?: string
}

/**
 * Generic shipping-page parser: visits the URL, extracts text, runs the
 * shared door-delivery parser. Returns null if no door-eligible price was
 * found (callers should fall back to retailers.json static rule).
 */
export async function fetchDelivery(
  page: Page,
  opts: FetchDeliveryOptions,
): Promise<DeliveryRule | null> {
  try {
    await page.goto(opts.shippingUrl, {timeout: TIMEOUT, waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body?.innerText ?? '');
    const parsed = parseDeliveryFromText(text);
    if (parsed.cheapest == null || !parsed.doorDelivery) return null;
    return {
      method: opts.method ?? 'Matkahuolto kotijakelu',
      cheapestPrice: parsed.cheapest,
      freeOverThreshold: parsed.freeOver,
      lastChecked: new Date().toISOString().slice(0, 10),
      notes: opts.notes ?? 'Ammo requires door delivery with ID check',
    };
  } catch {
    return null;
  }
}
