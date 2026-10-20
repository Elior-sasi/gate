import {NextRequest} from 'next/server';
import {z} from 'zod';
import {pushIdentity} from '@/lib/identity';
import {db,dbOn,seal} from '@/lib/push';
import {newId,expiry} from '@/lib/share';
export const dynamic='force-dynamic';
const H={'Cache-Control':'private, no-store'};
const str=(n:number)=>z.string().max(n);
const body=z.object({title:str(140),kind:str(20),start:z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/),venue:str(140).optional(),city:str(80).optional(),address:str(140).optional(),doors:str(10).optional(),
 seats:z.array(str(80)).max(20),count:z.number().int().min(1).max(30),files:z.array(z.object({msg:z.string().regex(/^[a-zA-Z0-9]{6,40}$/),id:z.string().regex(/^[\w-]{10,2000}$/),name:str(120),type:str(80)})).max(12),
 links:z.array(z.object({label:str(60),url:z.string().url().max(2000)})).max(4),from:str(60).optional()});
// Makes the link. The owner's Gmail access (sealed) is what lets the page open the ticket files later.
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'בקשה לא מורשית'},{status:403});
 if(!dbOn())return Response.json({error:'השרת עוד לא חובר למסד נתונים'},{status:503,headers:H});
 try{const u=await pushIdentity(req);const b=body.parse(await req.json());const {sql,ready}=db();await ready;
  if(!b.files.length&&!b.links.length)return Response.json({error:'אין כאן כרטיס לשלוח'},{status:400,headers:H});
  const row=(await sql`select refresh from gate_users where user_id=${u.id}`)[0];
  if(u.refreshToken)await sql`insert into gate_users(user_id,email,refresh) values(${u.id},${u.email},${seal(u.refreshToken)}) on conflict(user_id) do update set refresh=excluded.refresh,updated_at=now()`;
  else if(!row?.refresh)return Response.json({error:'צריך להתחבר מחדש עם Google כדי לשלוח כרטיסים.'},{status:400,headers:H});
  const exp=expiry(b.start);if(exp.getTime()<Date.now())return Response.json({error:'האירוע כבר עבר'},{status:400,headers:H});
  const id=newId();await sql`insert into gate_shares(id,user_id,data,expires) values(${id},${u.id},${JSON.stringify(b)},${exp.toISOString()})`;
  return Response.json({url:req.nextUrl.origin+'/s/'+id,id},{headers:H});
 }catch(e){const code=e instanceof Error?e.message:'';return Response.json({error:code==='UNAUTHORIZED'?'צריך להיכנס מחדש עם Google.':'לא הצלחתי ליצור קישור. נסה שוב.'},{status:400,headers:H});}}
// Stops a link the owner sent.
export async function DELETE(req:NextRequest){if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'בקשה לא מורשית'},{status:403});
 try{const u=await pushIdentity(req);const id=String((await req.json()).id||'');const {sql,ready}=db();await ready;await sql`delete from gate_shares where id=${id} and user_id=${u.id}`;return Response.json({ok:true},{headers:H});}
 catch{return Response.json({error:'לא הצלחתי לבטל'},{status:400,headers:H});}}
