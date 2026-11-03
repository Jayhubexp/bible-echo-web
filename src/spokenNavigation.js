const small=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function numberWords(n){
  if(n<20)return small[n];
  if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+small[n%10]:'');
  return small[Math.floor(n/100)]+' hundred'+(n%100?' '+numberWords(n%100):'');
}

// Resolve commands against the actual live range. A preview selection may differ.
export function spokenVerseIndex(text,passage,slide,preceding=''){
  if(!passage || slide.clear || slide.caption || !slide.verse)return -1;
  const current=passage.verses.findIndex(v=>v.id===slide.verse.id);
  if(current<0)return -1;
  const first=text.trim().toLowerCase().split(/[\s.!?;-]/)[0];
  if(/(?:^|[.!?;])\s*(?:(?:go to|read)\s+)?verse\s*$/i.test(preceding) && (/^\d+$/.test(first)||small.includes(first)||tens.includes(first)&&first)){
    text='verse '+text.trim();
  }
  let target=current;
  for(const sentence of text.toLowerCase().split(/[.!?;\n]+/)){
    const words=sentence.trim().replace(/[-–]/g,' ').replace(/,\s*/g,' ').replace(/\s+/g,' ').trim();
    if(/^(?:next|next verse)(?: please)?$/.test(words)){
      target=Math.min(target+1,passage.verses.length-1);
      continue;
    }
    const command=/^(?:go to |read )?verse (.+?)(?: please| says\b.*| reads\b.*)?$/.exec(words);
    if(!command)continue;
    const number=command[1].replace(' hundred and ',' hundred ');
    const index=passage.verses.findIndex(v=>number===String(v.verse)||number===numberWords(v.verse));
    if(index>=0)target=index;
  }
  return target===current?-1:target;
}
