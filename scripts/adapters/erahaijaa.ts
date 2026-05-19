import {bySearch, searchAdapter} from '../lib/adapter.js';

export const erahaijaa = searchAdapter({
  name: 'Era Haijaa',
  baseUrl: 'https://era.haijaa.fi',
  productUrlPattern: /haijaa\.fi\/.+\/p\/I[^/]+\/?$/,
  categoryUrls: bySearch(q => `/haku?q=${q}`),
  shippingPath: '/toimitusehdot',
});
