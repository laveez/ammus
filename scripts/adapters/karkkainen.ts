import {bySearch, searchAdapter} from '../lib/adapter.js';

// Kärkkäinen has deep paginated category pages, so search-based discovery is
// the practical choice. Product URLs live at both /verkkokauppa/<slug> and
// /en-en/<slug>.
export const karkkainen = searchAdapter({
  name: 'Kärkkäinen',
  baseUrl: 'https://www.karkkainen.com',
  productUrlPattern: /karkkainen\.com\/(verkkokauppa|en-en)\/[^/?]+(?:\?|$|\/)/,
  categoryUrls: bySearch(q => `/verkkokauppa?search=${q}`),
  shippingPath: '/asiakaspalvelu/toimitustavat',
});
