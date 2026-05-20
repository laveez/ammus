import {searchAdapter} from '../lib/adapter.js';

const PISTOL_CATEGORY = '/fi/pistoolin-patruunat-c-6_7.html';
const RIFLE_CATEGORY = '/fi/kivrin-patruunat-c-6_54.html';

// Iron Point's osCommerce category tree splits ammo by long-gun vs pistol,
// not by individual caliber, so calibers of the same family share a listing.
const RIFLE_CALIBERS = new Set([
  '22 LR', '222 Remington', '223 Remington', '6.5 Creedmoor',
  '30-06 Springfield', '308 Winchester', '7.62x39',
]);

export const ironpoint = searchAdapter({
  name: 'Iron Point',
  baseUrl: 'https://www.ironpoint.fi',
  productUrlPattern: /ironpoint\.fi\/(fi\/)?shop\/product\/[^?#]+/,
  categoryUrls: caliber => {
    if (caliber === '9mm') return [PISTOL_CATEGORY];
    if (RIFLE_CALIBERS.has(caliber)) return [RIFLE_CATEGORY];
    return [];
  },
  shippingPath: '/fi/pages.php?page=toimitusehdot',
});
