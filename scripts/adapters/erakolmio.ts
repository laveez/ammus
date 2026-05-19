import {bySearch, searchAdapter} from '../lib/adapter.js';

export const erakolmio = searchAdapter({
  name: 'Erakolmio',
  baseUrl: 'https://www.erakolmio.com',
  productUrlPattern: /erakolmio\.com\/tuote\/[^/?#]+\/$/,
  categoryUrls: bySearch(q => `/?s=${q}&post_type=product`),
});
