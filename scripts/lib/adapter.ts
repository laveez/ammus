import type {Page} from 'playwright';
import {extractAvailability, tryDomSelectors, tryJsVariables} from './parsers/dom.js';
import {tryJsonLd} from './parsers/json-ld.js';
import {tryMetaTags} from './parsers/meta-tags.js';
import {tryTextRegex} from './parsers/text-regex.js';
import {discoverByPattern, fetchDelivery} from './discovery.js';
import {extractNonToxic} from './nontox.js';
import {CALIBER_QUERIES_PATRUUNA} from './queries.js';
import type {DeliveryRule, DiscoveredProduct, ExtractResult, VariantInfo} from './types.js';
import {extractVariants} from './variants.js';

export interface Adapter {
  /** Display name. Must match `retailer` field in products.json. */
  name: string
  /** Origin URL. Used for relative-link resolution. */
  baseUrl: string
  /**
   * Phase 1: enumerate product URLs from the retailer's catalog for `caliber`.
   *
   * Return `null` to mean "discovery not implemented for this adapter" — the
   * orchestrator will retain existing URLs unconditionally for this retailer
   * (no auto-prune). Return `[]` to mean "implemented, found nothing" — the
   * orchestrator will auto-prune URLs not seen for 14 days.
   */
  discover(page: Page, caliber: string): Promise<DiscoveredProduct[] | null>
  /** Phase 4: extract delivery rule from shipping page. */
  delivery(page: Page): Promise<DeliveryRule | null>
  /** Phase 2: price/availability/non-toxic. Default = shared parsers in fallback order. */
  extract?(page: Page): Promise<ExtractResult>
  /** Phase 3: quantity variants. Default = shared variants parser. */
  variants?(page: Page): Promise<VariantInfo[] | null>
}

/**
 * Common selectors that signal "product detail content has rendered." Used by
 * `defaultExtract` to short-circuit the SPA-hydration wait when content is
 * actually present, instead of always waiting a fixed 3s.
 */
const PRICE_SIGNAL_SELECTOR = [
  'script[type="application/ld+json"]',
  'meta[property="product:price:amount"]',
  'meta[itemprop="price"]',
  '[itemprop="price"]',
  '.price',
  '.product-price',
  '.woocommerce-Price-amount',
].join(', ');

async function enrich(page: Page, result: ExtractResult): Promise<ExtractResult> {
  const [available, nonToxic, variants] = await Promise.all([
    result.available === null ? extractAvailability(page) : Promise.resolve(result.available),
    extractNonToxic(page),
    extractVariants(page),
  ]);
  result.available = available;
  result.nonToxic = nonToxic;
  result.variants = variants ?? undefined;
  return result;
}

/**
 * Default `extract`: try server-rendered strategies first; if none yield a
 * price, wait (up to 3s) for an SPA-style content signal and retry; finally,
 * fall back to text-regex scraping.
 */
export async function defaultExtract(page: Page): Promise<ExtractResult> {
  const fastStrategies = [tryJsonLd, tryMetaTags, tryDomSelectors, tryJsVariables];

  for (const strategy of fastStrategies) {
    const result = await strategy(page);
    if (result.price !== null) return enrich(page, result);
  }

  await page.waitForSelector(PRICE_SIGNAL_SELECTOR, {timeout: 3000}).catch(() => {/* ok */});

  for (const strategy of fastStrategies) {
    const result = await strategy(page);
    if (result.price !== null) return enrich(page, result);
  }

  const textResult = await tryTextRegex(page);
  if (textResult.price !== null) return enrich(page, textResult);

  const [available, nonToxic] = await Promise.all([extractAvailability(page), extractNonToxic(page)]);
  return {price: null, available, nonToxic, strategy: 'none'};
}

export async function defaultVariants(page: Page): Promise<VariantInfo[] | null> {
  return extractVariants(page);
}

export async function callExtract(adapter: Adapter, page: Page): Promise<ExtractResult> {
  return adapter.extract ? adapter.extract(page) : defaultExtract(page);
}

export interface SearchAdapterOpts {
  name: string
  baseUrl: string
  /** Regex matched against discovered hrefs. */
  productUrlPattern: RegExp
  /**
   * Given a caliber, return the category/search URLs to crawl. Use the
   * `bySearch()` / `byCategory()` helpers for common cases.
   */
  categoryUrls: (caliber: string) => string[]
  /** Path (relative to baseUrl) to the shipping page. Omit for delivery: null. */
  shippingPath?: string
  shippingMethod?: string
  shippingNotes?: string
}

/**
 * Build an `Adapter` from URL knowledge alone. Handles both search-based and
 * category-based discovery via the `categoryUrls` callback.
 */
export function searchAdapter(opts: SearchAdapterOpts): Adapter {
  const {name, baseUrl, productUrlPattern, categoryUrls, shippingPath} = opts;
  const absolutize = (p: string) => p.startsWith('http') ? p : `${baseUrl}${p}`;
  return {
    name,
    baseUrl,
    async discover(page, caliber) {
      const paths = categoryUrls(caliber);
      if (paths.length === 0) return [];
      return discoverByPattern(page, {
        caliber,
        baseUrl,
        categoryUrls: paths.map(absolutize),
        productUrlPattern,
      });
    },
    async delivery(page) {
      if (!shippingPath) return null;
      return fetchDelivery(page, {
        shippingUrl: absolutize(shippingPath),
        method: opts.shippingMethod,
        notes: opts.shippingNotes,
      });
    },
  };
}

/**
 * Category-URL builder: maps each search query to a single search URL using
 * the supplied path builder. Defaults to the `+patruuna` caliber-query set.
 */
export function bySearch(
  searchPath: (query: string) => string,
  queries: Record<string, string> = CALIBER_QUERIES_PATRUUNA,
): (caliber: string) => string[] {
  return caliber => {
    const q = queries[caliber];
    return q ? [searchPath(q)] : [];
  };
}

/**
 * Category-URL builder: looks up a per-caliber list of category paths.
 */
export function byCategory(
  paths: Record<string, string[]>,
): (caliber: string) => string[] {
  return caliber => paths[caliber] ?? [];
}
