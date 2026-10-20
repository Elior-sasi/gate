import {NextRequest} from 'next/server';
import {db,dbOn,tokenUser} from '@/lib/push';
import {lines,lock,upcoming,RENDER} from '@/lib/widget';
import type {Ticket} from '@/lib/tickets';
import {ilMoment} from '@/lib/notify';
export const dynamic='force-dynamic';
// Home-screen and lock-screen widget (Scriptable): the next events from the server copy. The personal link is the credential.
export async function GET(req:NextRequest){
 // The drawing code itself, so the tiny script on the phone never needs replacing.
 if(req.nextUrl.searchParams.get('js'))return new Response(RENDER,{headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'}});
 if(!dbOn())return Response.json({ok:false},{status:503});
 const user=tokenUser(req.nextUrl.searchParams.get('t')||'','widget');if(!user)return Response.json({ok:false},{status:401});
 const {sql,ready}=db();await ready;const row=(await sql`select tickets,hidden from gate_users where user_id=${user}`)[0];
 const all=(row?.tickets as Ticket[])||[],hidden=(row?.hidden as string[])||[];const L=lines(all,hidden);const next=upcoming(all,hidden)[0];
 // The next event: days left (countdown bar) and its date (ticket stub on the medium widget).
 let top=null as null|{done:number;day:number;mon:string};if(next){const at=ilMoment(next.start);const day=(x:number)=>new Date(new Date(x).toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'})).getTime();const left=Math.max(0,Math.round((day(at)-day(Date.now()))/864e5));const d=new Date(new Date(at).toLocaleString('en-US',{timeZone:'Asia/Jerusalem'}));top={done:Math.max(0,Math.min(7,7-left)),day:d.getDate(),mon:['ינו׳','פבר׳','מרץ','אפר׳','מאי','יוני','יולי','אוג׳','ספט׳','אוק׳','נוב׳','דצמ׳'][d.getMonth()]};}
 return Response.json({ok:true,lines:L,lock:lock(L),top,count:upcoming(all,hidden).length,url:'https://gatetickets.vercel.app'+(next?'/?t='+encodeURIComponent(next.key):'')},{headers:{'Cache-Control':'no-store'}});}
