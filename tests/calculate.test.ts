import { describe,it,expect } from 'vitest';
import { calculateAidRequirements } from '../src/utils/calculate';
const sample={people:1000,days:7,households:200,shelterHouseholds:65,waterLitersPerPersonDay:15,shelterKitHouseholds:1,hygieneKitHouseholds:1};
describe('humanitarian resource calculator',()=>{
 it('computes water and food person-days',()=>{const r=calculateAidRequirements(sample);expect(r.waterLiters).toBe(105000);expect(r.waterCubicMeters).toBe(105);expect(r.foodPersonDays).toBe(7000);expect(r.foodEnergyKcalTarget).toBe(14700000);});
 it('responds to changing the planning period',()=>{expect(calculateAidRequirements({...sample,days:30}).waterLiters).toBe(450000);});
 it('rounds kits up according to coverage',()=>{const r=calculateAidRequirements({...sample,shelterKitHouseholds:2,hygieneKitHouseholds:3});expect(r.shelterKits).toBe(33);expect(r.hygieneKits).toBe(67);});
 it('does not invent a supply gap without stock data',()=>{expect(calculateAidRequirements(sample).unmetWaterLiters).toBeUndefined();});
 it('clamps supply gap at zero',()=>{expect(calculateAidRequirements({...sample,availableWaterLiters:200000}).unmetWaterLiters).toBe(0);});
 it('computes independent stock gaps without assuming unknown stocks are zero',()=>{const r=calculateAidRequirements({...sample,availableFoodPersonDays:5000,availableShelterKits:15,availableHygieneKits:40});expect(r.unmetFoodPersonDays).toBe(2000);expect(r.unmetShelterKits).toBe(50);expect(r.unmetHygieneKits).toBe(160);expect(r.unmetWaterLiters).toBeUndefined();});
 it('rejects invalid values',()=>{expect(()=>calculateAidRequirements({...sample,people:-1})).toThrow();expect(()=>calculateAidRequirements({...sample,shelterKitHouseholds:0})).toThrow();});
});
