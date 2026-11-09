import {useMemo} from 'react';
import {Bar,BarChart,CartesianGrid,Cell,LabelList,Legend,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import type {RadiancePoint} from '../../services/blackMarble';

const monthLabel=(period:string)=>{
  const matched=/^(\d{4})-(\d{2})$/.exec(period);
  if(!matched)return period;
  const month=Number(matched[2]);
  if(month<1||month>12)return period;
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1]} ${matched[1]}`;
};

export default function BlackMarbleChart({points}:{points:RadiancePoint[]}){
  const observed=useMemo(()=>[...points].sort((a,b)=>a.period.localeCompare(b.period)),[points]);
  const sparse=observed.length<=2;
  const data=useMemo(()=>{
    const recorded=observed.map(p=>({period:p.period,displayPeriod:monthLabel(p.period),radiance:p.radiance as number|null,validPixels:p.validPixels}));
    // For two observations there is no monthly time series; the comparison
    // chart uses only the actual two periods, with no artificial gaps.
    if(sparse||!recorded.length||!recorded.every(p=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(p.period)))return recorded;
    const [startYear,startMonth]=recorded[0].period.split('-').map(Number);
    const [endYear,endMonth]=recorded[recorded.length-1].period.split('-').map(Number);
    const monthCount=(endYear-startYear)*12+endMonth-startMonth+1;
    if(monthCount>240)return recorded;
    const byMonth=new Map(recorded.map(p=>[p.period,p]));
    return Array.from({length:monthCount},(_,i)=>{
      const offset=startMonth-1+i;
      const period=`${startYear+Math.floor(offset/12)}-${String(offset%12+1).padStart(2,'0')}`;
      return byMonth.get(period)??{period,displayPeriod:monthLabel(period),radiance:null,validPixels:null};
    });
  },[observed,sparse]);
  const commonTooltip={contentStyle:{background:'#0b2337',border:'1px solid #3e748a',color:'#e2f8ff'},formatter:(v:any)=>[v==null?'No measurement':Number(v).toFixed(3)+' nW/cm²/sr','Mean radiance']};
  return <div className={'ton-night-chart'+(sparse?' ton-night-chart--comparison':'')} aria-label={sparse?'NASA nighttime radiance comparison between observed periods':'Nighttime radiance observations over time'}>
    <div className="ton-night-chart-plot"><ResponsiveContainer width="100%" height="100%">
      {sparse?<BarChart data={data} margin={{top:28,right:20,left:4,bottom:6}} barCategoryGap="38%">
        <CartesianGrid stroke="#24445c" strokeDasharray="3 5" vertical={false}/>
        <XAxis dataKey="displayPeriod" tick={{fill:'#c6dce9',fontSize:12}} tickLine={false} axisLine={{stroke:'#3a6078'}}/>
        <YAxis width={58} tick={{fill:'#91adbf',fontSize:11}} domain={[0,'auto']} allowDecimals/>
        <Tooltip {...commonTooltip}/>
        <Bar dataKey="radiance" name="Mean radiance" radius={[7,7,0,0]} maxBarSize={138} isAnimationActive={false}>
          {data.map((p,i)=><Cell key={p.period} fill={i===0?'#63d6ed':'#e7c577'}/>)}
          <LabelList dataKey="radiance" position="top" fill="#d6ebf4" fontSize={12} formatter={(value:any)=>value==null?'':Number(value).toFixed(3)}/>
        </Bar>
      </BarChart>:<LineChart data={data} margin={{top:16,right:20,left:4,bottom:6}}>
        <CartesianGrid stroke="#24445c" strokeDasharray="3 5" vertical={false}/>
        <XAxis dataKey="period" tick={{fill:'#b5cbdb',fontSize:10}}/>
        <YAxis width={55} tick={{fill:'#91adbf',fontSize:10}} domain={[0,'auto']}/>
        <Tooltip {...commonTooltip}/>
        <Legend verticalAlign="top" height={25} wrapperStyle={{color:'#afd3e2',fontSize:11}}/>
        <Line connectNulls={false} dataKey="radiance" name="Mean radiance" stroke="#40dcf3" strokeWidth={2.8} dot={{r:3,fill:'#f5dc8b'}} activeDot={{r:5}} isAnimationActive={false}/>
      </LineChart>}
    </ResponsiveContainer></div>
    {sparse&&<p className="ton-night-chart-caption">Observed values only · {data.length===2?'no intermediate-month readings':'one available period'} · nW/cm²/sr</p>}
  </div>;
}
