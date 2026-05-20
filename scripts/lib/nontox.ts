import type {Page} from 'playwright';
import type {Product} from './types.js';

export const NON_TOXIC_PATTERN = /lyijyt[oö]n|lead[- ]?free|non[- ]?toxic|nontoxic|sintox|\btfmj\b|monolithic|solid copper|kupariluoti|powerhead.blade|ecostrike|eco.strike|evostrike|naturalis|\bttsx\b|exergy|\bodin\b|clean.range|scorpio.eco/i;

export async function extractNonToxic(page: Page): Promise<boolean | null> {
  return page.evaluate(patternSource => {
    const pattern = new RegExp(patternSource, 'i');

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'Product' || item['@type'] === 'IndividualProduct') {
            const haystack = `${item.name || ''} ${item.description || ''}`;
            if (pattern.test(haystack)) return true;
          }
        }
      } catch {/* skip */}
    }

    const h1 = document.querySelector('h1')?.textContent || '';
    if (pattern.test(h1)) return true;

    return null;
  }, NON_TOXIC_PATTERN.source);
}

export function isNonToxicByName(product: Product): boolean {
  const text = `${product.productName} ${product.productDetails} ${product.brand}`;
  return NON_TOXIC_PATTERN.test(text);
}
