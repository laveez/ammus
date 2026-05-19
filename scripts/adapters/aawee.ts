import {byCategory, searchAdapter} from '../lib/adapter.js';

export const aawee = searchAdapter({
  name: 'Aawee',
  baseUrl: 'https://www.aawee.fi',
  productUrlPattern: /aawee\.fi\/.*\/p\/[^/]+\/?$/,
  categoryUrls: byCategory({
    '22 LR': ['/fi/patruunat-ja-jalleenlataus/22lr/'],
    '222 Remington': ['/fi/patruunat-ja-jalleenlataus/222rem/'],
    '223 Remington': ['/fi/patruunat-ja-jalleenlataus/223rem/'],
    '6.5 Creedmoor': ['/fi/patruunat-ja-jalleenlataus/65creedmoor/'],
    '30-06 Springfield': ['/fi/patruunat-ja-jalleenlataus/3006spring/'],
    '308 Winchester': ['/fi/patruunat-ja-jalleenlataus/308win/'],
    '7.62x39': ['/fi/patruunat-ja-jalleenlataus/762x39/'],
    '9mm': ['/fi/patruunat-ja-jalleenlataus/9mm-patruunat/'],
  }),
  shippingPath: '/fi/toimitusehdot',
});
