import type {Page} from 'playwright';
import type {Adapter} from '../lib/adapter.js';
import {parseDeliveryFromText} from '../lib/delivery.js';
import type {DeliveryRule, DiscoveredProduct} from '../lib/types.js';

const CALIBER_PATHS: Record<string, string> = {
  '22 LR': '/fi/patruunat-ja-jalleenlataus/22lr',
  '222 Remington': '/fi/patruunat-ja-jalleenlataus/222rem',
  '223 Remington': '/fi/patruunat-ja-jalleenlataus/223rem',
  '6.5 Creedmoor': '/fi/patruunat-ja-jalleenlataus/65creedmoor',
  '30-06 Springfield': '/fi/patruunat-ja-jalleenlataus/3006spring',
  '308 Winchester': '/fi/patruunat-ja-jalleenlataus/308win',
  '7.62x39': '/fi/patruunat-ja-jalleenlataus/762x39',
  '9mm': '/fi/patruunat-ja-jalleenlataus/9mm-patruunat',
};

const SHIPPING_URL = 'https://www.aawee.fi/fi/toimitusehdot';

export const aawee: Adapter = {
  name: 'Aawee',
  baseUrl: 'https://www.aawee.fi',

  async discover(page: Page, caliber: string): Promise<DiscoveredProduct[] | null> {
    const path = CALIBER_PATHS[caliber];
    if (!path) return [];
    const url = `${this.baseUrl}${path}`;
    try {
      await page.goto(url, {timeout: 15000, waitUntil: 'domcontentloaded'});
      await page.waitForTimeout(1500);
      const links = await page.evaluate(() => {
        const out: { url: string; productName: string }[] = [];
        document.querySelectorAll('a[href*="/p/"]').forEach(a => {
          const href = (a as HTMLAnchorElement).href;
          const name = a.textContent?.trim() ?? '';
          if (href && /\/p\/[^/]+\/?$/.test(href)) out.push({url: href, productName: name});
        });
        return out;
      });
      const seen = new Set<string>();
      const result: DiscoveredProduct[] = [];
      for (const l of links) {
        if (seen.has(l.url)) continue;
        seen.add(l.url);
        result.push({url: l.url, caliber, productName: l.productName});
      }
      return result;
    } catch {
      return null;
    }
  },

  async delivery(page: Page): Promise<DeliveryRule | null> {
    try {
      await page.goto(SHIPPING_URL, {timeout: 15000, waitUntil: 'domcontentloaded'});
      await page.waitForTimeout(1000);
      const text = await page.evaluate(() => document.body?.innerText ?? '');
      const parsed = parseDeliveryFromText(text);
      if (parsed.cheapest == null || !parsed.doorDelivery) return null;
      return {
        method: 'Matkahuolto kotijakelu',
        cheapestPrice: parsed.cheapest,
        freeOverThreshold: parsed.freeOver,
        lastChecked: new Date().toISOString().slice(0, 10),
        notes: 'Ammo requires door delivery with ID check',
      };
    } catch {
      return null;
    }
  },
};
