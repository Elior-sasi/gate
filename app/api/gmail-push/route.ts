import {NextRequest} from 'next/server';
import {db,dbOn} from '@/lib/push';
import {check,watch,type Row} from '@/lib/check';
export const dynamic='force-dynamic';
export const maxDuration=60;
// Gmail → Google Pub/Sub → here, the moment new mail arrives, so a new ticket is announced in seconds instead of up to 30 minutes.
// A message only names an address; the check runs only for a known user, at most once per 20 seconds, and returns nothing,
// so a forged message can at most cause an extra check of that user's own mail.
export async function POST(req:NextRequest){
 if(!dbOn())return new Response(null,{status:204});
 let email='';try{const b=await req.json();email=String(JSON.parse(Buffer.from(b?.message?.data||'','base64').toString('utf8'))?.emailAddress||'').toLowerCase();}catch{}
 const {sql,ready}=db();await ready;
 await sql`insert into gate_meta(k,v) values('gpush-any',now()) on conflict(k) do update set v=now()`.catch(()=>{});
 if(!/^[^@\s]+@[^@\s]+$/.test(email))return new Response(null,{status:204});
 const u=(await sql`select user_id,refresh,subs,tickets,hidden,seen,sent,checked_at from gate_users where lower(email)=${email} and jsonb_array_length(subs)>0 limit 1`)[0] as unknown as Row|undefined;
 if(!u)return new Response(null,{status:204});
 const k='gpush:'+u.user_id;const last=(await sql`select v from gate_meta where k=${k}`)[0]?.v;
 if(last&&Date.now()-new Date(last as string).getTime()<20000)return new Response(null,{status:204});
 await sql`insert into gate_meta(k,v) values(${k},now()) on conflict(k) do update set v=now()`;
 try{await check(u,sql as never);await watch(u,sql as never);}catch{}
 return new Response(null,{status:204});}
