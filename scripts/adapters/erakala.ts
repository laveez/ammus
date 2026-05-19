import {bySearch, searchAdapter} from '../lib/adapter.js';

export const erakala = searchAdapter({
  name: 'Erakala',
  baseUrl: 'https://www.erakala.fi',
  productUrlPattern: /erakala\.fi\/.+\/p\/[^/]+\/?$/,
  categoryUrls: bySearch(q => `/haku?q=${q}`),
  shippingPath: '/toimitusehdot',
});
