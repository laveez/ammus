import type {Adapter} from '../lib/adapter.js';
import {legacyAdapter} from './_legacy.js';
import {aawee} from './aawee.js';
import {sissos} from './sissos.js';

/**
 * Registry of all known retailer adapters. Order has no semantic meaning —
 * the orchestrator runs them in parallel up to CONCURRENCY.
 *
 * To add a retailer:
 *   1. Create `adapters/<name>.ts` exporting an `Adapter`.
 *   2. Import + add to this array.
 *   3. (optional) Add an entry to `src/data/retailers.json` for static
 *      delivery rule data; the adapter's `delivery()` may override this when
 *      it succeeds.
 */
export const adapters: Adapter[] = [
  // Adapters with discover() + delivery() implemented
  aawee,
  sissos,

  // Legacy stubs — preserve current behavior while incremental migration
  // happens. Replace each `legacyAdapter(...)` with a real adapter file as
  // discovery/delivery support is added per retailer.
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
  legacyAdapter('Kärkkäinen', 'https://www.karkkainen.com'),
  legacyAdapter('Metso Ase', 'https://www.metsoase.fi'),
  legacyAdapter('Motonet', 'https://www.motonet.fi'),
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
