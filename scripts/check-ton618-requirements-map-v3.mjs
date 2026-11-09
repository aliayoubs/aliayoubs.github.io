import fs from 'node:fs';
const checks={
  'src/components/map/IntelligenceMap.tsx':['TON618_REQUIREMENTS_METRIC_VISIBILITY_V3','tonRequirementsColor','tonRequirementsGradient','ton-requirements-active','requirementsColor={tonRequirementsColor}',"PLANNING POPULATION","30-DAY WATER","30-DAY FOOD ENERGY"],
  'src/components/map/CadastreCanvas.tsx':['TON618_REQUIREMENTS_METRIC_VISIBILITY_V3','current.requirementsColor(requirementValue!', 'props.requirementsColor'],
};
let problems=0;
for(const [file,labels] of Object.entries(checks)){
  if(!fs.existsSync(file)){console.error('MISSING:',file);problems++;continue;}
  const data=fs.readFileSync(file,'utf8');
  for(const label of labels)if(!data.includes(label)){console.error('MISSING:',file,label);problems++;}
}
if(problems){console.error('FAIL:',problems,'checks missing');process.exitCode=1;}
else console.log('PASS: Requirements metric selector, units, legend and map color changes are installed.');
