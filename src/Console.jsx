import React from 'react';
import {Slide} from './projector';

const paths={
 desk:'M3 4h18v12H3z M8 20h8 M12 16v4',
 song:'M9 17V5l11-2v12 M9 17a3 3 0 1 1-3-3h3 M20 15a3 3 0 1 1-3-3h3',
 book:'M12 6q-4-3-9-2v14q5-1 9 2 4-3 9-2V4q-5-1-9 2v14',
 image:'M3 4h18v16H3z M3 17l6-6 4 4 3-3 5 5 M16 8h.01',
 library:'M3 5h7l2 2h9v13H3z M6 11h12',
 plan:'M3 6h18v15H3z M7 3v6 M17 3v6 M3 11h18 M7 15h3 M14 15h3',
 mic:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0z M5 11v1a7 7 0 0 0 14 0v-1 M12 19v3 M8 22h8',
 text:'M4 5h16 M4 10h16 M4 15h12 M4 20h8',
 play:'M7 4l13 8-13 8z', clear:'M4 6h16v13H4z M8 12h8',
 black:'M4 5h16v14H4z M5 17L18 6', sun:'M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
 moon:'M19 16A8 8 0 0 1 8 5a8.5 8.5 0 1 0 11 11z',
 arrow:'M5 12h14 M14 7l5 5-5 5', queue:'M8 6h13 M8 12h10 M8 18h7 M3 6h.01 M3 12h.01 M3 18h.01',
 expand:'M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6',
 lock:'M6 10h12v11H6z M9 10V7a3 3 0 1 1 6 0v3', preview:'M2 12q10-14 20 0-10 14-20 0z M9.5 12a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0',
};
export function Icon({name,size=19}){
 return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}
export const sections=[['Desk','Live Desk','desk'],['Scripture','Scripture','book'],['Songs','Songs','song'],['Backgrounds','Backgrounds','image'],['Media Library','Media Library','library'],['Service Planner','Service Planner','plan']];
export function Sidebar({tab,choose}){
 return <aside className="sidebar"><div className="brand"><span className="brandMark"><Icon name="book" size={25}/></span><div><strong>Bible Echo</strong><span>Worship Workspace</span></div></div>
 <nav aria-label="Workspace tools"><small>WORKSPACE</small>{sections.map(([id,name,icon])=><button key={id} aria-current={tab===id?'page':undefined} onClick={()=>choose(id)}><Icon name={icon}/>{name}</button>)}</nav>
 <div className="railSignature"><span className="railCross" aria-hidden="true">✝</span><span>Bible Echo</span></div></aside>;
}
export function Monitor({slide,staged,preview,setPreview,goLive,openProjector,update}){
 const shown=preview&&staged?staged:slide;
 const title=shown.clear?'Screen blacked out':shown.caption?.label||shown.verse?.formattedReference||(shown.image?'Background only':'Standing by');
 return <section className="card monitorPanel"><div className="panelHead"><span className="iconTitle"><Icon name="desk"/><h2>Projection monitor</h2></span><span className="badge">{preview&&staged?'Preview':'Output'} · 16:9</span></div>
 <div className="monitor consoleScreen"><Slide slide={shown}/>{!shown.clear&&!shown.caption&&!shown.verse&&!shown.image&&<div className="standby"><span className="hairline"/>Audience display<strong>Ready for projection</strong><span className="hairline"/></div>}</div>
 <div className="monitorBar"><span className="signal"/>{title}<button className="textButton" onClick={openProjector}><Icon name="expand" size={15}/>Open projector</button></div>
 <div className="transport"><button aria-pressed={preview} disabled={!staged} onClick={()=>setPreview(!preview)}><Icon name="preview"/>Preview</button><button className="primary" disabled={!staged} onClick={goLive}><Icon name="play"/>Go live</button><button onClick={()=>{setPreview(false);update({verse:null,caption:null,clear:false});}}><Icon name="clear"/>Clear text</button><button aria-pressed={slide.clear} onClick={()=>{setPreview(false);update({clear:!slide.clear});}}><Icon name="black"/>{slide.clear?'Restore screen':'Blackout'}</button></div>
 <details className="displaySettings"><summary>Display settings</summary><label htmlFor="size">Scripture text size</label><input id="size" type="range" min="3" max="8" step=".25" value={slide.size} onChange={e=>update({size:Number(e.target.value)})}/><p className="muted">Choose Fullscreen in the projector window on your audience display.</p></details></section>;
}
export function ServiceRail({service,slide,choose,auxiliary}){
 const plan=service?.body.plan,run=service?.body.run;
 const index=['Live','Paused'].includes(run?.status)?run.index:-1;
 const output=slide.clear?'Blackout':slide.verse?.formattedReference||slide.caption?.label||slide.caption?.text|| (slide.image?'Background only':'Standing by');
 return <aside className="serviceRail"><section className="card"><div className="panelHead"><span className="iconTitle"><Icon name="queue"/><h2>Service queue</h2></span></div>
 <div className="onAir"><small>AUDIENCE OUTPUT</small><strong>{output}</strong></div>
 {plan?<><h3>{plan.title}</h3><p className="muted">{run.status} · {plan.localStart.replace('T',' ')}</p><ol className="cueList">{plan.items.map((item,i)=><li key={i} className={i===index?'currentCue':''}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{item.title}</strong><small>{i===index?'Now playing':i===index+1&&run.status!=='Completed'?'Up next':item.type} · {item.minutes} min</small></div></li>)}</ol></>:<div className="emptyQueue"><Icon name="plan" size={28}/><strong>No service selected</strong><p>Plan your order of worship to see upcoming cues here.</p></div>}
 <button className="wide" onClick={()=>choose('Service Planner')}>Open service planner <Icon name="arrow" size={15}/></button></section>
 {auxiliary}<section className="card shortcuts"><small>QUICK ACCESS</small>{[['Scripture','Find a scripture','book'],['Songs','Prepare a song','song'],['Backgrounds','Create a background','image']].map(([tab,label,icon])=><button key={tab} onClick={()=>choose(tab)}><Icon name={icon}/>{label}<Icon name="arrow" size={15}/></button>)}</section></aside>;
}

