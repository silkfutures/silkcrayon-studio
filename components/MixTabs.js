"use client";
import {useState} from 'react';
export function MixTab({children}){return children;}
export default function MixTabs({children}){
 const panes=Array.isArray(children)?children:[children];
 const tabs=panes.filter(p=>p?.props?.title);
 const [active,setActive]=useState('Tracks and deliverables');
 const current=tabs.find(t=>t.props.title===active)||tabs[0];
 return <section className="mixTabsRoot" aria-label="Mix job workspaces">
 <div className="mixTabsBar" role="tablist" aria-label="Mix management sections">{tabs.map((t,i)=><button key={t.props.title} id={`mix-tab-${i}`} className={current===t?'mixTabActive':''} type="button" role="tab" aria-selected={current===t} aria-controls="mix-tab-panel" onClick={()=>setActive(t.props.title)}>{t.props.title}</button>)}</div>
 <div id="mix-tab-panel" role="tabpanel" aria-labelledby={`mix-tab-${tabs.indexOf(current)}`} className="mixTabsPanel">{current?.props.children}</div>
 </section>;
}
