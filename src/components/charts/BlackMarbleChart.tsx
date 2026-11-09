import {useMemo} from 'react';
import {CartesianGrid,Legend,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import type {RadiancePoint} from '../../services/blackMarble';
export default function BlackMarbleChart({points}:{points:RadiancePoint[]}){
  const data=useMemo(()=>{
    const observed=points.map(p=>({period:p.period,radiance:p.radiance as number|null,validPixels:p.validPixels}));
    // Published years can be missing. Leave visible gaps rather than drawing a
    // false continuous brightness trend from December 2023 to January 2025.
    if(!observed.length||!observed.every(p=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(p.period)))return observed;
    const sorted=[...observed].sort((a,b)=>a.period.localeCompare(b.period));
    const [startYear,startMonth]=sorted[0].period.split('-').map(Number);
    const [endYear,endMonth]=sorted[sorted.length-1].period.split('-').map(Number);
    const monthCount=(endYear-startYear)*12+endMonth-startMonth+1;
    if(monthCount>240)return observed;
    const observedByMonth=new Map(sorted.map(p=>[p.period,p]));
    return Array.from({length:monthCount},(_,i)=>{
      const offset=(startMonth-1)+i;
      const period=`${startYear+Math.floor(offset/12)}-${String(offset%12+1).padStart(2,'0')}`;
      return observedByMonth.get(period)??{period,radiance:null,validPixels:null};
    });
  },[points]);
  return <div className="ton-night-chart" aria-label="Published or imported nighttime-light mean radiance time series">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{top:16,right:20,left:4,bottom:6}}>
        <CartesianGrid stroke="#24445c" strokeDasharray="3 5" vertical={false}/>
        <XAxis dataKey="period" tick={{fill:'#b5cbdb',fontSize:10}}/>
        <YAxis width={55} tick={{fill:'#91adbf',fontSize:10}} domain={[0,'auto']}/>
        <Tooltip contentStyle={{background:'#0b2337',border:'1px solid #3e748a',color:'#e2f8ff'}} formatter={(v:any,name:any)=>[v==null?'No measurement':Number(v).toFixed(3)+' nW/cm²/sr',name]}/>
        <Legend verticalAlign="top" height={25} wrapperStyle={{color:'#afd3e2',fontSize:11}}/>
        <Line connectNulls={false} dataKey="radiance" name="Mean radiance" stroke="#40dcf3" strokeWidth={2.8} dot={{r:3,fill:'#f5dc8b'}} activeDot={{r:5}} isAnimationActive={false}/>
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
