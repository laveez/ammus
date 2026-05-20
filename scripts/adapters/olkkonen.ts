import {bySearch, searchAdapter} from '../lib/adapter.js';
import {CALIBER_QUERIES_SHORT} from '../lib/queries.js';

// Olkkonen is a Wix store; its search uses AND-logic so the shorter no-
// "patruuna" caliber query returns the most results.
export const olkkonen = searchAdapter({
  name: 'Olkkonen',
  baseUrl: 'https://www.olkkonen.fi',
  productUrlPattern: /olkkonen\.fi\/fi\/product\/[^/?#]+/,
  categoryUrls: bySearch(q => `/fi/shop?searchTerm=${q}`, CALIBER_QUERIES_SHORT),
});
