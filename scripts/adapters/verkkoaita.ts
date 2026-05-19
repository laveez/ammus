import {bySearch, searchAdapter} from '../lib/adapter.js';

export const verkkoaita = searchAdapter({
  name: 'Verkkoaita',
  baseUrl: 'https://verkkoaita.com',
  productUrlPattern: /verkkoaita\.com\/product\/[^/?#]+\/?$/,
  categoryUrls: bySearch(q => `/?s=${q}&post_type=product`),
});
