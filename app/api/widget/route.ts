import {NextRequest} from 'next/server';
import {db,dbOn,tokenUser} from '@/lib/push';
import {lines,lock,upcoming,RENDER} from '@/lib/widget';
import type {Ticket} from '@/lib/tickets';
export const dynamic='force-dynamic';
// Home-screen and lock-screen widget (Scriptable): the next events from the server copy. The personal link is the credential.
export async function GET(req:NextRequest){
 // The drawing code itself, so the tiny script on the phone never needs replacing.
 if(req.nextUrl.searchParams.get('js'))return new Response(RENDER,{headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'}});
 if(!dbOn())return Response.json({ok:false},{status:503});
 const user=tokenUser(req.nextUrl.searchParams.get('t')||'','widget');if(!user)return Response.json({ok:false},{status:401});
 const {sql,ready}=db();await ready;const row=(await sql`select tickets,hidden from gate_users where user_id=${user}`)[0];
 const all=(row?.tickets as Ticket[])||[],hidden=(row?.hidden as string[])||[];const L=lines(all,hidden);const next=upcoming(all,hidden)[0];
 return Response.json({ok:true,lines:L,lock:lock(L),count:upcoming(all,hidden).length,url:'https://gatetickets.vercel.app'+(next?'/?t='+encodeURIComponent(next.key):'')},{headers:{'Cache-Control':'no-store'}});}
