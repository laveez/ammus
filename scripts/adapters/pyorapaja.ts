import {bySearch, searchAdapter} from '../lib/adapter.js';

export const pyorapaja = searchAdapter({
  name: 'Pyörä-Paja',
  baseUrl: 'https://www.pyorapaja.fi',
  productUrlPattern: /pyorapaja\.fi\/product\/\d+/,
  categoryUrls: bySearch(q => `/search/?q=${q}`),
});
