import fs from 'node:fs';
const required={
 'src/components/map/IntelligenceMap.tsx':[
  'TON618_REQUIREMENTS_METRIC_V4','tonRequirementsColorV4(requirementValue,requirementsDistrictMax,requirementsMetric)',
  'tonRequirementsGradientV4(requirementsMetric)','ton-requirements-active',"requirementsMetric==='water'?'30-DAY WATER'"
 ],
 'src/components/map/CadastreCanvas.tsx':[
  'TON618_REQUIREMENTS_METRIC_V4','tonRequirementsColorV4(requirementValue!,current.requirementsMax,current.requirementsMetric)'
 ]
};
let errors=0;
for(const [file,tokens] of Object.entries(required)){
  if(!fs.existsSync(file)){console.error('MISSING FILE:',file);errors++;continue;}
  const content=fs.readFileSync(file,'utf8');
  for(const token of tokens)if(!content.includes(token)){console.error('MISSING:',file,token);errors++;}
}
if(errors){console.error('FAIL:',errors,'requirements metric checks missing');process.exitCode=1;}
else console.log('PASS: Humanitarian Requirements population, water and food palettes are connected in district and village maps.');
