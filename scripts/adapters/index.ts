import type {Adapter} from '../lib/adapter.js';
import {legacyAdapter} from './_legacy.js';
import {aawee} from './aawee.js';
import {asejaera} from './asejaera.js';
import {asenurkka} from './asenurkka.js';
import {asepajavuorela} from './asepajavuorela.js';
import {erahaijaa} from './erahaijaa.js';
import {erakala} from './erakala.js';
import {erakolmio} from './erakolmio.js';
import {greentrail} from './greentrail.js';
import {karkkainen} from './karkkainen.js';
import {kurre} from './kurre.js';
import {metsoase} from './metsoase.js';
import {motonet} from './motonet.js';
import {oulunase} from './oulunase.js';
import {ruoto} from './ruoto.js';
import {savonmutka} from './savonmutka.js';
import {seponurheilujapatruuna} from './seponurheilujapatruuna.js';
import {sissos} from './sissos.js';
import {uittokalusto} from './uittokalusto.js';
import {verkkoaita} from './verkkoaita.js';

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
  asejaera,
  asenurkka,
  asepajavuorela,
  erahaijaa,
  erakala,
  erakolmio,
  greentrail,
  karkkainen,
  kurre,
  metsoase,
  motonet,
  oulunase,
  ruoto,
  savonmutka,
  seponurheilujapatruuna,
  sissos,
  uittokalusto,
  verkkoaita,

  // Legacy stubs — preserve current behavior. Replace each with a real
  // adapter file as discovery/delivery support is added per retailer.
  // Verify each retailer's category-page URL pattern by visiting the site
  // before writing an adapter.
  legacyAdapter('Ahtihuvila', 'https://www.ahtihuvila.fi'),
  legacyAdapter('Arcis', 'https://www.arcis.fi'),
  legacyAdapter('Asejaosa', 'https://www.asejaosa.fi'),
  legacyAdapter('Asetalo', 'https://www.asetalo.fi'),
  legacyAdapter('Iron Point', 'https://www.ironpoint.fi'),
  legacyAdapter('Riistamaa', 'https://www.riistamaa.fi'),
  legacyAdapter('Viranomainen', 'https://viranomainen.fi'),

  // New retailers (legacy stubs until adapters land)
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
