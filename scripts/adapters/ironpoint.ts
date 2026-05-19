import type {Page} from 'playwright';
import type {Adapter} from '../lib/adapter.js';
import {discoverByPattern, fetchDelivery} from '../lib/discovery.js';
import type {DeliveryRule, DiscoveredProduct} from '../lib/types.js';

const BASE_URL = 'https://www.ironpoint.fi';

// Iron Point uses old-school osCommerce category URLs (c-A_B.html). The
// top-level "patruunat" (ammo) category splits into pistol (c-6_7) and rifle
// (c-6_54) — categories don't split by individual caliber, so each query
// returns the same listing pages for pistol/rifle calibers respectively.
const PISTOL_CALIBERS = new Set(['9mm']);
const RIFLE_CALIBERS = new Set([
  '22 LR',
  '222 Remington',
  '223 Remington',
  '6.5 Creedmoor',
  '30-06 Springfield',
  '308 Winchester',
  '7.62x39',
]);

export const ironpoint: Adapter = {
  name: 'Iron Point',
  baseUrl: BASE_URL,

  async discover(page: Page, caliber: string): Promise<DiscoveredProduct[] | null> {
    let categoryUrl: string;
    if (PISTOL_CALIBERS.has(caliber)) {
      categoryUrl = `${BASE_URL}/fi/pistoolin-patruunat-c-6_7.html`;
    } else if (RIFLE_CALIBERS.has(caliber)) {
      categoryUrl = `${BASE_URL}/fi/kivrin-patruunat-c-6_54.html`;
    } else {
      return [];
    }
    return discoverByPattern(page, {
      caliber,
      baseUrl: BASE_URL,
      categoryUrls: [categoryUrl],
      productUrlPattern: /ironpoint\.fi\/(fi\/)?shop\/product\/[^?#]+/,
    });
  },

  async delivery(page: Page): Promise<DeliveryRule | null> {
    return fetchDelivery(page, {
      shippingUrl: `${BASE_URL}/fi/pages.php?page=toimitusehdot`,
    });
  },
};
