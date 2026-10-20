import {NextRequest} from 'next/server';
import {db,dbOn,tokenUser} from '@/lib/push';
import {parseTicketSms} from '@/lib/sms';
import {snapshot,keyOf} from '@/lib/keep';
import {presApi,presTicket} from '@/lib/pres';
import {newId} from '@/lib/share';
export const dynamic='force-dynamic';export const maxDuration=40;
// Called by the iPhone Shortcut with the SMS text (or by the app, when a message is pasted). The personal link is the only credential.
// The ticket behind the link is copied right away, while the link still opens; the app picks it up and joins it to its event.
export async function POST(req:NextRequest){
 if(!dbOn())return Response.json({ok:false,error:'no-db'},{status:503});
 const user=tokenUser(req.nextUrl.searchParams.get('t')||'','sms');if(!user)return Response.json({ok:false,error:'bad link'},{status:401});
 // Shortcuts sends the message in different shapes (plain text, a form, or JSON where the message may itself be an object):
 // the raw body is read once, and the longest piece of text in it is the message.
 let raw='';try{raw=await req.text();}catch{}
 const strings=(v:unknown):string[]=>typeof v==='string'?[v]:Array.isArray(v)?v.flatMap(strings):v&&typeof v==='object'?Object.values(v).flatMap(strings):[];
 let text=raw;const type=req.headers.get('content-type')||'';let shape='text';
 try{if(/^\s*[{\[]/.test(raw)){text=strings(JSON.parse(raw)).sort((a,b)=>b.length-a.length)[0]||'';shape='json';}
  else if(type.includes('x-www-form-urlencoded')){text=[...new URLSearchParams(raw).values()].sort((a,b)=>b.length-a.length)[0]||'';shape='form';}
  else if(type.includes('multipart/form-data')){text=(raw.match(/\r?\n\r?\n([\s\S]*?)\r?\n--/g)||[]).map(x=>x.replace(/^\r?\n\r?\n|\r?\n--$/g,'')).sort((a,b)=>b.length-a.length)[0]||'';shape='multipart';}}catch{}
 text=text.trim().slice(0,1500);const s=parseTicketSms(text);
 const {sql,ready}=db();await ready;
 await sql`insert into gate_meta(k,v) values(${'smsin:'+user+':'+(text.length<8?'empty':s?'ticket':'other')},now()) on conflict(k) do update set v=now()`;
 // What reached us, without the content: its shape and length (to tell an empty Shortcut variable from a message without a link).
 await sql`insert into gate_meta(k,v) values(${'smsdbg:'+user+':'+shape+':'+raw.length+':'+text.length},now()) on conflict(k) do update set v=now()`;
 if(!s)return Response.json({ok:true,ticket:false});
 const recent=await sql`select count(*)::int as n from gate_sms where user_id=${user} and created_at>now()-interval '1 hour'`;if(Number(recent[0].n)>40)return Response.json({ok:false,error:'too many'},{status:429});
 let file:{id:string;name:string;type:string;size:number}|null=null;let info:unknown=null;
 try{const key=keyOf(user+'|'+s.url);const old=(await sql`select id,type,name,length(data) as n from gate_kept where user_id=${user} and url_key=${key}`)[0];
  if(old){file={id:'k_'+old.id,name:String(old.name),type:String(old.type),size:Math.round(Number(old.n)*0.75)};if(presApi(s.url))info=(await presTicket(s.url).catch(()=>null))?.info||null;}
  else{const k=await snapshot(s.url,'כרטיס');if(k){info=k.info||null;const id=newId();await sql`insert into gate_kept(id,user_id,url_key,msg,type,name,data,expires) values(${id},${user},${key},${'sms'},${k.type},${k.name},${k.data},${new Date(Date.now()+120*864e5).toISOString()})`;file={id:'k_'+id,name:k.name,type:k.type,size:Math.round(k.data.length*0.75)};}}}catch{}
 await sql`insert into gate_sms(user_id,text,item) values(${user},${text},${JSON.stringify({...s,file,...(info?{info}:{})})})`;
 return Response.json({ok:true,ticket:true,kept:!!file});}
