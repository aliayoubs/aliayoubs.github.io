import {describe,it,expect} from 'vitest';
import {findVillages,STUDY_AREA_IDS,villages} from '../src/data/villages';
import {getAssessment} from '../src/services/dataService';
describe('bilingual village search and selection',()=>{
 it('finds Khiam with English or Arabic',()=>{expect(findVillages('Khiam')[0]?.id).toBe('khiam');expect(findVillages('الخيام')[0]?.id).toBe('khiam');});
 it('preserves Arabic names',()=>{expect(findVillages('بنت جبيل')[0]?.id).toBe('bint-jbeil')});
 it('keeps GeoJSON coordinates in longitude, latitude order',()=>{expect(villages.find(v=>v.id==='bint-jbeil')?.coordinates).toEqual([35.43361,33.12083])});
 it('supports 13 areas (original ten plus three Sour) and preserves the original six',()=>{
   expect(STUDY_AREA_IDS.length).toBe(13);
   const ids = new Set(villages.map(v=>v.id));
   for(const id of STUDY_AREA_IDS) expect(ids.has(id)).toBe(true);
   expect(STUDY_AREA_IDS.slice(0,6)).toEqual(['bint-jbeil','aitaroun','meiss-el-jabal','aita-al-shaab','kfar-kila','tyre']);
 });
 it('searches newly added areas using English and Arabic',()=>{
   expect(findVillages('Blida').some(v=>v.id==='blida')).toBe(true);
   expect(findVillages('الطيبة').some(v=>v.id==='taybeh-marjayoun')).toBe(true);
   expect(findVillages('عيناتا').some(v=>v.id==='aynata-bint-jbeil')).toBe(true);
   expect(findVillages('شقرا').some(v=>v.id==='chaqra')).toBe(true);
   expect(findVillages('قانا').some(v=>v.id==='qana')).toBe(true);
   expect(findVillages('معركة').some(v=>v.id==='maarakeh')).toBe(true);
   expect(findVillages('العباسية').some(v=>v.id==='abbassiyeh')).toBe(true);
 });
 it('never substitutes demo data in verified mode',()=>{expect(getAssessment('khiam','verified')).toBeNull();expect(getAssessment('khiam','demo')?.populationInNeed).toBeGreaterThan(0)});
});
