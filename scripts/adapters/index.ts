import type {Adapter} from '../lib/adapter.js';
import {legacyAdapter} from './_legacy.js';
import {aawee} from './aawee.js';
import {karkkainen} from './karkkainen.js';
import {motonet} from './motonet.js';
import {sissos} from './sissos.js';

/**
 * Registry of all known retailer adapters. Order has no semantic meaning —
 * the orchestrator runs them in parallel up to CONCURRENCY.
 *
 * To add a retailer:
 *   1. Create `adapters/<name>.ts` exporting an `Adapter`. Visit the live site
 *      and confirm the category page URL + product URL pattern before writing
 *      the adapter — guessed paths produce silent failures and noisy CI logs.
 *   2. Import + add to this array.
 *   3. (optional) Add a real `delivery` block to `src/data/retailers.json` if
 *      you've confirmed the price/threshold; otherwise leave delivery null and
 *      let the adapter's `delivery()` populate it on next CI run.
 */
export const adapters: Adapter[] = [
  // Adapters with discover() + delivery() implemented and URLs verified
  aawee,
  karkkainen,
  motonet,
  sissos,

  // Legacy stubs — preserve current behavior. Replace each with a real
  // adapter file as discovery/delivery support is added per retailer.
  // Verify each retailer's category-page URL pattern by visiting the site
  // before writing an adapter.
  legacyAdapter('Ahtihuvila', 'https://www.ahtihuvila.fi'),
  legacyAdapter('Arcis', 'https://www.arcis.fi'),
  legacyAdapter('Ase ja Erä', 'https://www.asejaera.fi'),
  legacyAdapter('Asejaosa', 'https://www.asejaosa.fi'),
  legacyAdapter('Asenurkka', 'https://asenurkka.fi'),
  legacyAdapter('Asepaja Vuorela', 'https://www.asepajamvuorela.fi'),
  legacyAdapter('Asetalo', 'https://www.asetalo.fi'),
  legacyAdapter('Era Haijaa', 'https://era.haijaa.fi'),
  legacyAdapter('Erakala', 'https://www.erakala.fi'),
  legacyAdapter('Erakolmio', 'https://www.erakolmio.com'),
  legacyAdapter('Greentrail', 'https://www.greentrail.fi'),
  legacyAdapter('Iron Point', 'https://www.ironpoint.fi'),
  legacyAdapter('Kurre', 'https://www.kurre.fi'),
  legacyAdapter('Metso Ase', 'https://www.metsoase.fi'),
  legacyAdapter('Oulun Ase', 'https://www.oulunase.fi'),
  legacyAdapter('Riistamaa', 'https://www.riistamaa.fi'),
  legacyAdapter('Ruoto', 'https://www.ruoto.fi'),
  legacyAdapter('Seponurheilujapatruuna', 'https://www.seponurheilujapatruuna.fi'),
  legacyAdapter('Uittokalusto', 'https://www.uittokalusto.fi'),
  legacyAdapter('Viranomainen', 'https://viranomainen.fi'),

  // New retailers (legacy stubs until adapters land)
  legacyAdapter('Savon Mutka', 'https://savonmutka.fi'),
  legacyAdapter('Verkkoaita', 'https://verkkoaita.com'),
  legacyAdapter('XXL', 'https://www.xxl.fi'),
  legacyAdapter('Commando', 'https://www.commando.fi'),
  legacyAdapter('Olkkonen', 'https://www.olkkonen.fi'),
  legacyAdapter('Eräkellari', 'https://www.erakellari.fi'),
  legacyAdapter('Ähtärin Ase', 'https://www.ahtarinase.fi'),
  legacyAdapter('Välineet Kuntoon', 'https://valineetkuntoon.fi'),
  legacyAdapter('Pyörä-Paja', 'https://pyorapaja.fi'),
];

export function findAdapter(name: string): Adapter | undefined {
  return adapters.find(a => a.name === name);
}
