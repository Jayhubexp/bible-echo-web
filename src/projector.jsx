import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
export const initialSlide={verse:null,image:'',size:5,clear:false};
export const channelName='bible-echo:'+ (new URLSearchParams(location.search).get('desk') || 'default');
export function Slide({slide}) {
  const article=useRef(null);
  useLayoutEffect(()=>{
    const content=article.current;
    if(!content)return;
    const fit=()=>{
      let size=slide.size;
      content.style.setProperty('--scale',size);
      while(content.scrollHeight>content.clientHeight+1 && size>1){
        size-=0.15;
        content.style.setProperty('--scale',size);
      }
    };
    fit();
    const observer=new ResizeObserver(fit);
    observer.observe(content.parentElement);
    return ()=>observer.disconnect();
  },[slide.size,slide.verse,slide.clear]);
  return <div className={'slide'+(slide.clear?' blank':'')} style={{'--scale':slide.size}}>
    {!slide.clear && <>{slide.image && <img className="backdrop" src={slide.image} alt=""/>}
    {slide.verse && <article ref={article}><p>{slide.verse.text}</p><b>{slide.verse.formattedReference} · KJV</b></article>}</>}
  </div>;
}
export function Projector() {
  const [slide,set]=useState(initialSlide),[error,setError]=useState('');
  useEffect(()=>{
    const bus=new BroadcastChannel(channelName);
    bus.onmessage=e=>{if(e.data.type==='slide') set(e.data.slide);};
    bus.postMessage({type:'ready'});
    return ()=>bus.close();
  },[]);
  return <main className="audience"><Slide slide={slide}/><div className="screenTools">
    <button onClick={()=> (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(()=>setError('Use the browser fullscreen command.'))}>Fullscreen</button>{error}</div></main>;
}
