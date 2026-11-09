import { useEffect, useState } from 'react';
import { loadBlackMarbleAdm3, type BlackMarbleAdm3Data } from './ton618BlackMarbleAdm3';
import { loadFirmsAdm3, type FirmsAdm3Data } from './ton618FirmsAdm3';

export type SatelliteSource<T> =
  | { status: 'loading'; data: null }
  | { status: 'ready'; data: T }
  | { status: 'error'; data: null };
export type SatelliteSources = {
  blackMarble: SatelliteSource<BlackMarbleAdm3Data>;
  firms: SatelliteSource<FirmsAdm3Data>;
};
const waiting = { status: 'loading', data: null } as const;
let cache: SatelliteSources = { blackMarble: waiting, firms: waiting };
const listeners = new Set<(next: SatelliteSources) => void>();
let started = false;
function update(next: Partial<SatelliteSources>) {
  cache = { ...cache, ...next };
  for (const listener of listeners) listener(cache);
}
function start() {
  if (started) return;
  started = true;
  void loadBlackMarbleAdm3().then(data => update({ blackMarble: { status: 'ready', data } }))
    .catch(() => update({ blackMarble: { status: 'error', data: null } }));
  void loadFirmsAdm3().then(data => update({ firms: { status: 'ready', data } }))
    .catch(() => update({ firms: { status: 'error', data: null } }));
}
/** A single cached nationwide satellite request set, never one fetch per village. */
export function useVillageSatelliteLayers(): SatelliteSources {
  const [sources, setSources] = useState<SatelliteSources>(() => cache);
  useEffect(() => {
    listeners.add(setSources);
    start();
    setSources(cache);
    return () => { listeners.delete(setSources); };
  }, []);
  return sources;
}
