// The picture of an event, when the mail has none: a film's poster from TMDB (through Unwatch's search, which holds the TMDB key),
// or the main picture of the event's page (og:image). Nothing personal is sent: only the event's name.
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UNWATCH='https://unwatch-one.vercel.app/api/search?q=';
type Hit={media?:string;kind?:string;title?:string;orig?:string;year?:string;poster?:string|null};
// A film's name without what the cinema adds: the version (מדובב, 3D), a celebration, notes in brackets, the box-office prefix.
export function filmQueries(title:string):string[]{
 const t=title.replace(/\([^)]*\)/g,' ').replace(/\s*[-–]?\s*(?:מדובב|מתורגם|דיבוב|כתוביות|גרסה מדובבת|3D|IMAX|4DX|ATMOS|VIP)(?:\s+(?:לעברית|עברית|אנגלית))?/gi,' ')
  .replace(/טרום בכורה|הקרנה מיוחדת|הקרנת בכורה|בכורה|מאסטרקלאס/g,' ').replace(/\s+/g,' ').trim();
 const parts=t.split(/\s*\|\s*/);const he=parts[0],en=parts.find(p=>/^[\x20-\x7e]+$/.test(p)&&/[a-z]/i.test(p));
 const short=he.split(/\s*[-–]\s*|\s*!\s*|\s+-\s+/)[0].trim();
 return [...new Set([en,he,short].map(x=>x?.replace(/[\s\-–!:|]+$/,'').trim()).filter((x):x is string=>!!x&&x.length>=2))];}
export async function filmPoster(title:string,year?:number):Promise<string|null>{
 for(const q of filmQueries(title)){try{const r=await fetch(UNWATCH+encodeURIComponent(q),{headers:{accept:'application/json'},signal:AbortSignal.timeout(6000)});if(!r.ok)continue;
  const j=await r.json() as {results?:Hit[]};const hits=(j.results||[]).filter(h=>h.poster&&(h.media==='movie'||h.kind==='movie'||h.kind==='anime'));
  if(!hits.length)continue;
  // A film shown now is this year's or an older one brought back (an anniversary): never one from after the screening.
  const ok=hits.filter(h=>!year||!h.year||Number(h.year)<=year+1);const h=(ok[0]||hits[0]);return String(h.poster).replace('/w342/','/w500/');}catch{}}
 return null;}
// The main picture of a web page (og:image / twitter:image).
export async function pagePicture(url:string):Promise<string|null>{try{
 const r=await fetch(url,{headers:{'User-Agent':UA,Accept:'text/html'},redirect:'follow',signal:AbortSignal.timeout(7000)});if(!r.ok||!/html/i.test(r.headers.get('content-type')||''))return null;
 const h=(await r.text()).slice(0,400000);
 const m=h.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)["']/i)||h.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i);
 if(!m)return null;const u=new URL(m[1].replace(/&amp;/g,'&'),r.url);if(u.protocol!=='https:'||/logo|icon|default|placeholder/i.test(u.pathname))return null;return u.toString();}catch{return null;}}
