import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {listen} from './audio';
import {spokenVerseIndex} from './spokenNavigation';
import {api} from './api';
import {Projector,Slide,initialSlide} from './projector';
import {Library,Field} from './Library';
import {Songs} from './Songs';
import {Planner} from './Planner';
import {categories,upload,workspace} from './workspace';
import {Icon,Monitor,ServiceRail,Sidebar,sections} from './Console';
import {operatorMessage} from './messages';
import './style.css';

function deskId(){
  const previous=sessionStorage.getItem('echo-projector-desk');
  const reloaded=performance.getEntriesByType('navigation')[0]?.type==='reload';
  const id=reloaded&&previous?previous:crypto.randomUUID();
  sessionStorage.setItem('echo-projector-desk',id);return id;
}
function Desk(){
  const [error,setError]=useState('');
  const [mic,setMic]=useState('Off'),[transcript,setTranscript]=useState([]),[history,setHistory]=useState([]);
  const [auto,setAuto]=useState(true),autoRef=useRef(true),stopRef=useRef(),session=useRef(0);
  const [query,setQuery]=useState(''),[searching,setSearching]=useState(false);
  const [passage,setPassage]=useState(null),[index,setIndex]=useState(0);
  const [referenceHint,setReferenceHint]=useState('');
  const projectedPassage=useRef(null);
  const [slide,setSlide]=useState(initialSlide),live=useRef(slide),bus=useRef(),desk=useRef(null);
  if(!desk.current)desk.current=deskId();
  const [prompt,setPrompt]=useState(''),[image,setImage]=useState(''),[generating,setGenerating]=useState(false);
  const [dark,setDark]=useState(()=>localStorage.getItem('echo-theme')!=='light'),[tab,setTab]=useState('Desk');
  const [preview,setPreview]=useState(false),[service,setService]=useState(null),[queuedSong,setQueuedSong]=useState(null);
  useEffect(()=>{localStorage.setItem('echo-theme',dark?'dark':'light');},[dark]);
  const verse=passage?.verses[index];
  const override=useRef(null),projector=useRef(null);
  const [key,setKey]=useState(sessionStorage.getItem('echo-key')||''),[unlocked,unlock]=useState(false);
  const [data,setData]=useState({media:[],songs:[],services:[]}),[notice,setNotice]=useState('');
  const [genPrompt,setGenPrompt]=useState(''),[saveTitle,setSaveTitle]=useState(''),[saveCat,setSaveCat]=useState('Worship'),[saved,setSaved]=useState(false),[saving,setSaving]=useState(false);
  async function refresh(){
    const [media,songs,services]=await Promise.all(['media','songs','services'].map(k=>workspace('/'+k)));
    setData({media,songs,services});unlock(true);
  }
  async function act(fn,message){
    try{setError('');await fn();if(message)setNotice(message);}
    catch(e){setError(e.message||'Action failed.');}
  }
  useEffect(()=>{if(sessionStorage.getItem('echo-key'))act(refresh);},[]);
  async function saveImage(){
    setSaving(true);
    try{
      const result=await fetch(image);
      if(!result.ok)throw Error('Image download failed. Generate a fresh preview.');
      await upload(await result.blob(),saveTitle,saveCat,genPrompt);setSaved(true);await refresh();
    }finally{setSaving(false);}
  }
  useEffect(()=>{
    api('/health').catch(()=>{});
    const channel=new BroadcastChannel('bible-echo:'+desk.current);bus.current=channel;
    channel.onmessage=e=>{if(e.data.type==='ready')channel.postMessage({type:'slide',slide:live.current});};
    return ()=>channel.close();
  },[]);
  function update(fields){
    // Manual controls latch the controller synchronously, including during an API round trip.
    if(override.current?.active())act(()=>override.current.manual());
    updateRaw(fields);
  }
  function updateRaw(fields){
    if('verse' in fields && !('caption' in fields))fields={...fields,caption:null};
    live.current={...live.current,...fields};setSlide(live.current);
    bus.current?.postMessage({type:'slide',slide:live.current});
  }
  function select(p){setPassage(p);setIndex(0);}
  function projectVerse(p,i){
    setPreview(false);projectedPassage.current=p;
    setPassage(p);setIndex(i);
    update({verse:p.verses[i],clear:false});
  }
  async function search(e){
    e.preventDefault();setSearching(true);setError('');
    try{
      const {passages}=await api('/scripture/search?q='+encodeURIComponent(query));
      select(passages[0] || null);
      if (!passages.length)setError('No KJV passage matched that search.');
    }catch(e){setError(e.message);}finally{setSearching(false);}
  }
  async function toggleMic(){
    setError('');
    if(mic==='Listening'){setMic('Finishing');await stopRef.current();setMic('Off');return;}
    setMic('Starting');
    let previous='',lastRef='';
    const id=++session.current;
    try{
      stopRef.current=await listen(async blob=>{
        const context=previous;
        const response=await api('/transcribe?'+new URLSearchParams({detect:'true',preceding:context}),{method:'POST',body:blob});
        const text=response.transcript;
        if(!text.trim() || session.current!==id)return;
        setTranscript(lines=>[...lines.slice(-199),text]);
        previous=(previous+' '+text).trim().split(/\s+/).slice(-24).join(' ').slice(-300);
        const {passages,unresolved=[]}=response.passages ? response : await api('/scripture/search?spoken=true&'+new URLSearchParams({q:text.slice(-2000),preceding:context}));
        if(session.current!==id)return;
        if(unresolved.length){setReferenceHint(unresolved.join(' '));lastRef='';}
        else if(passages.length)setReferenceHint('');
        for(const p of passages){
          if(lastRef===p.reference && live.current.verse?.id===p.verses[0].id && !live.current.clear)continue;
          lastRef=p.reference;
          setHistory(list=>[p,...list.filter(item=>item.reference!==p.reference)].slice(0,30));
          select(p);
          if(autoRef.current && !override.current?.active()) projectVerse(p,0);
        }
        if(!passages.length && !unresolved.length && autoRef.current && !override.current?.active()){
          const p=projectedPassage.current;
          const next=spokenVerseIndex(text,p,live.current,context);
          if(next>=0)projectVerse(p,next);
        }
      },msg=>{session.current++;setError(msg);setMic('Off');});
      setMic('Listening');
    }catch(e){setMic('Off');setError(e.message);}
  }
  async function navigate(n){
    const next=index+n;
    let target=passage?.verses[next],targetPassage=passage,targetIndex=next;
    if(target)setIndex(next);
    else if(verse && passage.verses.length===1){
      setSearching(true);setError('');
      try{
        const ref=verse.book+' '+verse.chapter+':'+(verse.verse+n);
        const {passages}=await api('/scripture/search?spoken=true&q='+encodeURIComponent(ref));
        if(!passages.length){setError('Reached the chapter boundary. Look up the next passage to continue.');return;}
        select(passages[0]);targetPassage=passages[0];targetIndex=0;target=targetPassage.verses[0];
      }catch(e){setError(e.message);return;}finally{setSearching(false);}
    }
    if(target && !preview && verse.id===live.current.verse?.id && !live.current.clear)projectVerse(targetPassage,targetIndex);
  }
  async function generate(e){
    e.preventDefault();setGenerating(true);setError('');
    try{
      const data=await api('/backgrounds/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});
      const preview=new Image();preview.src=data.image;await preview.decode();setImage(data.image);setGenPrompt(prompt);setSaveTitle(prompt.slice(0,80));setSaved(false);
    }catch(e){setError(e.message);}finally{setGenerating(false);}
  }
  function openProjector(){
    if(projector.current && !projector.current.closed)return projector.current;
    const w=window.open('','projector_'+desk.current,'popup,width=1100,height=700');
    if(!w)setError('Allow pop-ups for this site to open the projector.');
    if(w){
      const path='/projector?desk='+desk.current;
      // Reattach to the existing audience after an operator reload without clearing it.
      if(w.location.pathname+w.location.search!==path)w.location.replace(new URL(path,location.origin).href);
    }
    projector.current=w;return w;
  }

  function choose(id){setTab(id);setPreview(false);setError('');setNotice('');}
  const title=sections.find(([id])=>id===tab)[1];
  const activeService=(service&&['Armed','Live','Paused'].includes(service.body.run.status)?service:null)||data.services.find(r=>['Armed','Live','Paused'].includes(r.body.run.status))||service||
    data.services.filter(r=>r.body.run.status==='Scheduled').sort((a,b)=>Date.parse(a.body.startUtc)-Date.parse(b.body.startUtc))[0];
  const staged=tab==='Backgrounds'&&image?{...slide,image,media:null,clear:false}:
    (tab==='Desk'||tab==='Scripture')&&verse?{...slide,verse,caption:null,clear:false}:null;
  const monitor=<Monitor slide={slide} staged={staged} preview={preview} setPreview={setPreview} update={update} openProjector={openProjector}
    goLive={()=>{if(!openProjector())return;if(tab==='Backgrounds'&&image)update({image,media:null,clear:false});else if(verse)projectVerse(passage,index);setPreview(false);}}/>;
  const scripture=<section className="card"><div className="panelHead"><span className="iconTitle"><Icon name="book"/><h2>Scripture lookup</h2></span><span className="badge">KJV</span></div>
      <form onSubmit={search}><label htmlFor="lookup">Reference or passage keywords</label><div className="row"><input id="lookup" required maxLength="2000" value={query} onChange={e=>setQuery(e.target.value)} placeholder="John 3:16–18"/><button disabled={searching}>{searching?'Searching…':'Search'}</button></div></form>
      {verse && <blockquote><small>KJV · {verse.formattedReference}</small><p>{verse.text}</p></blockquote>}
      <div className="row"><button disabled={searching || !verse || (!index && !(passage.verses.length===1 && verse.verse>1))} onClick={()=>navigate(-1)}>Previous</button><button disabled={searching || !verse || (passage.verses.length>1 && index+1>=passage.verses.length)} onClick={()=>navigate(1)}>Next</button><button className="primary" disabled={!verse} onClick={()=>projectVerse(passage,index)}>Project verse</button></div>
    </section>;
  const background=<section className="card"><small>BACKGROUND STUDIO</small><h2>Create a background</h2><p className="muted">Describe the scene you want behind your next scripture or song.</p><div className="promptIdeas">{[['Evening hills','Quiet hills at sunset, soft layers of blue, no text'],['Stained glass','Soft light through blue stained glass, gentle shadows, no text'],['Still waters','A calm lake at dawn, delicate mist and open sky, no text']].map(([name,idea],i)=><button key={name} className={'idea idea'+i} onClick={()=>setPrompt(idea)}>{name}</button>)}</div><form onSubmit={generate}><label htmlFor="prompt">Describe a background</label><textarea id="prompt" required maxLength="1500" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Soft evening light over a quiet mountain ridge"/><button className="primary" disabled={generating || !prompt.trim()}>{generating?'Generating…':'Generate image'}</button></form>
    {image && <img className="generated" src={image} alt="Generated worship background preview"/>}<div className="row"><button onClick={()=>choose("Media Library")}>Browse saved media</button><button disabled={!image || generating} onClick={()=>update({image,media:null,clear:false})}>Apply to projector</button><button onClick={()=>update({image:'',media:null})}>Restore default</button></div>
    {image&&<fieldset><legend>Save generated background</legend><Field label="Background name" value={saveTitle} onChange={setSaveTitle}/><Field label="Background category" options={categories} value={saveCat} onChange={setSaveCat}/><button disabled={!unlocked||saved||saving||generating||!saveTitle.trim()} onClick={()=>act(saveImage,'Background saved to the shared media library.')}>{saved?'Saved':saving?'Saving…':'Save Background'}</button></fieldset>}</section>;
  const libraryTool=['Songs','Media Library','Service Planner'].includes(tab);
  return <div className={'app '+(dark?'dark':'light')}>
    <a className="skip" href="#workspace">Skip to workspace</a><Sidebar tab={tab} choose={choose}/>
    <div className="shell"><header className="topbar"><div className="crumb">Workspace <span>/</span> <strong>{title}</strong></div>
      <button className="theme" onClick={()=>setDark(!dark)} aria-label={'Switch to '+(dark?'light':'dark')+' theme'}><Icon name={dark?'sun':'moon'} size={16}/>{dark?'Light':'Dark'} theme</button></header>
    <main className="desk" id="workspace"><div className="pageHead"><div><small className="eyebrow">WORSHIP WORKSPACE</small><h1>{title}</h1></div>
    <span className="dateStamp"><Icon name="plan" size={15}/>{new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</span></div>
    {error&&<div role="alert">{operatorMessage(error)}<button onClick={()=>setError('')} aria-label="Dismiss error">×</button></div>}
    {notice&&<div role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss notice">×</button></div>}
    <div className="bodyGrid"><div className="stack">
    {tab==='Desk'&&<><div className="deskProduction"><div className="previewArea">{monitor}</div><div className="listenGrid"><section className="card listener"><div className="panelHead"><span className="iconTitle"><Icon name="mic"/><h2>Sermon listener</h2></span></div>
    <p className="muted">{mic==='Listening'?'Listening for scripture references.':'Follow the sermon and cue scripture by voice.'}</p><div className="listenControls"><button className="primary" disabled={!['Off','Listening'].includes(mic)} onClick={toggleMic}><Icon name="mic" size={16}/>{mic==='Off'?'Start listening':mic==='Listening'?'Stop listening':mic+'…'}</button><span className={'wave '+(mic==='Listening'?'recording':'')} aria-hidden="true">{[8,15,10,22,14,28,17,10,19,9].map((h,i)=><i key={i} style={{height:h}}/>)}</span></div>
    <label className="toggle"><input type="checkbox" checked={auto} onChange={e=>{autoRef.current=e.target.checked;setAuto(e.target.checked);}}/> Automatically project detected citations</label></section>
    <section className="card"><div className="panelHead"><span className="iconTitle"><Icon name="text"/><h2>Live transcript</h2></span></div><div className="transcript" aria-live="polite">{transcript.length?transcript.map((t,i)=><p key={i}>{t}</p>):'Live transcript will appear here when listening begins.'}</div></section>
    <section className="card"><div className="panelHead"><span className="iconTitle"><Icon name="book"/><h2>Detected references</h2></span><span className="badge">{history.length}</span></div>{referenceHint&&<p role="status">{referenceHint}</p>}{history.length?<div className="row">{history.map(p=><button key={p.reference} onClick={()=>{select(p);setPreview(true);}}>{p.reference}</button>)}</div>:!referenceHint&&<p className="muted">Scripture references will appear as they are spoken.</p>}</section></div></div>{scripture}</>}
    {tab==='Scripture'&&<>{scripture}{monitor}</>}
    {tab==='Backgrounds'&&<>{background}{monitor}</>}
    {!unlocked&&(libraryTool||tab==='Backgrounds')&&<section className="card access"><span className="iconBox"><Icon name="lock"/></span><small>SHARED LIBRARY</small><h2>Open your team workspace</h2><p className="muted">Use your team passphrase to access saved songs, media and service plans.</p><form onSubmit={e=>{e.preventDefault();sessionStorage.setItem('echo-key',key);act(refresh,'Shared workspace opened.');}}><Field label="Shared operator passphrase" type="password" value={key} onChange={setKey}/><button className="primary">Unlock shared library</button></form></section>}
    {unlocked&&<><Library visible={tab==='Media Library'} media={data.media} refresh={refresh} act={act} project={update} removeBackground={()=>update({image:'',media:null})}/>
    <Songs visible={tab==='Songs'} songs={data.songs} media={data.media} refresh={refresh} act={act} project={update} queueSong={song=>{setQueuedSong(song);choose('Service Planner');}}/>
    <Planner {...data} onService={setService} queuedSong={queuedSong} consumeSong={()=>setQueuedSong(null)} refresh={refresh} act={act} projectRaw={updateRaw} override={override} openProjector={openProjector} isProjectorOpen={()=>projector.current&&!projector.current.closed} visible={tab==='Service Planner'}/>
    {libraryTool&&<div className="row maintenance"><button onClick={()=>act(refresh,'Workspace refreshed.')}>Refresh workspace</button><button onClick={()=>{if(override.current?.active()){setError('Stop the armed service before locking this desk.');return;}sessionStorage.removeItem('echo-key');location.reload();}}>Lock workspace</button></div>}</>}
    </div><ServiceRail service={activeService} slide={slide} choose={choose} auxiliary={libraryTool?<div className="sideMonitor">{monitor}</div>:null}/></div></main></div></div>;
}
createRoot(document.getElementById('root')).render(location.pathname==='/projector'?<Projector/>:<Desk/>);
