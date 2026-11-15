import {db} from '@/lib/push';
import type {Ticket} from '@/lib/tickets';
export const dynamic='force-dynamic';
// Temporary: is the Lev Cinema event in the server copy of the list (event fields only).
export async function GET(){const {sql,ready}=db();await ready;const u=(await sql`select tickets,hidden,checked_at from gate_users where user_id='104186574244796540011'`)[0];
 const all=(u?.tickets as Ticket[])||[];const f=(t:Ticket)=>({title:t.title,start:t.start,cx:!!t.cancelled,seller:t.seller,msgs:t.msgs.length,files:t.files.length,links:t.links.length,hidden:((u?.hidden as string[])||[]).includes(t.key)});
 return Response.json({n:all.length,checked:u?.checked_at,lev:all.filter(t=>/lev|יער|לב/.test((t.seller||'')+t.title+(t.venue||''))).map(f),nov:all.filter(t=>t.start>='2026-11-05').map(f)},{headers:{'Cache-Control':'no-store'}});}
