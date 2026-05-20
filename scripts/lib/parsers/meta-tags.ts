import type {Page} from 'playwright';
import type {ExtractResult} from '../types.js';

export async function tryMetaTags(page: Page): Promise<ExtractResult> {
  const result = await page.evaluate(() => {
    const priceMeta =
      document.querySelector<HTMLMetaElement>('meta[itemprop="price"]') ??
      document.querySelector<HTMLMetaElement>('meta[property="product:price:amount"]') ??
      document.querySelector<HTMLMetaElement>('meta[property="og:price:amount"]');
    if (priceMeta?.content) {
      const price = parseFloat(priceMeta.content.replace(',', '.'));
      const availMeta = document.querySelector<HTMLMetaElement>('meta[itemprop="availability"]');
      const available = availMeta ? availMeta.content.includes('InStock') : null;
      return {price: isNaN(price) ? null : price, available};
    }
    return null;
  });
  if (result?.price) return {...result, nonToxic: null, strategy: 'meta-tags'};
  return {price: null, available: null, nonToxic: null, strategy: 'meta-tags'};
}
