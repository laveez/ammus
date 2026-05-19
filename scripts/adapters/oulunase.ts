import {bySearch, searchAdapter} from '../lib/adapter.js';

export const oulunase = searchAdapter({
  name: 'Oulun Ase',
  baseUrl: 'https://www.oulunase.fi',
  productUrlPattern: /oulunase\.fi\/product\/\d+\/[^/?#]+$/,
  categoryUrls: bySearch(q => `/?s=${q}&post_type=product`),
  shippingPath: '/page/1/toimitusehdot',
});
