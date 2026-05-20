import {bySearch, searchAdapter} from '../lib/adapter.js';

export const ruoto = searchAdapter({
  name: 'Ruoto',
  baseUrl: 'https://www.ruoto.fi',
  productUrlPattern: /ruoto\.fi\/.+\/p\/[^/]+\/?$/,
  categoryUrls: bySearch(q => `/haku?q=${q}`),
  shippingPath: '/toimitusehdot',
});
