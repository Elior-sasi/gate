import {NextRequest} from 'next/server';
import {z} from 'zod';
import {pushIdentity} from '@/lib/identity';
import {vapid,seal,send,db,dbOn,token,type Sub} from '@/lib/push';
import {mergeTickets,type Ticket} from '@/lib/tickets';
import {watch,type Row} from '@/lib/check';
export const dynamic='force-dynamic';
const H={'Cache-Control':'private, no-store'};
const sub=z.object({endpoint:z.string().url().max(1000),keys:z.object({p256dh:z.string().max(200),auth:z.string().max(100)})});
const body=z.object({subscription:sub.optional(),remove:z.string().max(1000).optional(),tickets:z.array(z.any()).max(300).optional(),hidden:z.array(z.string().max(200)).max(300).optional(),test:z.boolean().optional()});
const keep=(l:Ticket[])=>l.filter(t=>t&&typeof t.key==='string'&&typeof t.start==='string'&&Array.isArray(t.msgs)).slice(0,300);
// Status for the settings screen, plus this user's personal calendar and widget links.
export async function GET(req:NextRequest){if(!dbOn())return Response.json({enabled:false},{headers:H});
 // The tapped notification's event is kept on the server for 3 minutes; the app asks for it when it comes to the front
 // (on iPhone neither the worker's message nor navigate() reliably reach a page that was asleep).
 if(req.nextUrl.searchParams.get('step')==='want'){try{const u=await pushIdentity(req);const {sql,ready}=db();await ready;await sql`create table if not exists gate_want(user_id text primary key,k text not null,at timestamptz not null)`;
  const k=req.nextUrl.searchParams.get('t');
  if(k){await sql`insert into gate_want(user_id,k,at) values(${u.id},${k.slice(0,200)},now()) on conflict(user_id) do update set k=excluded.k,at=now()`;return Response.json({ok:true},{headers:H});}
  const r=(await sql`delete from gate_want where user_id=${u.id} returning k,at`)[0];return Response.json({t:r&&Date.now()-new Date(r.at).getTime()<180e3?r.k:null},{headers:H});}catch{return Response.json({t:null},{headers:H});}}
 try{const u=await pushIdentity(req);const {sql,ready}=db();await ready;const row=(await sql`select subs,checked_at from gate_users where user_id=${u.id}`)[0];
  const base=req.nextUrl.origin;return Response.json({enabled:true,publicKey:vapid().publicKey,devices:(row?.subs as Sub[]|undefined)?.length||0,checkedAt:row?.checked_at||null,
   calendar:base.replace(/^https/,'webcal')+'/api/calendar?t='+token(u.id,'calendar'),widget:base+'/api/widget?t='+token(u.id,'widget'),sms:base+'/api/sms/in?t='+token(u.id,'sms')},{headers:H});
 }catch{return Response.json({enabled:true,publicKey:vapid().publicKey},{headers:H});}}
// Saves the phone's tickets (and device, when turning notifications on) as the server copy.
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'בקשה לא מורשית'},{status:403});
 if(!dbOn())return Response.json({error:'השרת עוד לא חובר למסד נתונים',code:'NO_DB'},{status:503,headers:H});
 try{const u=await pushIdentity(req);const b=body.parse(await req.json());const {sql,ready}=db();await ready;
  const row=(await sql`select subs,tickets,hidden,refresh from gate_users where user_id=${u.id}`)[0];
  let subs:Sub[]=(row?.subs as Sub[])||[];if(b.remove)subs=subs.filter(s=>s.endpoint!==b.remove);
  if(b.subscription)subs=[b.subscription,...subs.filter(s=>s.endpoint!==b.subscription!.endpoint)].slice(0,5);
  // The phone's list replaces the server copy (it is the one the user sees and fixes).
  const tickets=b.tickets?mergeTickets(keep(b.tickets as Ticket[])):((row?.tickets as Ticket[])||[]);const hidden=b.hidden??((row?.hidden as string[])||[]);
  const refresh=u.refreshToken?seal(u.refreshToken):String(row?.refresh||'');
  await sql`insert into gate_users(user_id,email,refresh,subs,tickets,hidden) values(${u.id},${u.email},${refresh},${JSON.stringify(subs)},${JSON.stringify(tickets)},${JSON.stringify(hidden)})
   on conflict(user_id) do update set email=excluded.email,refresh=excluded.refresh,subs=excluded.subs,tickets=excluded.tickets,hidden=excluded.hidden,updated_at=now()`;
  if(b.subscription&&refresh)await watch({user_id:u.id,refresh} as Row,sql as never).catch(()=>false);
  if(b.test||b.subscription){const target=b.subscription?[b.subscription]:subs;let ok=0;for(const s of target)if(await send(s,{title:'Unstage',body:b.subscription?'ההתראות פעילות ✓':'התראת בדיקה ✓',tag:'test',url:'/'}).catch(()=>false))ok++;
   if(!ok)return Response.json({error:'ההתראה לא נשלחה. נסה לכבות ולהפעיל שוב.'},{status:502,headers:H});}
  return Response.json({ok:true,devices:subs.length},{headers:H});
 }catch(e){const code=e instanceof Error?e.message:'';return Response.json({error:code==='UNAUTHORIZED'?'צריך להיכנס מחדש עם Google.':'לא ניתן לשמור כרגע. נסה שוב.',code},{status:400,headers:H});}}
