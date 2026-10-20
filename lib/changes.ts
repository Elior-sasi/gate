// What changed in an event that was already known, worth telling the user about. Pure, so it is tested without Gmail or a database.
import type {Ticket} from '@/lib/tickets';
import {current,cleanSeats} from '@/lib/combine';
import {navQuery} from '@/lib/place';
export type Change={type:'DATE_CHANGED'|'TIME_CHANGED'|'VENUE_CHANGED'|'HALL_CHANGED'|'SEAT_CHANGED'|'TICKET_REPLACED'|'CANCELLED'|'RESTORED';from?:string;to?:string};
const norm=(s:string)=>s.toLowerCase().replace(/[^\w֐-׿]+/g,'');
// The hall after the venue: "סינמטק ירושלים - אולם 3" → "אולם 3".
const hall=(v?:string)=>(v||'').match(/[-–,|]\s*((?:אולם|סינמטק|hall|screen|אודיטוריום|סטודיו)\s*[\w\u0590-\u05FF]{1,12})\s*$/i)?.[1]||'';
export function detectTicketChanges(old:Ticket|undefined,now:Ticket|undefined):Change[]{if(!old||!now)return [];const out:Change[]=[];
 if(!old.cancelled&&now.cancelled)return [{type:'CANCELLED'}];
 if(old.cancelled&&!now.cancelled)out.push({type:'RESTORED'});
 if(now.cancelled)return out;
 const [od,ot]=[old.start.slice(0,10),old.start.split('T')[1]||''],[nd,nt]=[now.start.slice(0,10),now.start.split('T')[1]||''];
 if(od&&nd&&od!==nd)out.push({type:'DATE_CHANGED',from:od,to:nd});
 if(ot&&nt&&ot!==nt)out.push({type:'TIME_CHANGED',from:ot,to:nt});
 const ov=norm(navQuery({venue:old.venue})),nv=norm(navQuery({venue:now.venue}));
 // A place written a little differently ("סינמטק ירושלים" / "סינמטק ירושלים - סינמטק 2") is the same place.
 if(ov&&nv&&!ov.includes(nv)&&!nv.includes(ov))out.push({type:'VENUE_CHANGED',from:old.venue,to:now.venue});
 else if(hall(old.venue)&&hall(now.venue)&&norm(hall(old.venue))!==norm(hall(now.venue)))out.push({type:'HALL_CHANGED',from:hall(old.venue),to:hall(now.venue)});
 const os=cleanSeats(old.seats),ns=cleanSeats(now.seats);
 // More seats from another order is a purchase, not a change; the same number of seats, now different, is.
 if(os.length&&ns.length&&os.length===ns.length&&os.join('|')!==ns.join('|'))out.push({type:'SEAT_CHANGED',from:os.join(' · '),to:ns.join(' · ')});
 const of=new Set(current(old).map(f=>f.id)),nf=current(now);
 if(of.size&&nf.some(f=>!of.has(f.id))&&current(old).some(f=>now.files.some(g=>g.id===f.id&&g.stale)))out.push({type:'TICKET_REPLACED'});
 return out;}
const MONTHS=['בינואר','בפברואר','במרץ','באפריל','במאי','ביוני','ביולי','באוגוסט','בספטמבר','באוקטובר','בנובמבר','בדצמבר'];
const he=(d:string)=>{const [,m,dd]=d.split('-').map(Number);return dd+' '+MONTHS[m-1];};
// One notification per change, in plain Hebrew; sig is what is remembered so the same change is never sent twice.
export function changeNote(t:Ticket,c:Change){const url='/?t='+encodeURIComponent(t.key);
 const n=(title:string,body:string)=>({key:t.key,tag:'chg:'+t.key,title,body,url,sig:c.type+'|'+(c.to||'')});
 switch(c.type){
  case 'CANCELLED':return n('האירוע בוטל',t.title+' בוטל. כדאי לבדוק את הודעת המארגן לגבי החזר.');
  case 'RESTORED':return n('האירוע חזר להתקיים',t.title+' מתקיים בכל זאת.');
  case 'TIME_CHANGED':return n('שעת האירוע השתנתה','השעה של '+t.title+' השתנתה מ־'+c.from+' ל־'+c.to+'.');
  case 'DATE_CHANGED':return n('תאריך האירוע השתנה',t.title+' עבר מ־'+he(c.from!)+' ל־'+he(c.to!)+'.');
  case 'VENUE_CHANGED':return n('מקום האירוע השתנה',t.title+': '+(c.to||'מקום חדש')+'.');
  case 'HALL_CHANGED':return n('האולם השתנה',t.title+': '+c.to+' (במקום '+c.from+').');
  case 'SEAT_CHANGED':return n('המושב שלך השתנה',c.to!.replace(/, /g,' · '));
  case 'TICKET_REPLACED':return n('הגיע כרטיס חדש',t.title+': הכרטיס הקודם הוחלף. Unstage יציג רק את החדש.');}}
// The notifications a mail earns for an event already known, minus any already sent (sent[key] remembers each change once).
// Time and place changes count only from a mail that says it is a change, or that Gemini read; cancelling, restoring and replacing
// already required the mail's own words.
export function changeNotes(before:Ticket|undefined,after:Ticket|undefined,trusted:boolean,sent:Record<string,string[]>){const notes:ReturnType<typeof changeNote>[]=[];let s=sent;
 if(!after)return {notes,sent:s};
 for(const c of detectTicketChanges(before,after)){if(!trusted&&!['CANCELLED','RESTORED','TICKET_REPLACED'].includes(c.type))continue;
  const n=changeNote(after,c);const done=s[after.key]||[];if(done.includes(n.sig))continue;notes.push(n);s={...s,[after.key]:[...done,n.sig]};}
 return {notes,sent:s};}
