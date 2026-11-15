import {NextRequest} from 'next/server';
import {z} from 'zod';
import {pushIdentity} from '@/lib/identity';
import {filmPoster,pagePicture} from '@/lib/poster';
export const dynamic='force-dynamic';export const maxDuration=30;
const H={'Cache-Control':'private, no-store'};
// Pictures for events whose mail had none: a film's poster, or the main picture of the event's page.
const body=z.object({items:z.array(z.object({key:z.string().max(200),title:z.string().max(200),kind:z.string().max(20),start:z.string().max(20),url:z.string().url().max(2000).optional()})).min(1).max(8)});
export async function POST(req:NextRequest){if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'forbidden'},{status:403,headers:H});
 try{await pushIdentity(req);}catch{return Response.json({error:'auth'},{status:401,headers:H});}
 const b=body.safeParse(await req.json().catch(()=>null));if(!b.success)return Response.json({error:'bad'},{status:400,headers:H});
 const out:Record<string,string|null>=await Promise.all(b.data.items.map(async it=>{const year=Number(it.start.slice(0,4))||undefined;let u:string|null=null;
  if(it.kind==='movie')u=await filmPoster(it.title,year);
  if(!u&&it.url&&/^https:/.test(it.url))u=await pagePicture(it.url);
  return [it.key,u] as const;})).then(Object.fromEntries);
 return Response.json({pics:out},{headers:H});}
