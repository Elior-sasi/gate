// Which ticket files live on the phone for offline use. Pure, so it is tested without a browser.
import type {Ticket,TFile} from '@/lib/tickets';
import {current} from '@/lib/combine';
const DAY=864e5;
const dayOf=(t:Ticket)=>{const [y,m,d]=t.start.slice(0,10).split('-').map(Number);return new Date(y,m-1,d).getTime();};
const docs=(t:Ticket)=>current(t).filter(f=>!/pkpass/i.test(f.type+f.name));
// fetch: tickets of the next two weeks (not cancelled), loaded ahead. keep: those plus events up to two days past; anything else is removed.
export function offlinePlan(list:Ticket[],now=Date.now()){const today=new Date(new Date(now).toDateString()).getTime();
 const keep=list.filter(t=>t.start&&dayOf(t)>=today-2*DAY&&docs(t).length);const fetch=keep.filter(t=>!t.cancelled&&dayOf(t)>=today&&dayOf(t)<=today+14*DAY);
 const files=(l:Ticket[])=>l.flatMap(docs);return {fetch:files(fetch),keep:files(keep),events:keep.map(t=>({key:t.key,files:docs(t)}))};}
// Sign out: every key of this app in local storage goes, except the text-size setting (not personal).
export const personalKeys=(keys:string[])=>keys.filter(k=>/^(?:gate|unstage):/.test(k)&&k!=='unstage:size');
export type {TFile};
