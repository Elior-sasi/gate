import {NextRequest} from 'next/server';
import {pushIdentity} from '@/lib/identity';
import {db,dbOn} from '@/lib/push';
export const dynamic='force-dynamic';
const H={'Cache-Control':'private, no-store'};
// The app picks up the tickets that came by SMS (and the last time the Shortcut reached the server).
export async function GET(req:NextRequest){let id='';try{id=(await pushIdentity(req)).id;}catch{return Response.json({error:'unauthorized'},{status:401});}
 if(!dbOn())return Response.json({items:[]},{headers:H});const {sql,ready}=db();await ready;
 const rows=await sql`delete from gate_sms where user_id=${id} and created_at>now()-interval '60 days' returning item,created_at`;
 const seen=await sql`select k,v from gate_meta where k like ${'smsin:'+id+':%'} order by v desc limit 1`;const dbg=(await sql`select k from gate_meta where k like ${'smsdbg:'+id+':%'} order by v desc limit 1`)[0];
 return Response.json({items:rows.map(r=>({...(r.item as object),at:r.created_at})),last:seen[0]?{at:seen[0].v,kind:String(seen[0].k).split(':').pop(),...(dbg?{shape:String(dbg.k).split(':')[2],raw:Number(String(dbg.k).split(':')[3])}:{})}:null},{headers:H});}
