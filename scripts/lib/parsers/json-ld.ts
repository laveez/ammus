import type {Page} from 'playwright';
import type {ExtractResult} from '../types.js';

export async function tryJsonLd(page: Page): Promise<ExtractResult> {
  const result = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'Product' || item['@type'] === 'IndividualProduct') {
            const offers = item.offers;
            if (!offers) continue;
            const offer = Array.isArray(offers) ? offers[0] : offers;
            const price = offer.lowPrice ?? offer.price;
            const avail = offer.availability;
            if (price != null) {
              return {
                price: typeof price === 'string' ? parseFloat(price.replace(',', '.')) : price,
                available: avail ? avail.includes('InStock') : null,
              };
            }
          }
        }
      } catch {/* skip malformed JSON-LD */}
    }
    return null;
  });
  if (result?.price) return {...result, nonToxic: null, strategy: 'json-ld'};
  return {price: null, available: null, nonToxic: null, strategy: 'json-ld'};
}
