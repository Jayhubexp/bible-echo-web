import React,{useState} from 'react';
import {asset,slides,ink,workspace} from './workspace';
import {Field,MediaChoice} from './Library';
import {Slide} from './projector';

const emptySong=()=>({title:'',artist:'',language:'English',category:'Worship',theme:'',license:'',sections:[{label:'Verse 1',text:''}],arrangement:[0],background:null,favorite:false,archived:false,lines:3,size:5,font:'Georgia',align:'center',color:'#ffffff',margin:5});
export function Songs({songs,media,refresh,act,project,queueSong,visible}){
  const [draft,set]=useState(emptySong),[row,setRow]=useState(),[q,search]=useState(''),[filter,setFilter]=useState('Active'),[index,page]=useState(0),[source,setSource]=useState(''),[rights,allow]=useState(false),[preview,setPreview]=useState(null);
  const [order,setOrder]=useState('1'),[presenting,live]=useState(false);
  const [arrName,setArrName]=useState(''),[theme,setTheme]=useState(''),[matches,setMatches]=useState(null);
  const [editing,setEditing]=useState(songs.length===0);
  const list=slides(draft),current=list[index];
  function edit(key,value){set({...draft,[key]:value});live(false);}
  function select(r,copy=false){
    const d=r?structuredClone(r.body):emptySong();
    if(copy){d.title+=' (copy)';d.archived=false;}
    setEditing(!r||copy);set(d);setRow(copy?null:r);setOrder(d.arrangement.map(i=>i+1).join(', '));page(0);live(false);setPreview(null);setSource('');allow(!!r);
    if(d.background)act(async()=>setPreview(await asset(media.find(m=>m.id===d.background))));
  }
  async function go(i,send){
    if(!list[i])return;
    const bg=await asset(media.find(m=>m.id===draft.background));page(i);setPreview(bg);
    if(send)await project({...ink(list[i]),...bg});live(send);
  }
  async function save(){
    if(!rights)throw Error('Confirm permission to store and present these lyrics.');
    const r=await workspace(row?'/songs/'+row.id+'?revision='+row.revision:'/songs',row?'PUT':'POST',draft);
    setRow(r);await refresh();
  }
  function setSection(i,key,value){
    edit('sections',draft.sections.map((s,n)=>n===i?{...s,[key]:value}:s));
  }
  function removeSection(index){
    const sections=draft.sections.filter((_,i)=>i!==index);
    const shift=order=>order.filter(i=>i!==index).map(i=>i>index?i-1:i);
    const arrangement=shift(draft.arrangement);
    if(!arrangement.length)arrangement.push(0);
    const alternatives=Object.fromEntries(Object.entries(draft.alternatives||{}).map(([name,order])=>[name,shift(order)]).filter(([,order])=>order.length));
    set({...draft,sections,arrangement,alternatives});setOrder(arrangement.map(n=>n+1).join(', '));live(false);page(0);
  }
  async function assist(mode){
    if(mode==='original'&&!confirm('Generate a new original composition from this theme?'))return;
    const result=await workspace('/assist','POST',{mode,text:source,authorized:rights});
    set({...draft,sections:result.sections,alternatives:{},arrangement:result.arrangement,lines:result.lines,size:result.size,background:result.background});
    setOrder(result.arrangement.map(i=>i+1).join(', '));page(0);live(false);setPreview(null);
  }
  if(!visible)return null;
  const results=songs.filter(r=>!matches||matches.songs.includes(r.id)).filter(({body:s})=>(filter==='Archived'?s.archived:!s.archived)&&(filter!=='Favorites'||s.favorite)&&[s.title,s.artist,s.theme,s.language,...s.sections.map(x=>x.text)].join(' ').toLowerCase().includes(q.toLowerCase()));
  return <section className="card songs"><small>WORSHIP COLLECTION</small><h2>Song library</h2><Field label="Find by title, artist, theme or lyrics" value={q} onChange={search}/><Field label="Collection" value={filter} options={['Active','Favorites','Archived']} onChange={setFilter}/>
    <details><summary>Find songs by theme</summary><Field label="Service theme" value={theme} onChange={setTheme}/><button disabled={!theme.trim()} onClick={()=>act(async()=>setMatches(await workspace('/assist','POST',{mode:'recommend',text:theme})))}>Find matching songs</button>{matches&&<><p>{matches.summary}</p><button onClick={()=>setMatches(null)}>Show all songs</button></>}</details><div className="entries songEntries">{results.map(r=><button aria-pressed={row?.id===r.id} key={r.id} onClick={()=>select(r)}>{r.body.favorite?'★ ':''}<span>{r.body.title}<small>{r.body.artist||r.body.category} · {r.body.sections.length} sections</small></span></button>)}</div>{!results.length&&<p className="muted">No songs in this view. Create a song or try another search.</p>}<div className="row"><button onClick={()=>select(null)}>New song</button>{row&&<button aria-pressed={editing} onClick={()=>setEditing(!editing)}>{editing?'Hide editor':'Edit song'}</button>}</div>
  <div className="songStage"><small>SLIDE PREPARATION</small>  <h3>{draft.title||'Slide preview'}</h3><div className="monitor"><Slide slide={{...preview,...ink(current)}}/></div><div className="row"><button disabled={!current} onClick={()=>act(()=>go(index,false))}>Preview background</button><button className="primary" disabled={!current||!rights} onClick={()=>act(()=>go(index,true))}>Project song</button><button disabled={!index} onClick={()=>act(()=>go(index-1,presenting))}>Previous slide</button><button disabled={index+1>=list.length} onClick={()=>act(()=>go(index+1,presenting))}>Next slide</button><button onClick={()=>project({caption:null,verse:null,clear:false})}>Clear text</button><button onClick={()=>project({clear:true})}>Blackout</button></div>
  <Field label="Jump to song slide" value={index} options={list.map((s,i)=>[i,(i+1)+' · '+s.label])} onChange={v=>act(()=>go(Number(v),presenting))}/><button disabled={!row||row.body.archived} onClick={()=>queueSong(row)}>Load saved song into service queue</button></div>
  <div hidden={!editing}><fieldset className="metadataGrid"><legend>Song details</legend>{['title','artist','language','theme','license'].map(k=><Field key={k} label={k==='license'?'Copyright, attribution or license':k} value={draft[k]} onChange={v=>edit(k,v)}/>)}<Field label="Category" options={['Hymn','Worship','Praise','Gospel','Special Ministration','Other']} value={draft.category} onChange={v=>edit('category',v)}/>
  <MediaChoice media={media} value={draft.background} onChange={v=>{edit('background',v);setPreview(null);}}/>
  <label><input type="checkbox" checked={draft.favorite} onChange={e=>edit('favorite',e.target.checked)}/> Favorite</label><label><input type="checkbox" checked={draft.archived} onChange={e=>edit('archived',e.target.checked)}/> Archived</label></fieldset>
  <details><summary>Lyrics preparation assistant</summary><label>Authorized lyrics, or a theme for an original song<textarea value={source} onChange={e=>setSource(e.target.value)}/></label>
  <input type="file" accept=".txt,text/plain" aria-label="Import lyrics" onChange={e=>act(async()=>{const f=e.target.files[0];if(f?.size>100000)throw Error('Choose a text file under 100 KB.');if(f)setSource(await f.text());})}/>
  <p className="muted">Paste lyrics you have permission to use. Review every draft before saving.</p><div className="row"><button onClick={()=>{edit('sections',[{label:'Verse 1',text:source}]);set(d=>({...d,arrangement:[0],alternatives:{}}));setOrder('1');}}>Use pasted lyrics</button><button disabled={!rights||!source} onClick={()=>act(()=>assist('format'),'Draft ready for review.')}>Format supplied lyrics</button><button disabled={!source} onClick={()=>act(()=>assist('original'),'Original draft ready for review.')}>Write original song</button></div></details>
  <fieldset><legend>Sections and presentation</legend>{draft.sections.map((s,i)=><div key={i}><Field label={'Section '+(i+1)} value={s.label} onChange={v=>setSection(i,'label',v)}/><textarea aria-label={'Lyrics '+(i+1)} value={s.text} onChange={e=>setSection(i,'text',e.target.value)}/>
  <button disabled={draft.sections.length===1} onClick={()=>removeSection(i)}>Remove section</button></div>)}
  <button onClick={()=>edit('sections',[...draft.sections,{label:'Chorus',text:''}])}>Add section</button>
  <Field label="Arrangement by section number (e.g. 1, 2, 1)" value={order} onChange={v=>{setOrder(v);edit('arrangement',v.split(',').map(x=>Number(x.trim())-1));page(0);}}/>
    <Field label="Alternate arrangement" value="" options={ [['','Choose arrangement'],...Object.keys(draft.alternatives||{})] } onChange={v=>{const a=draft.alternatives?.[v];if(a){edit('arrangement',[...a]);setOrder(a.map(n=>n+1).join(', '));page(0);}}}/>
  <Field label="Name this arrangement" value={arrName} onChange={setArrName}/><button disabled={!arrName.trim()} onClick={()=>{edit('alternatives',{...draft.alternatives,[arrName.trim()]:[...draft.arrangement]});setArrName('');}}>Keep arrangement in draft</button>
  <div className="row">{[['lines','Lines per slide',[2,3,4]],['size','Text size',[3,4,5,6,7,8]],['margin','Margin',[2,5,8,12]],['font','Font',['Georgia','Arial','Verdana']],['align','Alignment',['left','center','right']]].map(([k,label,options])=><Field key={k} label={label} value={draft[k]} options={options} onChange={v=>edit(k,typeof options[0]==='number'?Number(v):v)}/>)}<Field label="Text color" type="color" value={draft.color} onChange={v=>edit('color',v)}/></div></fieldset>
  <label><input type="checkbox" checked={rights} onChange={e=>allow(e.target.checked)}/> I have permission to store and present these lyrics.</label>
  <div className="row"><button className="primary" onClick={()=>act(save,'Song saved.')}>Save song</button><button disabled={!row} onClick={()=>select(row,true)}>Duplicate as draft</button><button disabled={!row} onClick={()=>{if(confirm('Delete this song?'))act(async()=>{await workspace('/songs/'+row.id+'?revision='+row.revision,'DELETE');select(null);await refresh();},'Song deleted.');}}>Delete song</button></div></div>
</section>;
}
