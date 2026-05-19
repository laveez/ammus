import type {Page} from 'playwright';
import type {Adapter} from '../lib/adapter.js';
import {discoverByPattern} from '../lib/discovery.js';
import type {DeliveryRule, DiscoveredProduct} from '../lib/types.js';

const BASE_URL = 'https://asenurkka.fi';

const CALIBER_QUERIES: Record<string, string> = {
  '22 LR': '22+lr+patruuna',
  '222 Remington': '222+rem+patruuna',
  '223 Remington': '223+rem+patruuna',
  '6.5 Creedmoor': '6.5+creedmoor+patruuna',
  '30-06 Springfield': '30-06+sprg+patruuna',
  '308 Winchester': '308+win+patruuna',
  '7.62x39': '7.62x39+patruuna',
  '9mm': '9mm+luger+patruuna',
};

export const asenurkka: Adapter = {
  name: 'Asenurkka',
  baseUrl: BASE_URL,

  async discover(page: Page, caliber: string): Promise<DiscoveredProduct[] | null> {
    const q = CALIBER_QUERIES[caliber];
    if (!q) return [];
    return discoverByPattern(page, {
      caliber,
      baseUrl: BASE_URL,
      categoryUrls: [`${BASE_URL}/?s=${q}&post_type=product`],
      productUrlPattern: /asenurkka\.fi\/kauppa\/[^?#]+\/$/,
    });
  },

  async delivery(): Promise<DeliveryRule | null> {
    return null;
  },
};
