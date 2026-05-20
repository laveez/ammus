import {bySearch, searchAdapter} from '../lib/adapter.js';

export const uittokalusto = searchAdapter({
  name: 'Uittokalusto',
  baseUrl: 'https://www.uittokalusto.fi',
  productUrlPattern: /uittokalusto\.fi\/[a-z0-9][a-z0-9-]*\.html$/,
  categoryUrls: bySearch(q => `/catalogsearch/result/?q=${q}`),
  shippingPath: '/toimitustavat',
});
