import type { VillageAssessment } from '../types';
// Illustrative scenario inputs. Every number here is fictional; never use operationally.
const examples: Record<string,[number,number,number,number,number,number,number,number,number[]]> = {
 'bint-jbeil':[12000,4200,1100,5800,1160,580,2100,730,[6.8,6.7,5.1,4.8,5.4,5.9]],
 'khiam':[9800,3400,900,4500,900,390,1600,470,[7.2,7.1,6.1,5.2,5.8,6.3]],
 'nabatieh':[20000,2700,1600,3900,780,260,3000,390,[8.2,8.1,7.6,7.9,8.0,8.1]],
 'marjayoun':[6100,1600,760,2100,420,180,920,200,[7.7,7.5,7.0,6.8,7.2,7.4]],
 'aitaroun':[4300,2200,460,2400,480,260,870,360,[5.9,6.1,4.9,4.2,4.8,5.0]],
 'meiss-el-jabal':[5000,2450,540,2600,520,270,980,380,[5.8,5.7,4.5,4.1,4.7,5.1]],
 'kfar-kila':[3800,1600,420,1800,360,195,710,290,[5.6,5.8,4.9,4.1,4.3,4.8]],
 'tebnine':[6500,1300,550,1900,380,100,1080,200,[6.9,7.0,6.8,6.5,6.7,6.9]],
 'maroun-el-ras':[2500,1000,320,1400,280,155,520,225,[5.5,5.7,4.1,3.9,4.2,4.5]],
 'aita-al-shaab':[3000,1300,330,1700,340,210,620,285,[6.0,6.1,4.8,4.0,4.3,4.9]],
 'tyre':[18000,1800,1200,3100,620,180,2200,180,[8.1,8.3,7.9,7.8,7.9,8.2]]
};
export const DEMO_PERIODS=['T−5','T−4','T−3','T−2','T−1','T'];
export const demoAssessments: Record<string,VillageAssessment> = Object.fromEntries(Object.entries(examples).map(([id,a])=>[id,{
 villageId:id,baselinePopulation:a[0],displacedOrigins:a[1],returnees:a[2],populationInNeed:a[3],affectedHouseholds:a[4],shelterHouseholds:a[5],buildingsAssessed:a[6],buildingsDamaged:a[7],
 nightlights:a[8].map((radiance,i)=>({period:DEMO_PERIODS[i],radiance})),
 provenance:[{dataset:'TON 618 invented example scenario',organization:'TON 618 demo',geographicUnit:'settlement',metric:'all figures',unit:'illustrative units',quality:'illustrative'}]
}]));
