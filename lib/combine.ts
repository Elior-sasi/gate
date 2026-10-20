// Combining mails about one event. Each order is kept as its own part (seats, number of tickets, price), so three
// orders for the same show add up (2 + 1 + 1 = 4 tickets) while a second reading of the same order replaces the first.
// Newer mail wins: the time, place and seats come from the most recently sent mail that states them, so an old
// confirmation scanned again never undoes a change, and a newer ticket for the same order replaces the old one.
// No server-only imports: the app uses this too.
import type {Ticket,Part,TFile} from '@/lib/tickets';
const norm=(s:string)=>s.toLowerCase().replace(/[^\w֐-׿]+/g,'');
// One part per mail; two mails about the same order (confirmation and reminder) collapse into one part below.
export const partKey=(t:Ticket)=>'m:'+(t.msgs[0]||t.key);
const money=(p?:string)=>{const m=(p||'').replace(/,/g,'').match(/\d+(?:\.\d+)?/);return m?+m[0]:0;};
export function partsOf(t:Ticket):Record<string,Part>{return t.parts&&Object.keys(t.parts).length?t.parts:{[partKey(t)]:{seats:t.seats,count:t.count,price:t.price,order:t.order,ai:t.ai,mailed:t.mailed,
 ...(t.cancelled?{cancelled:true}:{}),...(t.update?{update:true}:{}),...(t.restored?{restored:true}:{})}};}
// Seats, ticket count and total paid, from the parts.
// Seats written in different ways ("אזור: אולם, שורה: 1, כיסא: 5", "שורה 1, כיסא 5") are the same seat.
const SEAT=/(?:אזור\s*:?\s*([^,]+?)\s*,\s*)?שורה\s*:?\s*([\w֐-׿]+)\s*,\s*כי?סא\s*:?\s*(\d+)/;
export function cleanSeats(list:string[]){const out:string[]=[];const seen=new Set<string>();
 for(const raw of list){const m=raw.match(SEAT);const key=m?m[2]+'|'+m[3]:raw.trim();if(seen.has(key))continue;seen.add(key);// "אזור: אולם" (the main hall) says nothing, so only a real area is kept ("גוש 12", "יציע מזרחי").
  const area=m?.[1]?.trim()||'';out.push(m?(area&&!/^(?:אולם|האולם|כללי|רגיל|ראשי|hall|main|general)$/i.test(area)?'אזור '+area+', ':'')+'שורה '+m[2]+', כיסא '+m[3]:raw.trim());}
 return out;}
// A cancellation, restoration or change notice with no seats, count or price of its own: it marks the order, it is not more tickets.
const notice=(p:Part)=>(p.cancelled||p.restored)&&!p.seats?.length&&!p.count&&!p.price;
const at=(p:Part)=>p.mailed||0;
// One part per order. The reading kept: the newest mail that announces a change (new seats), else the fullest reading
// (Gemini over the rules, more seats). Cancelled or not: whichever came last, the cancellation or a "back on" mail.
function byOrder(parts:Record<string,Part>){const groups=new Map<string,[string,Part][]>();
 for(const [k,p] of Object.entries(parts)){const g=p.order?'o:'+norm(p.order):'k:'+k;if(!groups.has(g))groups.set(g,[]);groups.get(g)!.push([k,p]);}
 const out:Record<string,Part>={};
 for(const list of groups.values()){const readings=list.filter(([,p])=>!notice(p));const pool=readings.length?readings:list;
  const upd=pool.filter(([,p])=>p.update&&!notice(p)).sort((a,b)=>at(b[1])-at(a[1]))[0];
  const [k,base]=upd||pool.reduce((a,b)=>{const [,p]=b,[,q]=a;return (p.ai&&!q.ai)||(!!p.ai===!!q.ai&&(p.seats?.length||0)>(q.seats?.length||0))?b:a;});
  const marks=list.filter(([,p])=>p.cancelled||p.restored).sort((a,b)=>at(a[1])-at(b[1]));const last=marks[marks.length-1]?.[1];
  const cancelled=!!last?.cancelled&&!last.restored;const {cancelled:_c,restored:_r,...rest}=base;
  out[k]={...rest,mailed:Math.max(...list.map(([,p])=>at(p))),...(cancelled?{cancelled:true}:{}),...(list.some(([,p])=>p.update)?{update:true}:{}),...(!cancelled&&last?.restored?{restored:true}:{})};}
 return out;}
