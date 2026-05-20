import type {Page} from 'playwright';
import type {ExtractResult} from '../types.js';

export async function tryTextRegex(page: Page): Promise<ExtractResult> {
  const result = await page.evaluate(() => {
    // Prefer text near the H1 (product title) — avoids picking up sidebar/related-product prices.
    const h1 = document.querySelector('h1');
    const root = h1?.closest('main, article, .product, #content, body') ?? document.body;
    const body = root?.textContent || document.body?.innerText || '';
    const matches = [...body.matchAll(/([\d\s]+[.,]\d{2})\s*€/g)];
    if (matches.length === 0) return null;
    const prices = matches
      .map(m => parseFloat(m[1].replace(/\s/g, '').replace(',', '.')))
      .filter(p => !isNaN(p) && p > 0);
    if (prices.length === 0) return null;
    return {price: prices[0]};
  });
  if (result?.price) return {price: result.price, available: null, nonToxic: null, strategy: 'text-regex'};
  return {price: null, available: null, nonToxic: null, strategy: 'text-regex'};
}
