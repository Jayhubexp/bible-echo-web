import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {listen} from './audio';
import {api} from './api';
import {Projector,Slide,initialSlide} from './projector';
import './style.css';

function Desk(){
  const [online,setOnline]=useState('Connecting'),[error,setError]=useState('');
  const [mic,setMic]=useState('Off'),[transcript,setTranscript]=useState([]),[history,setHistory]=useState([]);
  const [auto,setAuto]=useState(true),autoRef=useRef(true),stopRef=useRef(),session=useRef(0);
  const [query,setQuery]=useState(''),[searching,setSearching]=useState(false);
  const [passage,setPassage]=useState(null),[index,setIndex]=useState(0);
  const [slide,setSlide]=useState(initialSlide),live=useRef(slide),bus=useRef(),desk=useRef(crypto.randomUUID());
  const [prompt,setPrompt]=useState(''),[image,setImage]=useState(''),[generating,setGenerating]=useState(false);
  const [dark,setDark]=useState(false),[tab,setTab]=useState('Desk');
  const verse=passage?.verses[index];
  useEffect(()=>{
    api('/health').then(()=>setOnline('Connected')).catch(e=>{setOnline('Offline');setError(e.message);});
    const channel=new BroadcastChannel('bible-echo:'+desk.current);bus.current=channel;
    channel.onmessage=e=>{if(e.data.type==='ready')channel.postMessage({type:'slide',slide:live.current});};
    return ()=>channel.close();
  },[]);
  function update(fields){
    live.current={...live.current,...fields};setSlide(live.current);
    bus.current?.postMessage({type:'slide',slide:live.current});
  }
  function select(p){setPassage(p);setIndex(0);}
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
        const {transcript:text}=await api('/transcribe',{method:'POST',body:blob});
        if(!text.trim() || session.current!==id)return;
        setTranscript(lines=>[...lines.slice(-199),text]);
        const context=previous;
        previous=text.split(/\s+/).slice(-10).join(' ').slice(-300);
        const {passages}=await api('/scripture/search?spoken=true&'+new URLSearchParams({q:text.slice(-2000),preceding:context}));
        if(session.current!==id)return;
        for(const p of passages){
          if(lastRef===p.reference)continue;
          lastRef=p.reference;
          setHistory(list=>[p,...list.filter(item=>item.reference!==p.reference)].slice(0,30));
          select(p);
          if(autoRef.current) update({verse:p.verses[0],clear:false});
        }
      },msg=>{session.current++;setError(msg);setMic('Off');});
      setMic('Listening');
    }catch(e){setMic('Off');setError(e.message);}
  }
  async function navigate(n){
    const next=index+n;
    let target=passage?.verses[next];
    if(target)setIndex(next);
    else if(verse && passage.verses.length===1){
      setSearching(true);setError('');
      try{
        const ref=verse.book+' '+verse.chapter+':'+(verse.verse+n);
        const {passages}=await api('/scripture/search?spoken=true&q='+encodeURIComponent(ref));
        if(!passages.length){setError('Reached the chapter boundary. Look up the next passage to continue.');return;}
        select(passages[0]);target=passages[0].verses[0];
      }catch(e){setError(e.message);return;}finally{setSearching(false);}
    }
    if(target && verse.id===live.current.verse?.id && !live.current.clear)update({verse:target});
  }
  async function generate(e){
    e.preventDefault();setGenerating(true);setError('');
    try{
      const data=await api('/backgrounds/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});
      const preview=new Image();preview.src=data.image;await preview.decode();setImage(data.image);
    }catch(e){setError(e.message);}finally{setGenerating(false);}
  }
  function openProjector(){
    const w=window.open('/projector?desk='+desk.current,'projector_'+desk.current,'popup,width=1100,height=700');
    if(!w)setError('Allow pop-ups for this site to open the projector.');
  }
  return <div className={'app '+(dark?'dark':'')}>
    <header><div className="brand"><img src="/bible-echo.svg" alt=""/><strong>Bible Echo</strong></div><span className="headerLabel">WORSHIP WORKSPACE</span><button onClick={()=>setDark(!dark)}>{dark?'Light':'Dark'} theme</button></header>
    <main className="desk"><div className="eyebrow">OPERATOR CONSOLE</div><div className="heading"><h1>Service desk</h1><span className="chip">{online==='Connected'?'●':'○'} API {online.toLowerCase()}</span></div>
    <nav>{['Desk','Backgrounds'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</nav>
    {error && <div role="alert">{error} <button onClick={()=>setError('')} aria-label="Dismiss error">×</button></div>}
    <div className="grid"><section className="stack">
    {tab==='Desk'?<><section className="card"><small>01 / AUDIO INPUT</small><h2>Sermon listener</h2>
      <div className="row"><button className="primary" disabled={!['Off','Listening'].includes(mic)} onClick={toggleMic}>{mic==='Off'?'Start listening':mic==='Listening'?'Stop listening':mic+'…'}</button><span>{mic==='Listening'?'● Recording':'Microphone '+mic.toLowerCase()}</span></div>
      <h3>Live transcript</h3><div className="transcript" aria-live="polite">{transcript.length?transcript.map((t,i)=><p key={i}>{t}</p>):'Transcribed sermon audio will appear here.'}</div>
      <label className="toggle"><input type="checkbox" checked={auto} onChange={e=>{autoRef.current=e.target.checked;setAuto(e.target.checked);}}/> Automatically project detected citations</label>
      <h3>Detected references</h3>{history.length?<div className="row">{history.map(p=><button key={p.reference} onClick={()=>select(p)}>{p.reference}</button>)}</div>:<p className="muted">Waiting for a spoken reference.</p>}
    </section><section className="card"><small>02 / BIBLE LIBRARY</small><h2>Scripture lookup</h2>
      <form onSubmit={search}><label htmlFor="lookup">Reference or passage keywords</label><div className="row"><input id="lookup" required maxLength="2000" value={query} onChange={e=>setQuery(e.target.value)} placeholder="John 3:16–18"/><button disabled={searching}>{searching?'Searching…':'Search'}</button></div></form>
      {verse && <blockquote><small>KJV · {verse.formattedReference}</small><p>{verse.text}</p></blockquote>}
      <div className="row"><button disabled={searching || !verse || (!index && !(passage.verses.length===1 && verse.verse>1))} onClick={()=>navigate(-1)}>Previous</button><button disabled={searching || !verse || (passage.verses.length>1 && index+1>=passage.verses.length)} onClick={()=>navigate(1)}>Next</button><button className="primary" disabled={!verse} onClick={()=>update({verse,clear:false})}>Project verse</button></div>
    </section></>:<section className="card"><small>STUDIO / MUSE IMAGE</small><h2>Worship backgrounds</h2><form onSubmit={generate}><label htmlFor="prompt">Describe a background</label><textarea id="prompt" required maxLength="1500" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Soft evening light over a quiet mountain ridge"/><button className="primary" disabled={generating || !prompt.trim()}>{generating?'Generating…':'Generate image'}</button></form>
    {image && <img className="generated" src={image} alt="Generated worship background preview"/>}<div className="row"><button disabled={!image || generating} onClick={()=>update({image,clear:false})}>Apply to projector</button><button onClick={()=>update({image:''})}>Restore default</button></div></section>}
    </section><aside className="card output"><small>OUTPUT / AUDIENCE</small><h2>Projection monitor</h2><div className="monitor"><Slide slide={slide}/></div><p className="muted">{slide.clear?'Screen cleared':slide.verse?.formattedReference || 'Awaiting first slide'}</p>
    <div className="row"><button className="primary" onClick={openProjector}>Open projector ↗</button><button onClick={()=>update({clear:!slide.clear})}>{slide.clear?'Restore screen':'Clear screen'}</button></div>
    <label htmlFor="size">Scripture text size</label><input id="size" type="range" min="3" max="8" step=".25" value={slide.size} onChange={e=>update({size:Number(e.target.value)})}/>
    <p className="tip">Move the projector window to your audience display, then select Fullscreen there.</p></aside></div></main>
    <footer>BIBLE ECHO <span>Worship presentation desk</span></footer></div>;
}
createRoot(document.getElementById('root')).render(location.pathname==='/projector'?<Projector/>:<Desk/>);
