import type {Page} from 'playwright';
import type {Adapter} from '../lib/adapter.js';
import {discoverByPattern} from '../lib/discovery.js';
import type {DeliveryRule, DiscoveredProduct} from '../lib/types.js';

const BASE_URL = 'https://www.olkkonen.fi';

// Olkkonen runs on Wix. Their Wix Stores layout exposes /fi/product/<slug>/<id>
// for product detail pages and /fi/shop?searchTerm=<q> for search.
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

export const olkkonen: Adapter = {
  name: 'Olkkonen',
  baseUrl: BASE_URL,

  async discover(page: Page, caliber: string): Promise<DiscoveredProduct[] | null> {
    const q = CALIBER_QUERIES[caliber];
    if (!q) return [];
    return discoverByPattern(page, {
      caliber,
      baseUrl: BASE_URL,
      categoryUrls: [`${BASE_URL}/fi/shop?searchTerm=${q}`],
      productUrlPattern: /olkkonen\.fi\/fi\/product\/[^/?#]+/,
    });
  },

  async delivery(): Promise<DeliveryRule | null> {
    return null;
  },
};
