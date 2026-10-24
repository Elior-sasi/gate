// Tickets added by hand (a picture or PDF from WhatsApp, PayBox and the like): turned into an event, or added to an event
// already in the list. Applied again on every pull (adding is idempotent), so they survive a rescan and reach a new phone.
import type {Ticket,TFile,Kind} from '@/lib/tickets';
import {mergeAll,partsOf,totals} from '@/lib/combine';
export type ManualItem={id:string;at:string;title:string;start:string;venue?:string;kind:Kind;count:number;seats:string[];attach?:string;file:{id:string;name:string;type:string;size:number}};
const norm=(s:string)=>s.toLowerCase().replace(/[^\w֐-׿]+/g,'');
export function applyManual(tickets:Ticket[],items:ManualItem[],gone:string[]=[]):Ticket[]{let out=tickets;
 // A ticket the user deleted leaves the list too.
 if(gone.length)out=out.flatMap(t=>{const mine=(m:string)=>gone.includes(m.replace(/^man/,''));if(!t.msgs.some(mine)&&!t.files.some(f=>mine(f.msg)))return [t];
  const msgs=t.msgs.filter(m=>!mine(m));if(!msgs.length)return [];const parts=Object.fromEntries(Object.entries(partsOf(t)).filter(([k])=>!mine(k.slice(2))));const tot=totals(parts);
  return [{...t,msgs,parts,files:t.files.filter(f=>!mine(f.msg)),seats:tot.seats,count:tot.count}];});
 for(const x of items){const msg='man'+x.id;if(out.some(t=>t.files.some(f=>f.msg===msg)))continue;const at=new Date(x.at).getTime();
  const f:TFile={msg,id:x.file.id,name:x.file.name,type:x.file.type,size:x.file.size,at};const part={seats:x.seats,count:x.count,mailed:at};
  const target=x.attach?out.find(t=>t.key===x.attach)||out.find(t=>norm(t.title)===norm(x.title)&&t.start.slice(0,10)===x.start.slice(0,10)):undefined;
  if(target){out=out.map(t=>{if(t!==target)return t;const parts={...partsOf(t),['m:'+msg]:part};
    const tot=totals(parts);return {...t,parts,msgs:[...t.msgs,msg],files:[...t.files,f],seats:tot.seats,count:tot.count};});continue;}
  const t:Ticket={key:'man:'+x.id,msgs:[msg],thread:'',title:x.title,kind:x.kind,start:x.start,venue:x.venue||undefined,seats:x.seats,count:x.count,
   files:[f],links:[],mailed:at,seller:'manual',parts:{['m:'+msg]:part}};
  out=mergeAll(out,[t]);}
 return out;}
