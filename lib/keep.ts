// A kept copy of a ticket that lives behind a link in the mail ("צפייה בכרטיסים"): sellers' links often stop working
// some days after the event, or before the ticket is sent on to someone, so the ticket is copied while the link still opens.
// PDFs and images are kept as they are; a ticket page is kept as one self-contained page (its pictures and styles inside it, no scripts).
import {createHash} from 'node:crypto';
import {presApi,presPage,presTicket,type PresInfo} from '@/lib/pres';
import {renderPage,renderWhy} from '@/lib/render';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const MAX=2_500_000;
async function grab(url:string,limit=MAX){const r=await fetch(url,{headers:{'User-Agent':UA,Accept:'*/*','Accept-Language':'he-IL,he;q=0.9,en;q=0.8'},redirect:'follow',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error('HTTP '+r.status);const len=Number(r.headers.get('content-length')||0);if(len>limit)throw new Error('big');
 const buf=Buffer.from(await r.arrayBuffer());if(buf.length>limit)throw new Error('big');return {buf,type:(r.headers.get('content-type')||'').split(';')[0].trim().toLowerCase(),url:r.url||url};}
const abs=(u:string,base:string)=>{try{return new URL(u.replace(/&amp;/g,'&'),base).href;}catch{return '';}};
// A page that is only an app shell (Nuxt, React, Vue: an empty mount point filled by scripts) shows nothing without its scripts.
export function shell(html:string){const body=html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'');const text=body.replace(/<[^>]+>/g,' ').replace(/&\w+;/g,' ').replace(/\s+/g,' ').trim();
 return /id=["'](?:__nuxt|__next|app|root)["']/.test(html)&&text.length<200||/pres\.global|presglobal/i.test(html)&&text.length<200;}
// Why the last copy failed, without anything personal (numbers and ids masked): for the server's own record.
export let why='';const mask=(u:string)=>{try{const x=new URL(u);return x.hostname+x.pathname.replace(/[0-9a-f-]{16,}/gi,'<id>').replace(/\d{5,}/g,'<n>')+(x.search?'?'+[...x.searchParams.keys()].join('&'):'');}catch{return 'bad-url';}};
// A pres.global ticket: the page itself, opened in the server's browser and kept as a picture (exactly as the cinema shows it);
// its details (seats, time) come from the page's data. If the browser cannot open it, the ticket is drawn from the data instead.
async function presCopy(u:string,label:string):Promise<Kept|null>{
 const p=await presTicket(u).catch(e=>{why='pres-error '+mask(u)+' '+(e instanceof Error?e.message:'');return null;});
 const r=await renderPage(presPage(u)||u);if(r)return {type:r.type,data:r.data.toString('base64'),name:label+(r.type==='image/png'?'.png':'.jpg'),info:p?.info};
 why=(why?why+' / ':'')+'render '+renderWhy;
 return p?{type:'image/svg+xml',data:Buffer.from(p.svg,'utf8').toString('base64'),name:label+'.svg',info:p.info}:null;}
export type Kept={type:string;data:string;name:string;info?:PresInfo};
export const keyOf=(url:string)=>createHash('sha256').update(url).digest('base64url').slice(0,22);
export async function snapshot(url:string,label:string):Promise<Kept|null>{
 why='';if(!/^https?:\/\//i.test(url))return null;
 // Pages built by scripts that have a known data source: the ticket is drawn from the data (lib/pres).
 if(presApi(url))return presCopy(url,label);
 const g=await grab(url);
 // A mail link that leads (through a redirect) to pres.global: drawn from its data too.
 if(presApi(g.url))return presCopy(g.url,label);
 if(g.type==='application/pdf'||/^image\/(png|jpe?g|gif|webp)$/.test(g.type))return {type:g.type,data:g.buf.toString('base64'),name:label+(g.type==='application/pdf'?'.pdf':'.png')};
 if(!/html/.test(g.type)){why='type '+g.type+' '+mask(g.url);return null;}
 let h=g.buf.toString('utf8');
 if(shell(h)){// An app shell may still name the ticket's data address (pres.global) inside it.
  const m=h.match(/https?:\/\/(?:[a-z0-9-]+\.pres\.global\/edocument|prestickets\.com\/[a-z0-9-]+)\/[0-9a-f-]{20,40}\/?\?id=\d{6,30}/i)?.[0];
  if(m&&presApi(m))return presCopy(m,label);
  // Any other page built by scripts: opened in the server's browser and kept as it looks.
  const r=await renderPage(g.url);if(r)return {type:r.type,data:r.data.toString('base64'),name:label+(r.type==='image/png'?'.png':'.jpg')};
  why='shell '+mask(g.url)+' '+renderWhy;return null;}
 // No scripts, frames, forms or event handlers: the copy is something to look at, not run.
 h=h.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<(iframe|object|embed|form)[\s\S]*?<\/\1>/gi,'').replace(/<(?:iframe|object|embed|base)\b[^>]*>/gi,'').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/javascript:/gi,'');
 // Styles inside the page (at most a few files), so it looks the same later.
 let css='';for(const m of [...h.matchAll(/<link\b[^>]*rel=["']?stylesheet[^>]*>/gi)].slice(0,4)){const href=m[0].match(/href=["']([^"']+)/i)?.[1];if(!href)continue;try{const c=await grab(abs(href,g.url),400_000);css+=c.buf.toString('utf8').replace(/@import[^;]+;/g,'')+'\n';}catch{}}
 h=h.replace(/<link\b[^>]*>/gi,'');
 // Pictures (the barcode above all) inside the page as data, since the seller's copies may go away too.
 let total=0;const seen=new Map<string,string>();
 for(const m of [...h.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi)].slice(0,16)){const src=m[1];if(src.startsWith('data:')||seen.has(src))continue;
  try{const i=await grab(abs(src,g.url),600_000);if(!/^image\//.test(i.type)||total+i.buf.length>MAX)continue;total+=i.buf.length;seen.set(src,'data:'+i.type+';base64,'+i.buf.toString('base64'));}catch{}}
 for(const [src,data] of seen)h=h.split('"'+src+'"').join('"'+data+'"').split("'"+src+"'").join("'"+data+"'");
 h=h.replace(/\ssrcset=("[^"]*"|'[^']*')/gi,'');
 const text=h.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&\w+;/g,' ').replace(/\s+/g,' ').trim();
 const pics=(h.match(/src=["']data:image/g)||[]).length;
 // A page that only shows "please sign in", or is built by scripts (empty without them), is not worth keeping.
 if(pics===0&&text.length<60)return null;if(/(?:התחבר|כניסה לחשבון|sign in|log in|login)/i.test(text)&&pics===0&&text.length<600)return null;
 const head='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css.replace(/<\/style/gi,'')+'</style>';
 h=/<head[^>]*>/i.test(h)?h.replace(/<head[^>]*>/i,m=>m+head):'<!doctype html><html><head>'+head+'</head><body>'+h+'</body></html>';
 return {type:'text/html',data:Buffer.from(h,'utf8').toString('base64'),name:label+'.html'};}
// A kept copy, for its owner (or a shared link of that owner).
export async function readKept(sql:(s:TemplateStringsArray,...v:unknown[])=>Promise<Record<string,unknown>[]>,userId:string,fileId:string){
 if(!/^k_[\w-]{16}$/.test(fileId))return null;const row=(await sql`select type,name,data from gate_kept where id=${fileId.slice(2)} and user_id=${userId} and expires>now()`)[0];
 return row?{type:String(row.type),name:String(row.name),bytes:Buffer.from(String(row.data),'base64')}:null;}
// Served with nothing allowed to run or load: the page carries its pictures and styles inside it.
export const KEPT_CSP="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; sandbox";