// Cancelled orders do not count; a cancellation with no order number (the event itself) cancels everything, unless a later mail says it is back on.
export const status=(all:Record<string,Part>)=>statusOf(Object.values(byOrder(all)));
function statusOf(list:Part[]){
 const whole=list.filter(p=>!p.order&&(p.cancelled||p.restored)).sort((a,b)=>at(a)-at(b)).pop();const wholeCx=!!whole?.cancelled;
 const real=list.filter(p=>!notice(p)||p.order);const live=wholeCx?[]:real.filter(p=>!p.cancelled&&!notice(p));
 return {cancelled:!live.length&&(wholeCx||list.some(p=>p.cancelled)),live,some:!wholeCx&&live.length>0&&list.some(p=>p.cancelled&&p.order)};}
export function totals(all:Record<string,Part>){const ordered=Object.values(byOrder(all));const st=statusOf(ordered);
 const parts=st.live.length?st.live:ordered.filter(p=>!notice(p));
 const seats=cleanSeats(parts.flatMap(p=>p.seats||[])).slice(0,20);
 const count=parts.reduce((a,p)=>a+(p.count||cleanSeats(p.seats||[]).length||1),0);const sum=parts.reduce((a,p)=>a+money(p.price),0);const cur=parts.map(p=>p.price||'').find(x=>/[₪$€£]/.test(x))?.match(/[₪$€£]/)?.[0]||'₪';
 const orders=parts.map(p=>p.order).filter(Boolean) as string[];
 return {seats,count,price:sum?cur+' '+(Math.round(sum*100)/100).toLocaleString('en-US'):undefined,orders};}
// The newer statement of a field wins; a time on the same day refines a date-only start; a mail without the field changes nothing.
function pick<V>(a:{v?:V;at:number;ai?:boolean},b:{v?:V;at:number;ai?:boolean},sameValue:(x:V,y:V)=>boolean,refines?:(x:V,y:V)=>boolean):{v?:V;at:number}{
 if(b.v===undefined||b.v===''||b.v===null)return a;if(a.v===undefined||a.v===''||a.v===null)return b;
 if(sameValue(a.v,b.v))return {v:refines?.(b.v,a.v)?b.v:refines?.(a.v,b.v)?a.v:(b.ai&&!a.ai?b.v:a.v),at:Math.max(a.at,b.at)};
 if(refines?.(b.v,a.v))return b;if(refines?.(a.v,b.v))return a;
 return b.at>a.at||(b.at===a.at&&b.ai&&!a.ai)?b:a;}
const day=(s:string)=>s.slice(0,10);
// A file is replaced when a newer mail about the same order (or the event, with no order) brings a ticket of its own and says it is a change or a replacement,
// or brings different seats for that order. The old file stays known (so it is not fetched again) but is never shown.
function freshFiles(files:TFile[],parts:Record<string,Part>){const partOf=(f:TFile)=>parts['m:'+f.msg];
 return files.map(f=>{const p=partOf(f);const o=f.order?norm(f.order):'';
  const newer=files.some(g=>g!==f&&(g.at||0)>(f.at||0)&&(!o||!g.order||norm(g.order)===o)&&(partOf(g)?.update||(o&&g.order&&partOf(g)&&p&&cleanSeats(partOf(g)!.seats||[]).join('|')!==cleanSeats(p.seats||[]).join('|')&&(partOf(g)!.seats||[]).length>0)));
  return newer?{...f,stale:true}:f.stale?{...f,stale:false}:f;});}
