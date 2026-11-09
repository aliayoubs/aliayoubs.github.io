import {describe,expect,it} from 'vitest';
import {buildSceneTileTemplate,buildStacSearchUrl,offsetDate,parseSceneResults,renderedSceneTile} from '../src/services/sentinel';
const center:[number,number]=[35.44,33.16];
describe('dated Sentinel-2 scene handling',()=>{
 it('produces an anchored search date window',()=>{
  const u=new URL(buildStacSearchUrl(center,'2026-06-16'));
  expect(u.searchParams.get('datetime')).toBe('2026-05-23T00:00:00Z/2026-07-10T23:59:59Z');
  expect(u.searchParams.get('collections')).toBe('sentinel-2-l2a');
  expect(offsetDate('2025-10-23',-1)).toBe('2025-10-22');
 });
 it('sorts scenes near date and filters non-local footprints',()=>{
  const items=[
   {id:'far',bbox:[-10,0,-5,5],properties:{datetime:'2026-06-16T10:00:00Z'}},
   {id:'close',bbox:[35,33,36,34],properties:{datetime:'2026-06-17T10:00:00Z','eo:cloud_cover':10}},
   {id:'cloudy',bbox:[35,33,36,34],properties:{datetime:'2026-06-16T10:00:00Z','eo:cloud_cover':95}},
  ];
  const scenes=parseSceneResults({features:items},center,'2026-06-16');
  expect(scenes.map(s=>s.id)).toEqual(['close','cloudy']);
  expect(scenes[0].acquired).toBe('2026-06-17');
  expect(scenes[0].cloudCover).toBe(10);
 });
 it('builds a true-color tile URL for the chosen dated scene',()=>{
  const template=buildSceneTileTemplate('scene_123');
  const tile=renderedSceneTile({id:'scene_123',acquired:'2026-06-16',timestamp:'2026-06-16',cloudCover:null,platform:'Sentinel-2',tileTemplate:template},12,2450,1611);
  expect(tile).toContain('/12/2450/1611@1x?');
  expect(tile).toContain('item=scene_123');
  expect(tile).toContain('assets=visual');
 });
});
