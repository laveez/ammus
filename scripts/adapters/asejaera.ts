import {bySearch, searchAdapter} from '../lib/adapter.js';

export const asejaera = searchAdapter({
  name: 'Ase ja Erä',
  baseUrl: 'https://www.asejaera.fi',
  productUrlPattern: /asejaera\.fi\/.+\/p\/[^/]+\/?$/,
  categoryUrls: bySearch(q => `/haku?q=${q}`),
  shippingPath: '/toimitusehdot',
});
