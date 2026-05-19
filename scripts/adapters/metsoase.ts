import {bySearch, searchAdapter} from '../lib/adapter.js';

export const metsoase = searchAdapter({
  name: 'Metso Ase',
  baseUrl: 'https://www.metsoase.fi',
  productUrlPattern: /metsoase\.fi\/.+\/p\/[^/]+\/?$/,
  categoryUrls: bySearch(q => `/haku?q=${q}`),
  shippingPath: '/toimitusehdot',
});
