import {bySearch, searchAdapter} from '../lib/adapter.js';
import {CALIBER_QUERIES_SHORT} from '../lib/queries.js';

// Wix store. Search engine applies AND-logic, so the shorter no-"patruuna"
// caliber query is the only thing that returns results.
export const arcis = searchAdapter({
  name: 'Arcis',
  baseUrl: 'https://www.arcis.fi',
  productUrlPattern: /arcis\.fi\/product-page\/[^?#]+/,
  categoryUrls: bySearch(q => `/shop?searchTerm=${q}`, CALIBER_QUERIES_SHORT),
});
