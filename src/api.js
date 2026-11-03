export const origin = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5080' : '')).replace(/\/$/,'');
let offset=0;
export const serverNow=()=>Date.now()+offset;
export async function api(path, options={}) {
  if (!origin) throw Error('Set VITE_API_BASE_URL in Vercel and rebuild the web app.');
  let response;
  try {
    response=await fetch(origin+'/api/v1'+path,{...options,signal:AbortSignal.timeout(100000)});
  } catch { throw Error('API unreachable or timed out. Check the connection and frontend origin.'); }
  const timestamp=response.headers.get('X-Echo-Time');
  if(timestamp && Number.isFinite(Number(timestamp)))offset=Number(timestamp)-Date.now();
  const data=await response.json().catch(()=>({}));
  if (!response.ok) throw Error(data.error || 'Request failed (HTTP '+response.status+').');
  return data;
}
