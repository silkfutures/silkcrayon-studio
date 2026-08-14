export default function AnalyticsTrend({daily=[],hourly=[],range=30}){
 const width=920,height=260,pad=34;
 const max=Math.max(1,...daily.flatMap(d=>[d.views,d.unique]));
 const x=i=>pad+(daily.length<=1?0:i*(width-pad*2)/(daily.length-1));
 const y=v=>height-pad-(v/max)*(height-pad*2);
 const points=key=>daily.map((d,i)=>`${x(i)},${y(d[key])}`).join(' ');
 const tickEvery=Math.max(1,Math.ceil(daily.length/6));
 const hmax=Math.max(1,...hourly.map(x=>x.count));
 return <div className="analyticsVisuals">
   <div className="analyticsChartCard">
     <div className="analyticsChartHead"><div><p className="eyebrow">Website activity</p><h2>Visits over the last {range} days</h2><p className="muted">Page views and unique visitors by day · Europe/London</p></div><div className="analyticsLegend"><span><i className="viewsDot"/>Page views</span><span><i className="uniqueDot"/>Unique visitors</span></div></div>
     <div className="analyticsSvgWrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Website visits over ${range} days`}>
       {[0,.25,.5,.75,1].map((t,i)=><g key={i}><line x1={pad} x2={width-pad} y1={y(max*t)} y2={y(max*t)} className="chartGrid"/><text x="4" y={y(max*t)+4} className="chartAxis">{Math.round(max*t)}</text></g>)}
       {daily.length>1&&<><polyline points={points('views')} className="chartLine viewsLine"/><polyline points={points('unique')} className="chartLine uniqueLine"/></>}
       {daily.map((d,i)=>i%tickEvery===0||i===daily.length-1?<text key={d.date} x={x(i)} y={height-7} textAnchor="middle" className="chartAxis">{d.label}</text>:null)}
     </svg></div>
   </div>
   <div className="analyticsChartCard"><div className="analyticsChartHead"><div><p className="eyebrow">Time of day</p><h2>When people visit</h2><p className="muted">Page views by hour across the selected period.</p></div></div>
     <div className="hourBars">{hourly.map(h=><div className="hourBarItem" key={h.hour}><div className="hourBarTrack"><span style={{height:`${Math.max(3,h.count/hmax*100)}%`}}/></div><small>{String(h.hour).padStart(2,'0')}</small><b>{h.count}</b></div>)}</div>
   </div>
 </div>
}
