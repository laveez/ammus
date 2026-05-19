import {bySearch, searchAdapter} from '../lib/adapter.js';

export const seponurheilujapatruuna = searchAdapter({
  name: 'Seponurheilujapatruuna',
  baseUrl: 'https://www.seponurheilujapatruuna.fi',
  productUrlPattern: /seponurheilujapatruuna\.fi\/tuote\/[^/?#]+\/$/,
  categoryUrls: bySearch(q => `/?s=${q}&post_type=product`),
  shippingPath: '/asiakaspalvelu/toimitus',
});
