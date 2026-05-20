import {bySearch, searchAdapter} from '../lib/adapter.js';

// /kauppa/patruunat/ in the regex filters out non-ammo hits (gun safes,
// optics, accessories) that the WP search would otherwise return.
export const asepajavuorela = searchAdapter({
  name: 'Asepaja Vuorela',
  baseUrl: 'https://www.asepajamvuorela.fi',
  productUrlPattern: /asepajamvuorela\.fi\/kauppa\/patruunat\/[^?#]+\/$/,
  categoryUrls: bySearch(q => `/?s=${q}&post_type=product`),
  shippingPath: '/asiakaspalvelu/toimitus',
});
