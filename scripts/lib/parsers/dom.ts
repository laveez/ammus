import type {Page} from 'playwright';
import type {ExtractResult} from '../types.js';

const DEFAULT_SELECTORS = [
  // WooCommerce
  '.woocommerce-Price-amount bdi',
  '.woocommerce-Price-amount',
  'p.price ins .woocommerce-Price-amount bdi',
  'p.price .woocommerce-Price-amount bdi',
  // Ahtihuvila
  '.tuotekortti_tuotehinta_tarjous',
  // Generic
  '.product-price .current-price',
  '.product-price',
  '[data-price]',
  '.price-value',
  '.current-price',
];

export async function tryDomSelectors(
  page: Page,
  extraSelectors: string[] = [],
): Promise<ExtractResult> {
  const selectors = [...extraSelectors, ...DEFAULT_SELECTORS];
  const result = await page.evaluate(sels => {
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const text = el.textContent?.trim() || '';
      const match = text.match(/([\d\s]+[.,]\d{2})/);
      if (match) {
        const price = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
        if (!isNaN(price) && price > 0) return {price};
      }
      if (el instanceof HTMLElement && el.dataset.price) {
        const price = parseFloat(el.dataset.price.replace(',', '.'));
        if (!isNaN(price) && price > 0) return {price};
      }
    }
    return null;
  }, selectors);
  if (result?.price) return {price: result.price, available: null, nonToxic: null, strategy: 'dom-selectors'};
  return {price: null, available: null, nonToxic: null, strategy: 'dom-selectors'};
}

export async function tryJsVariables(page: Page): Promise<ExtractResult> {
  const result = await page.evaluate(() => {
    const w = window as Record<string, unknown>;
    for (const key of ['valittuhinta', 'productPrice']) {
      const val = w[key];
      if (typeof val === 'number' && val > 0) return {price: val};
      if (typeof val === 'string') {
        const price = parseFloat(val.replace(',', '.'));
        if (!isNaN(price) && price > 0) return {price};
      }
    }
    return null;
  });
  if (result?.price) return {price: result.price, available: null, nonToxic: null, strategy: 'js-variables'};
  return {price: null, available: null, nonToxic: null, strategy: 'js-variables'};
}

export async function extractAvailability(page: Page): Promise<boolean | null> {
  return page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const offers = item.offers;
          if (!offers) continue;
          const offer = Array.isArray(offers) ? offers[0] : offers;
          if (offer.availability) return offer.availability.includes('InStock');
        }
      } catch {/* skip */}
    }

    const availMeta = document.querySelector('meta[itemprop="availability"]') as HTMLMetaElement;
    if (availMeta?.content) return availMeta.content.includes('InStock');

    const text = document.body?.innerText?.toLowerCase() || '';
    if (text.includes('ei varastossa') || text.includes('loppunut') || text.includes('ilmoita, kun saatavilla')) return false;
    if (text.includes('varastossa') || text.includes('saatavilla')) return true;

    const inStock = document.querySelector('.in-stock, .instock, .available');
    const outOfStock = document.querySelector('.out-of-stock, .outofstock, .unavailable, .sold-out');
    if (inStock) return true;
    if (outOfStock) return false;

    const cartBtn = document.querySelector('[name="add-to-cart"], .add-to-cart, #add-to-cart, .ostoskorinappi, #ostoskorinappi');
    if (cartBtn) {
      const disabled = (cartBtn as HTMLButtonElement).disabled;
      return !disabled;
    }

    return null;
  });
}
