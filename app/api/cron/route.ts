import {db,dbOn} from '@/lib/push';
import {check,watch,type Row} from '@/lib/check';
export const dynamic='force-dynamic';
export const maxDuration=60;
// Called on a schedule (GitHub Actions, every 30 minutes). It returns no mail data, so it needs no secret;
// a short cooldown keeps repeated calls cheap.
export async function GET(){
 if(!dbOn())return Response.json({ok:false,reason:'no-db'});
 const {sql,ready}=db();await ready;
 const last=(await sql`select v from gate_meta where k='cron'`)[0]?.v;
 if(last&&Date.now()-new Date(last as string).getTime()<12*60000)return Response.json({ok:true,skipped:true});
 await sql`insert into gate_meta(k,v) values('cron',now()) on conflict(k) do update set v=now()`;
 const users=await sql`select user_id,refresh,subs,tickets,hidden,seen,sent,checked_at from gate_users where jsonb_array_length(subs)>0 order by checked_at nulls first limit 30`;
 let sent=0,errors=0;for(const u of users){try{sent+=(await check(u as unknown as Row,sql as never)).sent;await watch(u as unknown as Row,sql as never).catch(()=>{});}catch{errors++;}}
 return Response.json({ok:true,users:users.length,sent,errors},{headers:{'Cache-Control':'no-store'}});}
