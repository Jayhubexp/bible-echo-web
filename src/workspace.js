import {api,origin} from './api';
export const categories=['Worship','Praise','Hymns','Sermon','Prayer','Thanksgiving','Offering','Announcements','Custom'];
export const types=['Opening prayer','Praise and worship','Hymns','Congregational songs','Bible reading','Sermon','Offering','Announcements','Special ministration','Closing prayer','Custom item'];
export const controller=crypto.randomUUID();
export const headers=()=>({'X-Operator-Key':sessionStorage.getItem('echo-key')||'','X-Controller':controller});
export function workspace(path,method='GET',data){
  const form=data instanceof FormData;
  return api('/workspace'+path,{method,headers:{...headers(),...(!form&&data?{'Content-Type':'application/json'}:{})},body:form?data:JSON.stringify(data)});
}
const blobs=new Map();
export async function asset(row){
  if(!row)return {image:'',media:null};
  if(row.body.deleting||row.body.pending)throw Error('This background has a pending upload or deletion.');
  if(!blobs.has(row.id)){
    const task=fetch(origin+'/api/v1/workspace/media/'+row.id+'/file',{headers:headers(),signal:AbortSignal.timeout(90000)})
      .then(async response=>{
        if(!response.ok)throw Error('Could not preload '+row.body.title+'. Check workspace access.');
        return URL.createObjectURL(await response.blob());
      }).catch(error=>{blobs.delete(row.id);throw error;});
    blobs.set(row.id,task);
  }
  return {image:await blobs.get(row.id),media:row.body};
}
function thumbnail(element){
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;
  const ctx=canvas.getContext('2d');ctx.drawImage(element,0,0,160,90);
  return canvas.toDataURL('image/jpeg',0.65);
}
export async function dimensions(file){
  const url=URL.createObjectURL(file);
  try{
    if(file.type.startsWith('video/')){
      const v=document.createElement('video');v.preload='auto';
      try{
        await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=()=>reject(Error('Unsupported video codec.'));v.src=url;});
        return [v.videoWidth,v.videoHeight,thumbnail(v)];
      }finally{v.removeAttribute('src');v.load();}
    }
    const img=new Image();img.src=url;await img.decode();return [img.naturalWidth,img.naturalHeight,thumbnail(img)];
  }finally{URL.revokeObjectURL(url);}
}
export async function upload(file,title,category,prompt=''){
  if(!file||file.size>33554432)throw Error('Choose a file up to 32 MiB.');
  const [width,height,thumb]=await dimensions(file);
  const form=new FormData();
  for(const [key,value] of Object.entries({file,title,category,prompt,width,height,thumb}))form.append(key,value);
  return workspace('/media','POST',form);
}
export function slides(song){
  return song.arrangement.flatMap(index=>{
    const section=song.sections[index];if(!section)return [];
    const lines=section.text.trim().split(/\r?\n/).filter(line=>line.trim());
    const result=[];
    for(let i=0;i<lines.length;i+=song.lines)
      result.push({text:lines.slice(i,i+song.lines).join('\n'),label:section.label,style:{font:song.font,color:song.color,align:song.align,margin:song.margin},size:song.size});
    return result;
  });
}
export function ink(item){return {verse:null,caption:item,clear:false};}
export const freshCue=()=>({title:'Opening prayer',type:'Opening prayer',minutes:5,text:'',reference:'',background:null,songs:[],layout:'center',action:'Display',notes:''});
