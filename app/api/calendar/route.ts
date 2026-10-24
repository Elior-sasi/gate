import {NextRequest} from 'next/server';
import {db,dbOn,tokenUser} from '@/lib/push';
import type {Ticket} from '@/lib/tickets';
export const dynamic='force-dynamic';
// Subscribed calendar (iPhone Calendar / Google Calendar "from URL"): every upcoming event, kept up to date by the calendar app.
// The personal link is the credential. Each event keeps its UID, so a change of time or place updates the same calendar entry;
// a cancelled event stays, marked cancelled (STATUS:CANCELLED), instead of quietly disappearing.
const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/;/g,'\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n').slice(0,600);
const fold=(l:string)=>{const out:string[]=[];let cur='';for(const ch of l){if(new TextEncoder().encode(cur+ch).length>73){out.push(cur);cur=' '+ch;}else cur+=ch;}out.push(cur);return out.join('\r\n');};
const TZ=['BEGIN:VTIMEZONE','TZID:Asia/Jerusalem','BEGIN:STANDARD','DTSTART:19701025T020000','RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU','TZOFFSETFROM:+0300','TZOFFSETTO:+0200','TZNAME:IST','END:STANDARD','BEGIN:DAYLIGHT','DTSTART:19700327T020000','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1FR','TZOFFSETFROM:+0200','TZOFFSETTO:+0300','TZNAME:IDT','END:DAYLIGHT','END:VTIMEZONE'];
const ICON:Record<string,string>={concert:'🎵',show:'🎭',movie:'🎬',lecture:'🎤',sport:'🏟️',festival:'🎉',standup:'😂',party:'🪩',other:'🎟️'};
export async function GET(req:NextRequest){
 if(!dbOn())return new Response('',{status:503});const user=tokenUser(req.nextUrl.searchParams.get('t')||'','calendar');if(!user)return new Response('',{status:401});
 const {sql,ready}=db();await ready;const row=(await sql`select tickets,hidden from gate_users where user_id=${user}`)[0];
 const hidden=(row?.hidden as string[])||[];const list=((row?.tickets as Ticket[])||[]).filter(t=>!hidden.includes(t.key)&&t.start>=new Date(Date.now()-60*864e5).toISOString().slice(0,10));
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');const ev:string[]=[];
 for(const t of list){const m=t.start.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);if(!m)continue;const d=m[1]+m[2]+m[3];const hours=t.kind==='movie'?2:3;
  const when=m[4]?['DTSTART;TZID=Asia/Jerusalem:'+d+'T'+m[4]+m[5]+'00','DTEND;TZID=Asia/Jerusalem:'+new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4]+hours,+m[5])).toISOString().slice(0,16).replace(/[-:]/g,'')+'00']
   :['DTSTART;VALUE=DATE:'+d,'DTEND;VALUE=DATE:'+new Date(Date.UTC(+m[1],+m[2]-1,+m[3]+1)).toISOString().slice(0,10).replace(/-/g,'')];
  const loc=[t.venue,t.address,t.city].filter(Boolean).join(', ');const desc=[t.seats.length&&'מקומות: '+t.seats.join('; '),t.doors&&'פתיחת דלתות: '+t.doors,t.order&&'מספר הזמנה: '+t.order,'הכרטיס: https://gatetickets.vercel.app/?t='+encodeURIComponent(t.key)].filter(Boolean).join('\n');
  ev.push('BEGIN:VEVENT','UID:'+t.key.replace(/[^\w:.-]/g,'')+'@gate','DTSTAMP:'+stamp,...when,...(t.cancelled?['STATUS:CANCELLED']:['STATUS:CONFIRMED']),'SEQUENCE:'+Math.floor((t.mailed||0)/1000),'SUMMARY:'+esc((t.cancelled?'בוטל: ':(ICON[t.kind]||'🎟️')+' ')+t.title),...(loc?['LOCATION:'+esc(loc)]:[]),'DESCRIPTION:'+esc(desc),
   ...(m[4]&&!t.cancelled?['BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc(t.title),'TRIGGER:-PT2H','END:VALARM']:[]),'END:VEVENT');}
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Unstage//HE','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Unstage · אירועים','X-WR-TIMEZONE:Asia/Jerusalem','REFRESH-INTERVAL;VALUE=DURATION:PT1H','X-PUBLISHED-TTL:PT1H',...TZ,...ev,'END:VCALENDAR'];
 return new Response(lines.map(fold).join('\r\n')+'\r\n',{headers:{'Content-Type':'text/calendar; charset=utf-8','Cache-Control':'no-store'}});}
