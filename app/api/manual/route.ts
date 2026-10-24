import {NextRequest} from 'next/server';
import {z} from 'zod';
import {pushIdentity} from '@/lib/identity';
import {db,dbOn} from '@/lib/push';
import {newId} from '@/lib/share';
import {ilMoment} from '@/lib/notify';
export const dynamic='force-dynamic';export const maxDuration=30;
const H={'Cache-Control':'private, no-store'};
// Tickets added by hand (a picture or PDF from WhatsApp, PayBox and the like): the file is kept with the other kept tickets,
// the details are kept here, and the app adds them to its list on every phone and after every rescan.
const KINDS=['concert','show','movie','lecture','sport','festival','standup','party','other'] as const;
const body=z.object({file:z.object({data:z.string().max(5_000_000),type:z.string().regex(/^(image\/(png|jpe?g|webp|gif|heic)|application\/pdf)$/),name:z.string().max(80)}),
 details:z.object({title:z.string().trim().min(1).max(120),start:z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/),venue:z.string().max(120).optional(),kind:z.enum(KINDS),
  count:z.number().int().min(1).max(40),seats:z.array(z.string().max(60)).max(40),attach:z.string().max(200).optional()})});
async function me(req:NextRequest){try{return (await pushIdentity(req)).id;}catch{return '';}}
export async function GET(req:NextRequest){const id=await me(req);if(!id)return Response.json({error:'auth'},{status:401,headers:H});
 if(!dbOn())return Response.json({items:[]},{headers:H});const {sql,ready}=db();await ready;
 const rows=await sql`select id,item,created_at from gate_manual where user_id=${id} order by created_at`;
 return Response.json({items:rows.map(r=>({...(r.item as object),id:r.id,at:r.created_at}))},{headers:H});}
export async function POST(req:NextRequest){if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'forbidden'},{status:403,headers:H});
 const id=await me(req);if(!id)return Response.json({error:'auth'},{status:401,headers:H});if(!dbOn())return Response.json({error:'no-db'},{status:503,headers:H});
 const b=body.safeParse(await req.json().catch(()=>null));if(!b.success)return Response.json({error:'bad'},{status:400,headers:H});
 const {file,details}=b.data;const bytes=Buffer.from(file.data,'base64');if(!bytes.length||bytes.length>3_600_000)return Response.json({error:'big'},{status:413,headers:H});
 const {sql,ready}=db();await ready;const n=(await sql`select count(*)::int as n from gate_manual where user_id=${id} and created_at>now()-interval '1 day'`)[0];if(Number(n.n)>60)return Response.json({error:'too many'},{status:429,headers:H});
 const k=newId(),m=newId();const exp=new Date(Math.max(ilMoment(details.start.length>10?details.start:details.start+'T23:59')+30*864e5,Date.now()+90*864e5));
 await sql`insert into gate_kept(id,user_id,url_key,msg,type,name,data,expires) values(${k},${id},${'manual:'+m},${'man'+m},${file.type},${file.name},${file.data},${exp.toISOString()})`;
 const item={...details,file:{id:'k_'+k,name:file.name,type:file.type,size:bytes.length}};
 await sql`insert into gate_manual(id,user_id,item) values(${m},${id},${JSON.stringify(item)})`;
 return Response.json({item:{...item,id:m,at:new Date().toISOString()}},{headers:H});}
// A change to a ticket added by hand: its details, and a new picture when one is sent (a new kept file, so no phone shows the old one from its cache).
const patch=z.object({id:z.string().regex(/^[\w-]{6,40}$/),file:body.shape.file.optional(),details:body.shape.details});
export async function PATCH(req:NextRequest){if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'forbidden'},{status:403,headers:H});
 const id=await me(req);if(!id)return Response.json({error:'auth'},{status:401,headers:H});if(!dbOn())return Response.json({error:'no-db'},{status:503,headers:H});
 const b=patch.safeParse(await req.json().catch(()=>null));if(!b.success)return Response.json({error:'bad'},{status:400,headers:H});
 const {sql,ready}=db();await ready;const row=(await sql`select item from gate_manual where id=${b.data.id} and user_id=${id}`)[0];if(!row)return Response.json({error:'gone'},{status:404,headers:H});
 const old=row.item as {file:{id:string;name:string;type:string;size:number}};let file=old.file;const d=b.data.details;
 const exp=new Date(Math.max(ilMoment(d.start.length>10?d.start:d.start+'T23:59')+30*864e5,Date.now()+90*864e5));
 if(b.data.file){const bytes=Buffer.from(b.data.file.data,'base64');if(!bytes.length||bytes.length>3_600_000)return Response.json({error:'big'},{status:413,headers:H});
  const k=newId();await sql`insert into gate_kept(id,user_id,url_key,msg,type,name,data,expires) values(${k},${id},${'manual:'+b.data.id},${'man'+b.data.id},${b.data.file.type},${b.data.file.name},${b.data.file.data},${exp.toISOString()})`;
  await sql`delete from gate_kept where id=${old.file.id.slice(2)} and user_id=${id}`;file={id:'k_'+k,name:b.data.file.name,type:b.data.file.type,size:bytes.length};}
 else await sql`update gate_kept set expires=${exp.toISOString()} where id=${old.file.id.slice(2)} and user_id=${id}`;
 const item={...d,file};await sql`update gate_manual set item=${JSON.stringify(item)} where id=${b.data.id} and user_id=${id}`;
 const at=(await sql`select created_at from gate_manual where id=${b.data.id}`)[0]?.created_at;
 return Response.json({item:{...item,id:b.data.id,at}},{headers:H});}
export async function DELETE(req:NextRequest){if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'forbidden'},{status:403,headers:H});
 const id=await me(req);if(!id)return Response.json({error:'auth'},{status:401,headers:H});const m=req.nextUrl.searchParams.get('id')||'';if(!/^[\w-]{6,40}$/.test(m))return Response.json({error:'bad'},{status:400,headers:H});
 const {sql,ready}=db();await ready;const r=(await sql`delete from gate_manual where id=${m} and user_id=${id} returning item`)[0];
 const f=(r?.item as {file?:{id?:string}}|undefined)?.file?.id;if(f)await sql`delete from gate_kept where id=${f.slice(2)} and user_id=${id}`;
 return Response.json({ok:!!r},{headers:H});}