export function combine(o:Ticket,t:Ticket):Ticket{
 // The purchase mail (it has the date) describes the event; a short cancellation notice only marks it.
 const best=o.start&&!t.start?o:t.start&&!o.start?t:t.ai&&!o.ai?t:o.ai&&!t.ai?o:t;const parts={...partsOf(o)};
 for(const [k,p] of Object.entries(partsOf(t))){const old=parts[k];parts[k]=!old||(p.ai&&!old.ai)||(!!p.ai===!!old.ai&&(p.seats?.length||0)>=(old.seats?.length||0))?p:old;}
 const tot=totals(parts);const kept=byOrder(parts);
 const A=(x:Ticket,f:'start'|'venue'|'doors')=>({v:x[f],at:x.at?.[f]??x.mailed,ai:x.ai});
 const start=pick(A(o,'start'),A(t,'start'),(x,y)=>x===y,(x,y)=>day(x)===day(y)&&x.includes('T')&&!y.includes('T'));
 const venue=pick(A(o,'venue'),A(t,'venue'),(x,y)=>norm(x)===norm(y)||norm(x).includes(norm(y))||norm(y).includes(norm(x)));
 const doors=pick(A(o,'doors'),A(t,'doors'),(x,y)=>x===y);
 const venueFrom=venue.v===t.venue?t:o;const all=[...o.files,...t.files.filter(f=>!o.files.some(g=>g.id===f.id||(g.name===f.name&&g.size===f.size&&g.msg===f.msg)))];
 return {...best,parts:kept,seats:tot.seats,count:tot.count,price:tot.price??best.price,order:tot.orders.length>1?tot.orders.join(', '):best.order||tot.orders[0],
  start:start.v||best.start,venue:venue.v,address:venueFrom.address||best.address,city:venueFrom.city||best.city,doors:doors.v,at:{start:start.at,venue:venue.at,doors:doors.at},
  msgs:[...new Set([...o.msgs,...t.msgs])],files:freshFiles(all,parts).slice(-16),
  links:[...o.links,...t.links.filter(l=>!o.links.some(x=>x.url===l.url))].slice(0,4),cancelled:status(parts).cancelled,mailed:Math.max(o.mailed,t.mailed),
  update:o.update||t.update||undefined,restored:undefined,
  seller:best.seller||o.seller||t.seller,cancel:best.cancel?.text||best.cancel?.url?best.cancel:(o.cancel?.text||o.cancel?.url?o.cancel:t.cancel)};}
// Same event: same order, a shared mail, or the same title at the same time.
// A cancellation without a date joins the event with the same order number, or the same name; so does a change notice
// ("ההופעה נדחתה ל-10.11") from the same seller, even though its date is no longer the old one.
const ordersOf=(t:Ticket)=>Object.values(partsOf(t)).map(p=>p.order&&norm(p.order)).filter(Boolean) as string[];
const sameName=(a:string,b:string)=>{const x=norm(a),y=norm(b);return x.length>=4&&y.length>=4&&(x.includes(y)||y.includes(x));};
const near=(a:string,b:string)=>!a||!b||Math.abs(new Date(day(a)).getTime()-new Date(day(b)).getTime())<=120*864e5;
export const sameEvent=(a:Ticket,b:Ticket)=>a.key===b.key||a.msgs.some(m=>b.msgs.includes(m))||(a.start===b.start&&a.start.includes('T')&&norm(a.title)===norm(b.title))
 ||((a.cancelled||b.cancelled||a.restored||b.restored)&&!!a.start&&day(a.start)===day(b.start)&&sameName(a.title,b.title))
 ||((!a.start||!b.start)&&(a.cancelled||b.cancelled||a.restored||b.restored)&&(ordersOf(a).some(o=>ordersOf(b).includes(o))||(!ordersOf(a).length||!ordersOf(b).length)&&sameName(a.title,b.title)))
 ||((a.update||b.update)&&!ordersOf(a).some(o=>ordersOf(b).length&&!ordersOf(b).includes(o))&&sameName(a.title,b.title)&&(a.seller||'')===(b.seller||'')&&near(a.start,b.start));
export function mergeAll(a:Ticket[],b:Ticket[]){let out=[...a];
 for(const t of b){const hits=out.filter(o=>sameEvent(o,t));out=out.filter(o=>!hits.includes(o));out.push(hits.reduce((acc,o)=>combine(o,acc),t));}
 return out;}
// The files to show and keep offline: replaced tickets are left out.
export const current=(t:Ticket)=>t.files.filter(f=>!f.stale);
