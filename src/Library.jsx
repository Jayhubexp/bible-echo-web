import React,{useRef,useState} from 'react';
import {asset,categories,upload,workspace} from './workspace';
import {Slide} from './projector';

export function Field({label,value,onChange,options,type='text',...props}){
  return <label>{label}{options?<select aria-label={label} value={value??''} onChange={e=>onChange(e.target.value)} {...props}>{options.map(o=>{
    const [v,name]=Array.isArray(o)?o:[o,o];return <option key={v} value={v}>{name}</option>;
  })}</select>:<input aria-label={label} type={type} value={value??''} onChange={e=>onChange(e.target.value)} {...props}/>}</label>;
}
export function MediaChoice({media,value,onChange,label='Background'}){
  return <Field label={label} value={value} onChange={v=>onChange(v||null)} options={ [['','Default'],...media.filter(m=>!m.body.deleting&&!m.body.pending).map(m=>[m.id,m.body.title])] }/>;
}
function Thumb({row}){
  return <span className="thumb">{row.body.thumb&&<img loading="lazy" src={row.body.thumb} alt=""/>}</span>;
}
export function Library({media,refresh,act,project,removeBackground,visible}){
  const [filter,setFilter]=useState('All'),[query,setQuery]=useState(''),[category,setCat]=useState('All'),[chosen,choose]=useState(null),[draft,setDraft]=useState(null),[src,setSrc]=useState('');
  const [file,setFile]=useState(),[uploadTitle,setTitle]=useState(''),[uploadCat,setUploadCat]=useState('Custom');
  const previewVersion=useRef(0),editRevision=useRef(null);
  const row=media.find(r=>r.id===chosen);
  function edit(key,value){setDraft({...draft,[key]:value});}
  async function preview(r){
    const version=++previewVersion.current;
    editRevision.current=r.revision;choose(r.id);setDraft({...r.body});setSrc('');
    if(!r.body.deleting&&!r.body.pending){const bg=await asset(r);if(version===previewVersion.current)setSrc(bg.image);}
  }
  if(!visible)return null;
  const filtered=media.filter(({body:b})=>(filter!=='Favorites'||b.favorite)&&(filter!=='Motion Backgrounds'||b.motion!=='Still'||b.mime.startsWith('video')||b.mime==='image/gif')&&(category==='All'||b.category===category)&&[b.title,b.tags,b.prompt].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <section className="card assets"><small>VISUAL COLLECTION</small><h2>Media Library</h2>
    <div className="row">{['All','Motion Backgrounds','Favorites'].map(f=><button aria-pressed={filter===f} className={filter===f?'primary':''} key={f} onClick={()=>setFilter(f)}>{f}</button>)}</div>
    <Field label="Search backgrounds" value={query} onChange={setQuery}/><Field label="Category filter" value={category} onChange={setCat} options={['All',...categories]}/>
    <div className="entries assetGrid">{filtered.map(r=><button aria-pressed={chosen===r.id} key={r.id} onClick={()=>act(()=>preview(r))}><Thumb row={r}/><span>{r.body.favorite?'★ ':''}{r.body.title}<small>{r.body.pending?'Upload pending · ':r.body.deleting?'Deletion pending · ':''}{r.body.mime.startsWith('video')?'Video':r.body.mime==='image/gif'||r.body.motion!=='Still'?'Motion':'Still'} · {r.body.category}</small></span></button>)}</div>{!filtered.length&&<p className="muted">No backgrounds match this view.</p>}
    {row&&draft&&<fieldset><legend>Preview and edit</legend>{src&&<div className="monitor"><Slide slide={{image:src,media:draft}}/></div>}
    <Field label="Name" value={draft.title} onChange={v=>edit('title',v)}/><Field label="Category" options={categories} value={draft.category} onChange={v=>edit('category',v)}/><Field label="Tags" value={draft.tags} onChange={v=>edit('tags',v)}/>
    <Field label="Animation" options={['Still','Zoom','Pan','Drift']} value={draft.motion} onChange={v=>edit('motion',v)}/><div className="row"><Field label="Loop seconds" options={[8,12,15]} value={draft.duration} onChange={v=>edit('duration',Number(v))}/><Field label="Motion speed" options={[0.5,1,1.5,2]} value={draft.speed} onChange={v=>edit('speed',Number(v))}/></div>
    <label><input type="checkbox" checked={draft.loop} onChange={e=>edit('loop',e.target.checked)}/> Loop playback</label><label><input type="checkbox" checked={draft.favorite} onChange={e=>edit('favorite',e.target.checked)}/> Favorite</label>
    <div className="row"><button onClick={()=>act(async()=>{const saved=await workspace('/media/'+row.id+'?revision='+editRevision.current,'PUT',draft);editRevision.current=saved.revision;await refresh();},'Background saved.')}>Save changes</button>
    <button disabled={!src} onClick={()=>project({image:src,media:draft,clear:false})}>Apply to projector</button><button onClick={removeBackground}>Remove background</button>
    <button disabled={!src} onClick={()=>{const a=document.createElement('a');a.href=src;a.download=draft.title+'.'+draft.mime.split('/')[1];a.click();}}>Download</button>
    <button onClick={()=>{if(confirm('Permanently delete '+row.body.title+'?'))act(async()=>{await workspace('/media/'+row.id+'?revision='+row.revision,'DELETE');choose(null);await refresh();},'Background deleted.');}}>Delete</button></div></fieldset>}
    <fieldset><legend>Upload licensed media</legend><input aria-label="Licensed media file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" onChange={e=>{const f=e.target.files[0];setFile(f);setTitle(f?.name||'');}}/>
    <Field label="Upload title" value={uploadTitle} onChange={setTitle}/><Field label="Upload category" value={uploadCat} options={categories} onChange={setUploadCat}/>
    <button disabled={!file} onClick={()=>act(async()=>{const r=await upload(file,uploadTitle,uploadCat);await refresh();await preview(r);setFile(null);},'Media saved.')}>Upload to library</button></fieldset></section>;
}
