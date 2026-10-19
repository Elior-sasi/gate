import {NextRequest} from 'next/server';
import {db,dbOn,tokenUser} from '@/lib/push';
import {upcoming} from '@/lib/widget';
import {ilMoment} from '@/lib/notify';
import type {Ticket} from '@/lib/tickets';
export const dynamic='force-dynamic';
// Siri shortcut: plain Hebrew text to read aloud. Same personal link as the widget; the link is the credential.
const DAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
function when(t:Ticket,now:number){const at=ilMoment(t.start);const day=(x:number)=>new Date(x).toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});const d=Math.round((new Date(day(at)).getTime()-new Date(day(now)).getTime())/864e5);
 const h=t.start.split('T')[1];const at_=h?' בשעה '+h:'';const wd=new Date(at).toLocaleDateString('en-US',{weekday:'short',timeZone:'Asia/Jerusalem'});const i=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(wd);
 if(d<=0)return 'היום'+at_;if(d===1)return 'מחר'+at_;if(d<7)return 'ביום '+DAYS[i]+at_;return 'ב-'+new Date(at).toLocaleDateString('he-IL',{day:'numeric',month:'long',timeZone:'Asia/Jerusalem'})+at_;}
export async function GET(req:NextRequest){const H={'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'};
 if(!dbOn())return new Response('השרת של Unstage לא מוגדר כרגע.',{status:503,headers:H});
 const user=tokenUser(req.nextUrl.searchParams.get('t')||'','widget');if(!user)return new Response('הקישור לא תקין. העתק אותו מחדש מההגדרות של Unstage.',{status:401,headers:H});
 const {sql,ready}=db();await ready;const row=(await sql`select tickets,hidden from gate_users where user_id=${user}`)[0];
 const list=upcoming((row?.tickets as Ticket[])||[],(row?.hidden as string[])||[]);const now=Date.now();
 if(!list.length)return new Response('אין לך אירועים קרובים.',{headers:H});
 const [a,...rest]=list;const where=a.venue?' ב'+a.venue.split(' - ')[0]:'';
 let text='האירוע הבא שלך: '+a.title+', '+when(a,now)+where+'.';
 if(a.seats.length===1)text+=' המקום שלך: '+a.seats[0]+'.';else if(a.seats.length>1)text+=' יש לך '+a.seats.length+' מקומות.';
 if(rest.length)text+=' אחריו: '+rest.slice(0,2).map(t=>t.title+', '+when(t,now)).join('. ')+'.';
 return new Response(text,{headers:H});}
