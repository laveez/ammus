import type {Page} from 'playwright';
import type {Adapter} from '../lib/adapter.js';
import {discoverByPattern, fetchDelivery} from '../lib/discovery.js';
import type {DeliveryRule, DiscoveredProduct} from '../lib/types.js';

const BASE_URL = 'https://www.aawee.fi';

const CATEGORY_PATHS: Record<string, string[]> = {
  '22 LR': ['/fi/patruunat-ja-jalleenlataus/22lr/'],
  '222 Remington': ['/fi/patruunat-ja-jalleenlataus/222rem/'],
  '223 Remington': ['/fi/patruunat-ja-jalleenlataus/223rem/'],
  '6.5 Creedmoor': ['/fi/patruunat-ja-jalleenlataus/65creedmoor/'],
  '30-06 Springfield': ['/fi/patruunat-ja-jalleenlataus/3006spring/'],
  '308 Winchester': ['/fi/patruunat-ja-jalleenlataus/308win/'],
  '7.62x39': ['/fi/patruunat-ja-jalleenlataus/762x39/'],
  '9mm': ['/fi/patruunat-ja-jalleenlataus/9mm-patruunat/'],
};

export const aawee: Adapter = {
  name: 'Aawee',
  baseUrl: BASE_URL,

  async discover(page: Page, caliber: string): Promise<DiscoveredProduct[] | null> {
    const paths = CATEGORY_PATHS[caliber];
    if (!paths) return [];
    return discoverByPattern(page, {
      caliber,
      baseUrl: BASE_URL,
      categoryUrls: paths.map(p => `${BASE_URL}${p}`),
      productUrlPattern: /aawee\.fi\/.*\/p\/[^/]+\/?$/,
    });
  },

  async delivery(page: Page): Promise<DeliveryRule | null> {
    return fetchDelivery(page, {
      shippingUrl: `${BASE_URL}/fi/toimitusehdot`,
    });
  },
};
