/**
 * Real, dated regional-scale imagery from NASA GIBS. Web Mercator XYZ / WMTS
 * REST tiles; exact same bounds are used for the two observations.
 *
 * MODIS Terra corrected reflectance true-color is NOT a building damage layer.
 * Resolution is approximately 250 m and cloud cover may obscure the ground.
 */
export const NASA_GIBS_DOCS = 'https://nasa-gibs.github.io/gibs-api-docs/access-basics/';
export const NASA_WORLDVIEW = 'https://worldview.earthdata.nasa.gov/';
export const NASA_LAYER = 'MODIS_Terra_CorrectedReflectance_TrueColor';
export const NASA_MAX_ZOOM = 9;
export const TILE_EDGE = 256;

export function isObservationDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date && date >= '2000-02-24';
}
export function nasaTileUrl(date: string, z: number, x: number, y: number): string {
  if (!isObservationDate(date)) throw new Error('A valid ISO observation date is required');
  if (!Number.isInteger(z) || z < 0 || z > NASA_MAX_ZOOM) throw new Error('Unsupported NASA zoom');
  const count = 2 ** z;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= count || y >= count) throw new Error('Invalid WMTS tile');
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${NASA_LAYER}/default/${date}/GoogleMapsCompatible_Level9/${z}/${y}/${x}.jpg`;
}
export function worldPixel([lng, lat]: [number, number], zoom: number) {
  const latClamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const phi = latClamped * Math.PI / 180;
  const size = TILE_EDGE * 2 ** zoom;
  return {
    x: (lng + 180) / 360 * size,
    y: (0.5 - Math.log((1 + Math.sin(phi)) / (1 - Math.sin(phi))) / (4 * Math.PI)) * size
  };
}
export interface MapImageTile { key: string; src: string; left: number; top: number }
export function nasaTiles(center: [number, number], date: string, width: number, height: number, zoom = NASA_MAX_ZOOM): MapImageTile[] {
  if (!isObservationDate(date) || width < 1 || height < 1) return [];
  const pt = worldPixel(center, zoom);
  const scale = TILE_EDGE;
  const firstX = Math.floor((pt.x - width/2)/scale) - 1;
  const lastX = Math.floor((pt.x + width/2)/scale) + 1;
  const firstY = Math.floor((pt.y - height/2)/scale) - 1;
  const lastY = Math.floor((pt.y + height/2)/scale) + 1;
  const max = 2 ** zoom;
  const tiles: MapImageTile[] = [];
  for (let y = firstY; y <= lastY; y++) {
    if (y < 0 || y >= max) continue;
    for (let x = firstX; x <= lastX; x++) {
      const col = (x % max + max) % max;
      tiles.push({ key:`${date}-${zoom}-${x}-${y}`, src:nasaTileUrl(date, zoom, col, y), left: x * scale - pt.x + width/2, top: y * scale - pt.y + height/2 });
    }
  }
  return tiles;
}
