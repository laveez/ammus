import {bySearch, searchAdapter} from '../lib/adapter.js';

export const asenurkka = searchAdapter({
  name: 'Asenurkka',
  baseUrl: 'https://asenurkka.fi',
  productUrlPattern: /asenurkka\.fi\/kauppa\/[^?#]+\/$/,
  categoryUrls: bySearch(q => `/?s=${q}&post_type=product`),
});
