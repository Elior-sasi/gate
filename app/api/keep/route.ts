import {NextRequest} from 'next/server';
import {z} from 'zod';
import {identity} from '@/lib/identity';
import {gmailClient,ticketLinks,type Message} from '@/lib/gmail';
import {db,dbOn} from '@/lib/push';
import {snapshot,keyOf,shell,why} from '@/lib/keep';
import {closeBrowser} from '@/lib/render';
import {ilMoment} from '@/lib/notify';
import {newId} from '@/lib/share';
export const dynamic='force-dynamic';export const maxDuration=60;
const H={'Cache-Control':'private, no-store'};
const body=z.object({items:z.array(z.object({msg:z.string().regex(/^[a-zA-Z0-9]{6,40}$/),url:z.string().url().max(3000),label:z.string().max(60),start:z.string().regex(/^\d{4}-\d{2}-\d{2}/)})).min(1).max(4)});
// Copies the tickets behind the mail's ticket links while they still open (kept until a week after the event).
// Only a link that really is in that message is fetched, so this cannot be pointed at anything else.
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'בקשה לא מורשית'},{status:403});
 if(!dbOn())return Response.json({error:'no db'},{status:503,headers:H});
 try{const u=await identity(req);const {items}=body.parse(await req.json());const gmail=gmailClient(u.accessToken);const {sql,ready}=db();await ready;
  await sql`delete from gate_kept where expires<now()`;
  const out:{msg:string;url:string;file?:{msg:string;id:string;name:string;type:string;size:number};failed?:boolean;drop?:boolean}[]=[];
  for(const it of items){const key=keyOf(u.id+'|'+it.url);
   let old:Record<string,unknown>|undefined=(await sql`select id,type,name,length(data) as n from gate_kept where user_id=${u.id} and url_key=${key}`)[0];
   // An earlier copy that is only an empty app shell (pres.global before it was drawn from its data) is made again.
   // A ticket drawn from its data (before the page itself could be kept) is made again too.
   // So is a page kept as a picture before only the tickets were kept (the whole page, a slider showing one ticket).
   if(old&&old.type==='image/png'&&(await sql`select 1 from gate_kept where id=${old.id} and created_at<'2026-10-26T20:50:00Z'`).length){await sql`delete from gate_kept where id=${old.id}`;old=undefined;}
   if(old&&old.type==='image/svg+xml'){await sql`delete from gate_kept where id=${old.id}`;old=undefined;}
   if(old&&old.type==='text/html'){const d=(await sql`select data from gate_kept where id=${old.id}`)[0];if(d&&shell(Buffer.from(String(d.data),'base64').toString('utf8'))){await sql`delete from gate_kept where id=${old.id}`;old=undefined;}}
   if(old){out.push({msg:it.msg,url:it.url,file:{msg:it.msg,id:'k_'+old.id,name:String(old.name),type:String(old.type),size:Math.round(Number(old.n)*0.75)}});continue;}
   try{const m=await gmail('messages/'+encodeURIComponent(it.msg)+'?format=full') as Message;
    if(!ticketLinks(m).some(l=>l.url===it.url)){out.push({msg:it.msg,url:it.url,failed:true});continue;}
    const k=await snapshot(it.url,it.label.replace(/[^\w֐-׿ .()-]/g,'').slice(0,40)||'כרטיס');if(!k){out.push({msg:it.msg,url:it.url,failed:true,drop:true});if(why)await sql`insert into gate_meta(k,v) values(${'keepdbg:'+why.slice(0,180)},now()) on conflict(k) do update set v=now()`;continue;}
    if(why)await sql`insert into gate_meta(k,v) values(${'keepdbg:'+why.slice(0,180)},now()) on conflict(k) do update set v=now()`;
    const id=newId();const exp=new Date(Math.max(ilMoment(it.start.slice(0,16))+7*864e5,Date.now()+90*864e5));
    await sql`insert into gate_kept(id,user_id,url_key,msg,type,name,data,expires) values(${id},${u.id},${key},${it.msg},${k.type},${k.name},${k.data},${exp.toISOString()})`;
    out.push({msg:it.msg,url:it.url,file:{msg:it.msg,id:'k_'+id,name:k.name,type:k.type,size:Math.round(k.data.length*0.75)}});
   }catch{out.push({msg:it.msg,url:it.url,failed:true});}}
  await closeBrowser();return Response.json({kept:out},{headers:H});
 }catch(e){const code=e instanceof Error?e.message:'';return Response.json({error:code},{status:code==='UNAUTHORIZED'?401:400,headers:H});}}
