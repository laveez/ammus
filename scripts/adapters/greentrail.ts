import {bySearch, searchAdapter} from '../lib/adapter.js';

export const greentrail = searchAdapter({
  name: 'Greentrail',
  baseUrl: 'https://www.greentrail.fi',
  productUrlPattern: /greentrail\.fi\/.+\/p\/[^/]+\/?$/,
  categoryUrls: bySearch(q => `/haku?q=${q}`),
  shippingPath: '/toimitusehdot',
});
