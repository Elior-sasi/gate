// Which reminders the stored tickets deserve right now. Pure, so it can be tested without a database or Gmail.
import type {Ticket} from '@/lib/tickets';
export type Note={key:string;tag:string;title:string;body:string;url:string};
export type Sent=Record<string,string[]>;
const HOUR=36e5;
// Ticket times are the local time at the venue (Israel). Turns "2026-11-03T20:30" into the real moment.
export function ilMoment(start:string){const [d,h]=start.split('T');const [y,m,dd]=d.split('-').map(Number);const [hh,mm]=(h||'09:00').split(':').map(Number);
 const guess=Date.UTC(y,m-1,dd,hh,mm);const off=(t:number)=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Jerusalem',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(t));const g=(k:string)=>+p.find(x=>x.type===k)!.value;return Date.UTC(g('year'),g('month')-1,g('day'),g('hour'),g('minute'))-t;};
 return guess-off(guess-off(guess));}
export const ilHour=(t:number)=>+new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Jerusalem',hour:'numeric',hourCycle:'h23'}).format(new Date(t));
const ilDay=(t:number)=>new Date(t).toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});
const place=(t:Ticket)=>[t.venue,t.city].filter(Boolean).join(', ');
const time=(t:Ticket)=>t.start.split('T')[1]||'';
// The evening before (18:00-23:00): "מחר: <name>". A few hours before: "בעוד X שעות" with a tap straight to the ticket.
export function reminders(list:Ticket[],sent:Sent,hidden:string[],now=Date.now()):Note[]{const out:Note[]=[];
 for(const t of list){if(t.cancelled||hidden.includes(t.key))continue;const at=ilMoment(t.start);if(at<now-HOUR)continue;const done=sent[t.key]||[];const url='/?t='+encodeURIComponent(t.key);
  const tomorrow=ilDay(at)===ilDay(now+864e5);const h=ilHour(now);
  if(tomorrow&&h>=18&&h<23&&!done.includes('eve'))out.push({key:t.key,tag:'eve:'+t.key,title:'מחר: '+t.title,body:[time(t)&&'בשעה '+time(t),place(t)].filter(Boolean).join(' · ')||'יש לך אירוע מחר',url});
  const timed=t.start.includes('T');const left=at-now;
  if(timed&&left<=3*HOUR&&left>20*60e3&&!done.includes('soon')){const hrs=Math.max(1,Math.round(left/HOUR));
   out.push({key:t.key,tag:'soon:'+t.key,title:(hrs===1?'בעוד שעה: ':'בעוד '+hrs+' שעות: ')+t.title,body:[place(t),t.doors&&'דלתות '+t.doors,t.files.length?'הכרטיס מוכן באפליקציה':''].filter(Boolean).join(' · '),url});}
  if(!timed&&ilDay(at)===ilDay(now)&&h>=9&&!done.includes('soon'))out.push({key:t.key,tag:'soon:'+t.key,title:'היום: '+t.title,body:place(t)||'יש לך אירוע היום',url});}
 return out;}
export const mark=(sent:Sent,n:Note)=>({...sent,[n.key]:[...new Set([...(sent[n.key]||[]),n.tag.split(':')[0]])]});
export const newTicket=(t:Ticket):Note=>{const d=new Date(ilMoment(t.start));const day=d.toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Jerusalem'});
 return {key:t.key,tag:'new:'+t.key,title:'כרטיס חדש: '+t.title,body:[day+(time(t)?' בשעה '+time(t):''),place(t)].filter(Boolean).join(' · '),url:'/?t='+encodeURIComponent(t.key)};};
