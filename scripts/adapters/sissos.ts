import type {Page} from 'playwright';
import type {Adapter} from '../lib/adapter.js';
import {parseDeliveryFromText} from '../lib/delivery.js';
import type {DeliveryRule, DiscoveredProduct} from '../lib/types.js';

const CALIBER_QUERIES: Record<string, string> = {
  '22 LR': '22 lr',
  '222 Remington': '222 rem',
  '223 Remington': '223 rem',
  '6.5 Creedmoor': '6.5 creedmoor',
  '30-06 Springfield': '30-06',
  '308 Winchester': '308 win',
  '7.62x39': '7.62x39',
  '9mm': '9mm luger',
};

export const sissos: Adapter = {
  name: 'Sissos',
  baseUrl: 'https://www.sissos.fi',

  async discover(page: Page, caliber: string): Promise<DiscoveredProduct[] | null> {
    const query = CALIBER_QUERIES[caliber];
    if (!query) return [];
    const url = `${this.baseUrl}/haku?q=${encodeURIComponent(query)}+patruuna`;
    try {
      await page.goto(url, {timeout: 15000, waitUntil: 'domcontentloaded'});
      await page.waitForTimeout(1500);
      const links = await page.evaluate(() => {
        const out: { url: string; productName: string }[] = [];
        document.querySelectorAll('a[href*="/p/"]').forEach(a => {
          const href = (a as HTMLAnchorElement).href;
          const name = a.textContent?.trim() ?? '';
          if (href && /\/p\/\d+/.test(href)) out.push({url: href, productName: name});
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
      await page.goto(`${this.baseUrl}/toimitusehdot`, {timeout: 15000, waitUntil: 'domcontentloaded'});
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
