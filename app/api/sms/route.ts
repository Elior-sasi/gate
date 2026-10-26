import {NextRequest} from 'next/server';
import {pushIdentity} from '@/lib/identity';
import {db,dbOn} from '@/lib/push';
import {presApi,presTicket} from '@/lib/pres';
import {keyOf,snapshot} from '@/lib/keep';
import {closeBrowser} from '@/lib/render';
import {newId} from '@/lib/share';
export const dynamic='force-dynamic';export const maxDuration=60;
const H={'Cache-Control':'private, no-store'};
// The app picks up the tickets that came by SMS (and the last time the Shortcut reached the server).
export async function GET(req:NextRequest){let id='';try{id=(await pushIdentity(req)).id;}catch{return Response.json({error:'unauthorized'},{status:401});}
 if(!dbOn())return Response.json({items:[]},{headers:H});const {sql,ready}=db();await ready;
 // Every ticket of the last 60 days, each time (not handed over once): the app adds them again after a rescan, or on a new phone.
 await sql`delete from gate_sms where user_id=${id} and created_at<now()-interval '60 days'`;
 const rows=await sql`select id,item,created_at from gate_sms where user_id=${id} order by created_at`;
 // Tickets from pres.global kept in an older drawing are drawn again in the current one (the cinema's own ticket layout).
 for(const r of rows){const it=r.item as {url?:string;file?:{id:string;type:string}|null;v?:number};if(!it?.url||!it.file||it.v===7||!presApi(it.url))continue;
  try{const p=await snapshot(it.url,'כרטיס');if(!p||p.type==='image/svg+xml'){const item={...it,v:7};await sql`update gate_sms set item=${JSON.stringify(item)} where id=${r.id}`;r.item=item;continue;}const k=newId();const data=p.data;
   await sql`insert into gate_kept(id,user_id,url_key,msg,type,name,data,expires) values(${k},${id},${keyOf(id+'|'+it.url+'|v7')},${'sms'},${p.type},${p.name},${data},${new Date(Date.now()+120*864e5).toISOString()})`;
   const item={...it,v:7,file:{id:'k_'+k,name:p.name,type:p.type,size:Math.round(data.length*0.75)},...(p.info?{info:p.info}:{})};
   await sql`delete from gate_kept where id=${it.file.id.slice(2)} and user_id=${id}`;
   await sql`update gate_sms set item=${JSON.stringify(item)} where id=${r.id}`;r.item=item;}catch{}}
 await closeBrowser();
 const seen=await sql`select k,v from gate_meta where k like ${'smsin:'+id+':%'} order by v desc limit 1`;const dbg=(await sql`select k from gate_meta where k like ${'smsdbg:'+id+':%'} order by v desc limit 1`)[0];
 return Response.json({items:rows.map(r=>({...(r.item as object),at:r.created_at})),last:seen[0]?{at:seen[0].v,kind:String(seen[0].k).split(':').pop(),...(dbg?{shape:String(dbg.k).split(':')[2],raw:Number(String(dbg.k).split(':')[3])}:{})}:null},{headers:H});}
