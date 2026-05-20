import {bySearch, searchAdapter} from '../lib/adapter.js';

export const savonmutka = searchAdapter({
  name: 'Savon Mutka',
  baseUrl: 'https://savonmutka.fi',
  productUrlPattern: /savonmutka\.fi\/product\/[^/?#]+\/?$/,
  categoryUrls: bySearch(q => `/?s=${q}&post_type=product`),
  shippingPath: '/sopimusehdot',
});
