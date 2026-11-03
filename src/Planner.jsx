import React,{useEffect,useRef,useState} from 'react';
import {api,serverNow} from './api';
import {asset,freshCue,ink,slides,types,workspace} from './workspace';
import {Field,MediaChoice} from './Library';
const blank=()=>({title:'Sunday worship',localStart:'',timezone:'Africa/Accra',location:'',items:[freshCue()],summary:''});
function plannedTime(plan,minutes,saved){
  if(saved?.plan.localStart===plan.localStart && saved.plan.timezone===plan.timezone){
    return new Date(Date.parse(saved.startUtc)+minutes*60000).toLocaleTimeString([],{
      timeZone:plan.timezone,hour:'2-digit',minute:'2-digit'
    });
  }
  return minutes?'start + '+minutes+' min':plan.localStart.slice(11,16);
}
function countdown(seconds){const s=Math.max(0,Math.ceil(seconds));return Math.floor(s/60)+'m '+s%60+'s';}
async function prepare(plan,songs,media){
  const findMedia=id=>{const row=media.find(m=>m.id===id);if(id&&!row)throw Error('Missing background. Edit the service before arming.');return asset(row);};
  const deck=[];
  for(const cue of plan.items){
    const bg=await findMedia(cue.background),pages=[];
    if(cue.action==='Hold'){deck.push([null]);continue;}
    if(cue.action==='Clear'){deck.push([{clear:true}]);continue;}
    if(cue.reference){
      const result=await api('/scripture/search?spoken=true&q='+encodeURIComponent(cue.reference));
      if(!result.passages.length)throw Error('Scripture unavailable: '+cue.reference);
      pages.push(...result.passages.flatMap(p=>p.verses.map(verse=>({...bg,verse,caption:null,clear:false}))));
    }
    for(const id of cue.songs){
      const song=songs.find(s=>s.id===id&&!s.body.archived)?.body;
      if(!song)throw Error('Missing or archived song in '+cue.title);
      const backdrop=cue.background?bg:await findMedia(song.background);
      pages.push(...slides(song).map(s=>({...backdrop,...ink(s)})));
    }
    if(!pages.length)pages.push({...bg,...ink({text:cue.text||cue.title,label:'',style:{align:cue.layout}})});
    deck.push(pages);
  }
  return deck;
}
export function Planner({services,songs,media,act,refresh,projectRaw,override,openProjector,isProjectorOpen,visible,onService,queuedSong,consumeSong}){
  const [view,setView]=useState('Order editor');
  const [plan,setPlan]=useState(blank),[selected,setSelected]=useState(null),[outline,setOutline]=useState(''),[drag,startDrag]=useState(null);
  const [now,setNow]=useState(Date.now()),[current,setCurrent]=useState(null),[page,setPage]=useState(0),[replacement,setReplacement]=useState(null);
  const engine=useRef({row:null,deck:null,hold:true,busy:false,checkedAt:0,epoch:0,queue:Promise.resolve()}).current;
  const editRevision=useRef(null);
  const row=services.find(r=>r.id===selected),run=current?.body.run;
  const edit=(key,value)=>setPlan(p=>({...p,[key]:value}));
  function item(i,changes){edit('items',plan.items.map((x,n)=>n===i?{...x,...changes}:x));}
  function select(r){setView('Order editor');editRevision.current=r?.revision;setSelected(r?.id||null);setPlan(r?structuredClone(r.body.plan):blank());}
  function reorder(from,to){
    if(from==null||to<0||to>=plan.items.length)return;
    const items=[...plan.items];items.splice(to,0,items.splice(from,1)[0]);edit('items',items);startDrag(null);
  }
  function adopt(r){engine.row=r;setCurrent(r);}
  async function cmd(action,value=0){
    const r=engine.row;
    const next=await workspace('/services/'+r.id+'/command','POST',{action,value,revision:r.revision});
    adopt(next);return next;
  }
  function enqueue(fn){const result=engine.queue.then(fn);engine.queue=result.catch(()=>{});return result;}
  function show(index,n=0){const slide=engine.deck?.[index]?.[n];if(slide)projectRaw(slide);setPage(n);}
  function freeze(){engine.hold=true;engine.epoch++;}
  async function pause(){
    if(!engine.row||engine.row.body.run.status==='Completed')return;
    freeze();
    await enqueue(async()=>{if(engine.row.body.run.status!=='Paused')await cmd('pause');});
  }
  override.current={manual:pause,active:()=>engine.row && engine.row.body.run.status!=='Completed'};
  async function control(action,value){
    freeze();
    const epoch=engine.epoch;
    await enqueue(async()=>{
      if(action==='resume'&&!isProjectorOpen())throw Error('Open the projector before resuming.');
      const next=await cmd(action,value);
      if(epoch!==engine.epoch)return;
      if(['next','skip','previous','jump'].includes(action)&&next.body.run.status!=='Completed')show(next.body.run.index);
      if(action==='resume'){
        if(!isProjectorOpen())throw Error('Open the projector before resuming.');
        engine.hold=false;show(next.body.run.index);
      }
      if(next.body.run.status==='Completed'){engine.deck=null;await refresh();}
    });
  }
  async function recover(){
    if(!confirm('Take ownership of this projector session and pause automation?'))return;
    if(!openProjector())throw Error('Allow projector pop-ups, then recover again.');
    const deck=await prepare(row.body.plan,songs,media);
    const next=await workspace('/services/'+row.id+'/command','POST',{action:'recover',revision:row.revision});
    freeze();adopt(next);engine.deck=deck;setView('Live control');await refresh();
  }
  async function arm(){
    if(!openProjector())throw Error('Allow projector pop-ups, then arm again.');
    const deck=await prepare(row.body.plan,songs,media);
    const next=await workspace('/services/'+row.id+'/command','POST',{action:'arm',revision:row.revision});
    adopt(next);engine.deck=deck;engine.hold=false;engine.epoch++;setView('Live control');await refresh();
  }
  useEffect(()=>{
    const interval=setInterval(()=>{
      const time=serverNow();setNow(time);
      const r=engine.row;
      if(engine.busy||engine.hold||!r||!['Armed','Live'].includes(r.body.run.status))return;
      if(!isProjectorOpen()){freeze();act(pause,'Projector closed. Automation paused.');return;}
      if(time<Date.parse(r.body.run.due)){
        if(time-engine.checkedAt<30000)return;
        engine.checkedAt=time;engine.busy=true;
        act(async()=>{
          try{
            const state=await workspace('/services/'+r.id+'/ownership');
            if(engine.row!==r)return;
            if(!state.owned){
              freeze();engine.row=null;engine.deck=null;setCurrent(null);await refresh();
              throw Error('Projector ownership changed. This desk has stopped automation.');
            }
            if(state.revision!==r.revision)throw Error('Run state changed. Refresh before resuming.');
          }catch(e){freeze();throw Error('Automation held. '+e.message);}
          finally{engine.busy=false;}
        });
        return;
      }
      const epoch=engine.epoch;engine.busy=true;
      act(async()=>{
        try{
          await enqueue(async()=>{
            if(engine.hold||epoch!==engine.epoch)return;
            const next=await cmd('tick');
            if(epoch!==engine.epoch)return;
            if(next.body.run.status==='Live'){
              if(serverNow()-Date.parse(next.body.run.actualStart)>10000){
                freeze();await cmd('pause');throw Error('Cue response arrived late. Review before resuming.');
              }
              show(next.body.run.index);
            }
            else if(next.body.run.status==='Paused'){freeze();throw Error('Scheduled cue was missed. Review and resume manually.');}
            else if(next.body.run.status==='Completed'){freeze();await refresh();}
          });
        }catch(e){freeze();throw Error('Automation held. Refresh the run state before resuming. '+e.message);}
        finally{engine.busy=false;}
      });
    },500);
    return ()=>clearInterval(interval);
  },[]);
  async function save(){
    const saved=await workspace(row?'/services/'+row.id+'?revision='+editRevision.current:'/services',row?'PUT':'POST',plan);
    select(saved);await refresh();return saved;
  }
  const displayed=current && current.body.run.status!=='Completed'?current:row;
  useEffect(()=>{onService(displayed||null);},[displayed,onService]);
  if(!visible)return null;
  const active=run&&run.status!=='Completed';
  return <section hidden={!visible} className="card planner"><small>ORDER OF WORSHIP</small><h2>Service Planner</h2>
    {queuedSong&&<div className="queuePrompt"><strong>{queuedSong.body.title}</strong><p>Add this saved song to the open order of worship, then save the draft.</p><button disabled={['Armed','Live','Paused'].includes(row?.body.run.status)} onClick={()=>{edit('items',[...plan.items,{...freshCue(),title:queuedSong.body.title,type:'Praise and worship',songs:[queuedSong.id]}]);setView('Order editor');consumeSong();}}>Add to {plan.title||'service draft'}</button><button onClick={consumeSong}>Cancel</button></div>}
    <nav aria-label="Planner views">{['Order editor','Service schedule','Live control'].map(v=><button key={v} className={v===view?'active':''} onClick={()=>setView(v)}>{v}</button>)}</nav>
    <div hidden={view!=='Service schedule'}><h3>Service schedule</h3>{!services.length&&<p className="muted">Your saved services will appear here.</p>}<div className="entries">{[...services].sort((a,b)=>Date.parse(a.body.startUtc)-Date.parse(b.body.startUtc)).map(r=><button key={r.id} onClick={()=>select(r)}>{r.body.plan.title}<small>{r.body.plan.localStart.replace('T',' ')} · {r.body.plan.timezone} · {r.body.run.status}</small></button>)}</div><button onClick={()=>select(null)}>New service</button></div><div hidden={view!=='Order editor'}>
    <fieldset className="orderForm" disabled={['Armed','Live','Paused'].includes(row?.body.run.status)}><legend>Order of service</legend>
    <div className="planFields"><Field label="Service title" value={plan.title} onChange={v=>edit('title',v)}/><Field label="Local service start" type="datetime-local" value={plan.localStart} onChange={v=>edit('localStart',v)}/><Field label="Timezone" value={plan.timezone} onChange={v=>edit('timezone',v)}/><Field label="Location / branch" value={plan.location} onChange={v=>edit('location',v)}/></div>
    <details><summary>Import order of service</summary><input type="file" accept=".txt" onChange={e=>act(async()=>{const f=e.target.files[0];if(f?.size>100000)throw Error('Outline exceeds 100 KB.');if(f)setOutline(await f.text());})}/><textarea aria-label="Service outline" value={outline} onChange={e=>setOutline(e.target.value)}/>
    <div className="row"><button disabled={!outline.trim()} onClick={()=>edit('items',outline.trim().split(/\r?\n/).filter(Boolean).map(title=>({...freshCue(),type:'Custom item',title})))}>Import lines</button>
    <button disabled={!outline.trim()} onClick={()=>act(async()=>{const draft=await workspace('/assist','POST',{mode:'plan',text:'Service start '+plan.localStart+' '+plan.timezone+'\n'+outline});setPlan(p=>({...p,items:draft.items,summary:draft.summary}));},'Review the proposed items before approving.')}>Prepare service draft</button></div></details>
    {plan.summary&&<blockquote>{plan.summary}</blockquote>}
    {plan.items.map((cue,i)=><details className="timelineItem" key={i} onDragOver={e=>e.preventDefault()} onDrop={()=>reorder(drag,i)}><summary draggable onDragStart={()=>startDrag(i)}>{i+1}. {cue.title} · {cue.minutes} min · {plannedTime(plan,plan.items.slice(0,i).reduce((n,x)=>n+x.minutes,0),row?.body)}</summary>
      <Field label="Item title" value={cue.title} onChange={v=>item(i,{title:v})}/><Field label="Item type" value={cue.type} options={types} onChange={v=>item(i,{type:v})}/><Field label="Duration in minutes" type="number" value={cue.minutes} onChange={v=>item(i,{minutes:Number(v)})}/>
      <label>Supplied lyrics or announcement<textarea value={cue.text} onChange={e=>item(i,{text:e.target.value})}/></label><Field label="Scripture reference" value={cue.reference} onChange={v=>item(i,{reference:v})}/>
      <MediaChoice media={media} value={cue.background} onChange={v=>item(i,{background:v})}/>
      <Field label="Append approved song" value="" options={ [['','Choose song'],...songs.filter(s=>!s.body.archived).map(s=>[s.id,s.body.title])] } onChange={v=>v&&item(i,{songs:[...cue.songs,v]})}/>
      {cue.songs.map((id,n)=><button key={n} onClick={()=>item(i,{songs:cue.songs.filter((_,j)=>j!==n)})}>{n+1}. {songs.find(s=>s.id===id)?.body.title||'Missing song'} ×</button>)}
      <Field label="Layout" value={cue.layout} options={['center','left']} onChange={v=>item(i,{layout:v})}/><Field label="Automation action" options={['Display','Clear','Hold']} value={cue.action} onChange={v=>item(i,{action:v})}/><Field label="Operator notes" value={cue.notes} onChange={v=>item(i,{notes:v})}/>
      <div className="row"><button onClick={()=>reorder(i,i-1)}>Move up</button><button onClick={()=>reorder(i,i+1)}>Move down</button><button onClick={()=>edit('items',plan.items.filter((_,n)=>n!==i))}>Remove item</button></div></details>)}
    {row&&<p>Saved service ends {new Date(row.body.endUtc).toLocaleTimeString([], {timeZone:row.body.plan.timezone})} ({row.body.plan.timezone})</p>}<p>Estimated length · {plan.items.reduce((n,i)=>n+i.minutes,0)} minutes</p>
    <div className="row"><button onClick={()=>edit('items',[...plan.items,{...freshCue(),type:'Custom item',title:'New item'}])}>Add item</button><button onClick={()=>act(save,'Draft saved.')}>Save draft</button>
    <button onClick={()=>act(async()=>{const r=await save();const approved=await workspace('/services/'+r.id+'/command','POST',{action:'approve',revision:r.revision});select(approved);await refresh();},'Reviewed plan scheduled.')}>Approve and schedule</button></div></fieldset>
    {row?.body.run.status==='Scheduled'&&<p>{Date.parse(row.body.startUtc)>now?'Starts in '+countdown((Date.parse(row.body.startUtc)-now)/1000):'Start time passed. Review and schedule a new time.'}</p>}
    <button className="primary" disabled={row?.body.run.status!=='Scheduled'||active||JSON.stringify(plan)!==JSON.stringify(row.body.plan)} onClick={()=>act(arm,'Service armed.')}>Arm Service</button>
    {['Armed','Paused','Live'].includes(row?.body.run.status)&&current?.id!==row.id&&<><button onClick={()=>act(recover,'Controller recovered. Review before resuming.')}>Recover paused control</button><button onClick={()=>{if(confirm('Stop the existing controller and release the shared projector?'))act(async()=>{await workspace('/services/'+row.id+'/command','POST',{action:'release',revision:row.revision});await refresh();});}}>Release existing controller</button></>}
    </div><div hidden={view!=='Live control'}>{!current&&<p>Arm a scheduled service or recover its controller to open live controls.</p>}
    {current&&<fieldset><legend>Live Service Control</legend><strong>{run.status}{engine.hold&&active?' · Automation held':''}</strong>
    <p>Current · {current.body.plan.items[run.index]?.title||'Waiting for start'}</p><p>Next · {current.body.plan.items[run.index+1]?.title||'End of service'}</p>
    <p>Remaining · {countdown(run.due?(Date.parse(run.due)-now)/1000:run.remaining)}</p>
    {run.actualStart&&<p>Item started {new Date(run.actualStart).toLocaleTimeString()} · planned {new Date(Date.parse(current.body.startUtc)+60000*current.body.plan.items.slice(0,run.index).reduce((n,c)=>n+c.minutes,0)).toLocaleTimeString()}</p>}
    <div className="row">{[['pause','Pause Automation'],['resume','Resume Automation'],['previous','Previous Item'],['next','Next Item'],['skip','Skip Item'],['extend','Extend 1 minute'],['stop','Stop Service']].map(([action,label])=><button disabled={!active} key={action} onClick={()=>act(()=>control(action,60))}>{label}</button>)}
    <button onClick={()=>act(async()=>{freeze();await enqueue(async()=>{const rows=await workspace('/services');adopt(rows.find(r=>r.id===current.id));});await pause();},'State refreshed.')}>Sync live controls</button></div>
    <Field label="Jump to item" value={run.index} options={ [['-1','Select item'],...current.body.plan.items.map((c,i)=>[i,c.title])] } onChange={v=>Number(v)>=0&&act(()=>control('jump',Number(v)))}/>
    <div className="row"><button disabled={!page} onClick={()=>act(async()=>{await pause();show(run.index,page-1);})}>Previous cue slide</button><button disabled={page+1>=(engine.deck?.[run.index]?.length||0)} onClick={()=>act(async()=>{await pause();show(run.index,page+1);})}>Next cue slide</button><button onClick={()=>act(async()=>{freeze();projectRaw({clear:true});await pause();})}>Clear Projector</button></div>
    <MediaChoice media={media} value={replacement} onChange={setReplacement}/><button onClick={()=>act(async()=>{await pause();projectRaw(await asset(media.find(m=>m.id===replacement)));})}>Replace background</button></fieldset>}</div>
  </section>;
}
