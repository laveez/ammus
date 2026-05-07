import type {Page} from 'playwright';
import {extractAvailability, tryDomSelectors, tryJsVariables} from './parsers/dom.js';
import {tryJsonLd} from './parsers/json-ld.js';
import {tryMetaTags} from './parsers/meta-tags.js';
import {tryTextRegex} from './parsers/text-regex.js';
import {extractNonToxic} from './nontox.js';
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
 * Default `extract` implementation: tries server-rendered strategies, then
 * waits 3s and retries (catches SPA-rendered prices), then falls back to
 * text-regex.
 */
export async function defaultExtract(page: Page): Promise<ExtractResult> {
  const fastStrategies = [tryJsonLd, tryMetaTags, tryDomSelectors, tryJsVariables];
  for (const strategy of fastStrategies) {
    const result = await strategy(page);
    if (result.price !== null) {
      if (result.available === null) result.available = await extractAvailability(page);
      result.nonToxic = await extractNonToxic(page);
      result.variants = await extractVariants(page) ?? undefined;
      return result;
    }
  }

  await page.waitForTimeout(3000);
  for (const strategy of fastStrategies) {
    const result = await strategy(page);
    if (result.price !== null) {
      if (result.available === null) result.available = await extractAvailability(page);
      result.nonToxic = await extractNonToxic(page);
      result.variants = await extractVariants(page) ?? undefined;
      return result;
    }
  }

  const textResult = await tryTextRegex(page);
  if (textResult.price !== null) {
    textResult.available = await extractAvailability(page);
    textResult.nonToxic = await extractNonToxic(page);
    textResult.variants = await extractVariants(page) ?? undefined;
    return textResult;
  }

  const available = await extractAvailability(page);
  const nonToxic = await extractNonToxic(page);
  return {price: null, available, nonToxic, strategy: 'none'};
}

/**
 * Default `variants` implementation: shared parser. Adapters override only
 * for retailers with custom variant patterns.
 */
export async function defaultVariants(page: Page): Promise<VariantInfo[] | null> {
  return extractVariants(page);
}

/**
 * Resolve adapter to its `extract` method, falling back to `defaultExtract`.
 */
export async function callExtract(adapter: Adapter, page: Page): Promise<ExtractResult> {
  return adapter.extract ? adapter.extract(page) : defaultExtract(page);
}
