import {bySearch, searchAdapter} from '../lib/adapter.js';

export const sissos = searchAdapter({
  name: 'Sissos',
  baseUrl: 'https://www.sissos.fi',
  productUrlPattern: /sissos\.fi\/.*\/p\/[A-Za-z0-9_]+\/?$/,
  categoryUrls: bySearch(q => `/haku?q=${q}`),
  shippingPath: '/i/toimitusehdot/',
});
