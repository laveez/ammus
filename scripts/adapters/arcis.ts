import type {Page} from 'playwright';
import type {Adapter} from '../lib/adapter.js';
import {discoverByPattern} from '../lib/discovery.js';
import type {DeliveryRule, DiscoveredProduct} from '../lib/types.js';

const BASE_URL = 'https://www.arcis.fi';

// Arcis runs on Wix. Wix search uses ?searchTerm= and product detail pages
// live under /product-page/<slug>. Small catalog as of 2026-05-08.
const CALIBER_QUERIES: Record<string, string> = {
  '22 LR': '22+lr',
  '222 Remington': '222+rem',
  '223 Remington': '223+rem',
  '6.5 Creedmoor': '6.5+creedmoor',
  '30-06 Springfield': '30-06',
  '308 Winchester': '308+win',
  '7.62x39': '7.62x39',
  '9mm': '9mm',
};

export const arcis: Adapter = {
  name: 'Arcis',
  baseUrl: BASE_URL,

  async discover(page: Page, caliber: string): Promise<DiscoveredProduct[] | null> {
    const q = CALIBER_QUERIES[caliber];
    if (!q) return [];
    return discoverByPattern(page, {
      caliber,
      baseUrl: BASE_URL,
      categoryUrls: [`${BASE_URL}/shop?searchTerm=${q}`],
      productUrlPattern: /arcis\.fi\/product-page\/[^?#]+/,
    });
  },

  async delivery(): Promise<DeliveryRule | null> {
    return null;
  },
};
