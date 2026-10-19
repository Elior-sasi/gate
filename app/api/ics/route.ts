import {NextRequest} from 'next/server';
export const dynamic='force-dynamic';
// A calendar file for one event, with reminders the evening before and two hours before. The phone opens it as "add to calendar".
const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/;/g,'\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n').slice(0,600);
const fold=(l:string)=>{const out:string[]=[];let cur='';for(const ch of l){if(new TextEncoder().encode(cur+ch).length>73){out.push(cur);cur=' '+ch;}else cur+=ch;}out.push(cur);return out.join('\r\n');};
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return new Response('forbidden',{status:403});
 const f=await req.formData();const g=(k:string)=>String(f.get(k)||'').trim();
 const start=g('start');const m=start.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);if(!m)return new Response('bad date',{status:400});
 const title=g('title')||'אירוע';const hours=Math.min(12,Math.max(1,Number(g('hours'))||3));
 const timed=!!m[4];const d=m[1]+m[2]+m[3];
 const end=timed?(()=>{const t=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4]+hours,+m[5]));return t.toISOString().slice(0,16).replace(/[-:]/g,'')+'00';})():(()=>{const t=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]+1));return t.toISOString().slice(0,10).replace(/-/g,'');})();
 const loc=[g('venue'),g('address'),g('city')].filter(Boolean).join(', ');
 const desc=[g('seats')&&'מקומות: '+g('seats'),g('doors')&&'פתיחת דלתות: '+g('doors'),g('order')&&'מספר הזמנה: '+g('order'),g('provider')].filter(Boolean).join('\n');
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');const uid=d+'-'+(g('order')||title).replace(/[^\w]/g,'').slice(0,40)+'@gate';
 const alarm=(trigger:string)=>['BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc(title),'TRIGGER:'+trigger,'END:VALARM'];
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Unstage//HE','CALSCALE:GREGORIAN','METHOD:PUBLISH',
  'BEGIN:VTIMEZONE','TZID:Asia/Jerusalem','BEGIN:STANDARD','DTSTART:19701025T020000','RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU','TZOFFSETFROM:+0300','TZOFFSETTO:+0200','TZNAME:IST','END:STANDARD','BEGIN:DAYLIGHT','DTSTART:19700327T020000','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1FR','TZOFFSETFROM:+0200','TZOFFSETTO:+0300','TZNAME:IDT','END:DAYLIGHT','END:VTIMEZONE',
  'BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+stamp,
  ...(timed?['DTSTART;TZID=Asia/Jerusalem:'+d+'T'+m[4]+m[5]+'00','DTEND;TZID=Asia/Jerusalem:'+end]:['DTSTART;VALUE=DATE:'+d,'DTEND;VALUE=DATE:'+end]),
  'SUMMARY:'+esc(title),...(loc?['LOCATION:'+esc(loc)]:[]),...(desc?['DESCRIPTION:'+esc(desc)]:[]),
  ...(timed?[...alarm('-PT2H'),...alarm('-PT20H')]:alarm('-PT15H')),'END:VEVENT','END:VCALENDAR'];
 return new Response(lines.map(fold).join('\r\n')+'\r\n',{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'inline; filename="gate.ics"','Cache-Control':'no-store'}});}
