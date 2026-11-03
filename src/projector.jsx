import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
export const initialSlide={verse:null,image:'',size:5,clear:false};
export const channelName='bible-echo:'+ (new URLSearchParams(location.search).get('desk') || 'default');
export function Slide({slide}) {
  const article=useRef(null);
  useLayoutEffect(()=>{
    const content=article.current;
    if(!content)return;
    const fit=()=>{
      let size=slide.caption?.size || slide.size;
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
  },[slide.size,slide.verse,slide.caption,slide.clear]);
  const hex=slide.caption?.style?.color || '#ffffff';
  const brightText=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).reduce((s,c,i)=>s+c*[0.2126,0.7152,0.0722][i],0)>140;
  return <div className={'slide'+(slide.clear?' blank':'')} style={{'--scale':slide.size}}>
    {!slide.clear && <>{slide.image && <div className="backgroundMedia" key={slide.image}><Backdrop slide={slide}/></div>}
    {slide.caption && <article ref={article} className={brightText?'':'lightPanel'} style={{textAlign:slide.caption.style?.align,paddingInline:(slide.caption.style?.margin??5)+"cqw",color:slide.caption.style?.color}}><p style={{whiteSpace:"pre-line",fontFamily:slide.caption.style?.font}}>{slide.caption.text}</p><b>{slide.caption.label}</b></article>}{!slide.caption && slide.verse && <article ref={article}><p>{slide.verse.text}</p><b>{slide.verse.formattedReference} · KJV</b></article>}</>}
  </div>;
}
export function Backdrop({slide}){
  const media=slide.media||{};
  const video=useRef(null);
  useEffect(()=>{if(video.current)video.current.playbackRate=media.speed||1;},[media.speed,slide.image]);
  if(media.mime?.startsWith('video/'))return <video ref={video} className="backdrop" src={slide.image} muted autoPlay playsInline loop={media.loop!==false}/>;
  const motion=['Pan','Zoom','Drift'].includes(media.motion)?media.motion:'Still';
  return <img className={'backdrop motion'+motion} src={slide.image} alt="" style={{animationDuration:((media.duration||12)/(media.speed||1))+'s',animationIterationCount:media.loop===false?1:'infinite'}}/>;
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
