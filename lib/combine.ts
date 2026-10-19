// Combining mails about one event. Each order is kept as its own part (seats, number of tickets, price), so three
// orders for the same show add up (2 + 1 + 1 = 4 tickets) while a second reading of the same order replaces the first.
// No server-only imports: the app uses this too.
import type {Ticket,Part} from '@/lib/tickets';
const norm=(s:string)=>s.toLowerCase().replace(/[^\w֐-׿]+/g,'');
// One part per mail; two mails about the same order (confirmation and reminder) collapse into one part below.
export const partKey=(t:Ticket)=>'m:'+(t.msgs[0]||t.key);
const money=(p?:string)=>{const m=(p||'').replace(/,/g,'').match(/\d+(?:\.\d+)?/);return m?+m[0]:0;};
export function partsOf(t:Ticket):Record<string,Part>{return t.parts&&Object.keys(t.parts).length?t.parts:{[partKey(t)]:{seats:t.seats,count:t.count,price:t.price,order:t.order,ai:t.ai}};}
// Seats, ticket count and total paid, from the parts.
// Seats written in different ways ("אזור: אולם, שורה: 1, כיסא: 5", "שורה 1, כיסא 5") are the same seat.
const SEAT=/(?:אזור\s*:?\s*([^,]+?)\s*,\s*)?שורה\s*:?\s*([\w\u0590-\u05FF]+)\s*,\s*כי?סא\s*:?\s*(\d+)/;
export function cleanSeats(list:string[]){const out:string[]=[];const seen=new Set<string>();
 for(const raw of list){const m=raw.match(SEAT);const key=m?m[2]+'|'+m[3]:raw.trim();if(seen.has(key))continue;seen.add(key);out.push(m?(m[1]?'אזור '+m[1].trim()+', ':'')+'שורה '+m[2]+', כיסא '+m[3]:raw.trim());}
 return out;}
// Parts of the same order (two mails about it) count once; the fuller reading wins.
function byOrder(parts:Record<string,Part>){const out:Record<string,Part>={};const seen:Record<string,string>={};
 for(const [k,p] of Object.entries(parts)){const o=p.order?norm(p.order):'';const prev=o&&seen[o];
  if(prev){const q=out[prev];if((p.ai&&!q.ai)||(!!p.ai===!!q.ai&&(p.seats?.length||0)>(q.seats?.length||0))){delete out[prev];out[k]=p;seen[o]=k;}continue;}
  out[k]=p;if(o)seen[o]=k;}
 return out;}
export function totals(all:Record<string,Part>){const parts=byOrder(all);const list=Object.values(parts);const seats=cleanSeats(list.flatMap(p=>p.seats||[])).slice(0,20);
 const count=list.reduce((a,p)=>a+(p.count||p.seats?.length||1),0);const sum=list.reduce((a,p)=>a+money(p.price),0);const cur=list.map(p=>p.price||'').find(x=>/[₪$€£]/.test(x))?.match(/[₪$€£]/)?.[0]||'₪';
 const orders=list.map(p=>p.order).filter(Boolean) as string[];
 return {seats,count,price:sum?cur+' '+(Math.round(sum*100)/100).toLocaleString('en-US'):undefined,orders};}
export function combine(o:Ticket,t:Ticket):Ticket{const best=t.ai&&!o.ai?t:o.ai&&!t.ai?o:t;const parts={...partsOf(o)};
 for(const [k,p] of Object.entries(partsOf(t))){const old=parts[k];parts[k]=!old||(p.ai&&!old.ai)||(!!p.ai===!!old.ai&&(p.seats?.length||0)>=(old.seats?.length||0))?p:old;}
 const tot=totals(parts);const kept=byOrder(parts);
 return {...best,parts:kept,seats:tot.seats,count:tot.count,price:tot.price??best.price,order:tot.orders.length>1?tot.orders.join(', '):best.order||tot.orders[0],
  start:t.start.length>o.start.length?t.start:o.start.length>t.start.length?o.start:best.start,
  msgs:[...new Set([...o.msgs,...t.msgs])],files:[...o.files,...t.files.filter(f=>!o.files.some(g=>g.id===f.id||(g.name===f.name&&g.size===f.size)))].slice(0,12),
  links:[...o.links,...t.links.filter(l=>!o.links.some(x=>x.url===l.url))].slice(0,4),cancelled:o.cancelled||t.cancelled,mailed:Math.max(o.mailed,t.mailed)};}
// Same event: same order, a shared mail, or the same title at the same time.
export const sameEvent=(a:Ticket,b:Ticket)=>a.key===b.key||a.msgs.some(m=>b.msgs.includes(m))||(a.start===b.start&&a.start.includes('T')&&norm(a.title)===norm(b.title));
export function mergeAll(a:Ticket[],b:Ticket[]){let out=[...a];
 for(const t of b){const hits=out.filter(o=>sameEvent(o,t));out=out.filter(o=>!hits.includes(o));out.push(hits.reduce((acc,o)=>combine(o,acc),t));}
 return out;}
