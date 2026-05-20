import {bySearch, searchAdapter} from '../lib/adapter.js';

export const kurre = searchAdapter({
  name: 'Kurre',
  baseUrl: 'https://www.kurre.fi',
  productUrlPattern: /kurre\.fi\/fi\/.+\/p\/[^/]+\/?$/,
  categoryUrls: bySearch(q => `/fi/haku?q=${q}`),
  shippingPath: '/toimitusehdot',
});
