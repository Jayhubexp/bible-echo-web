function normalize(value=''){
  return (value||'').normalize('NFKD').toLowerCase()
    .replace(/\p{M}/gu,'').replace(/['’]/g,'')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}

// Prefer a title match, then metadata, then an exact phrase anywhere in the lyrics.
export function searchSongs(rows,query){
  const term=normalize(query);
  if(!term)return query.trim()?[]:rows;
  return rows.map(row=>{
    const song=row.body,title=normalize(song.title);
    const metadata=[song.artist,song.theme,song.category,song.language].some(v=>normalize(v).includes(term));
    const lyrics=normalize(song.sections.map(s=>s.text).join(' '));
    const rank=title===term?4:title.includes(term)?3:metadata?2:lyrics.includes(term)?1:0;
    return {row,rank};
  }).filter(hit=>hit.rank).sort((a,b)=>b.rank-a.rank).map(hit=>hit.row);
}

export function hymnEntry(hymn){
  const sections=hymn.verses.map((text,i)=>({label:'Verse '+(i+1),text}));
  return {id:hymn.source,source:hymn.source,body:{
    title:hymn.title,artist:hymn.artist,theme:hymn.theme,category:'Hymn',language:'English',
    license:'Public-domain English text. '+hymn.credit+' Source: The Cyber Hymnal, via Hymnary.org. '+hymn.source,
    sections,arrangement:sections.map((_,i)=>i)
  }};
}
