import {NextRequest} from 'next/server';
import {identity} from '@/lib/identity';
import {gmailClient} from '@/lib/gmail';
import {fail} from '@/lib/errors';
export const dynamic='force-dynamic';
// Opens a ticket file (PDF, Wallet pass, barcode image) straight from the user's own mail, so it is never stored anywhere else.
const SAFE=/^(application\/pdf|application\/vnd\.apple\.pkpass|image\/(png|jpe?g|gif|webp))$/;
export async function GET(req:NextRequest){try{
 const q=req.nextUrl.searchParams;const m=q.get('m')||'',a=q.get('a')||'';let type=(q.get('t')||'').toLowerCase();const name=(q.get('n')||'ticket').replace(/[^\w\u0590-\u05FF .()-]/g,'').slice(0,80)||'ticket';
 if(!/^[a-zA-Z0-9]{6,40}$/.test(m)||!/^[\w-]{10,2000}$/.test(a))return new Response('bad request',{status:400});
 if(/\.pkpass$/i.test(name))type='application/vnd.apple.pkpass';else if(/\.pdf$/i.test(name))type='application/pdf';
 if(!SAFE.test(type))type='application/octet-stream';
 const {accessToken}=await identity(req);const gmail=gmailClient(accessToken);
 // Gmail can hand out a new attachment id each time a message is read, so a saved id may stop working: then the file is found again by name.
 let data='';try{data=String((await gmail('messages/'+encodeURIComponent(m)+'/attachments/'+encodeURIComponent(a))).data||'');}catch{}
 if(!data){const msg=await gmail('messages/'+encodeURIComponent(m)+'?format=full');const parts:{filename?:string;mimeType?:string;body?:{attachmentId?:string;data?:string}}[]=[];
  const walk=(p?:{parts?:unknown[]})=>{if(!p)return;parts.push(p as never);(p.parts as {parts?:unknown[]}[]|undefined)?.forEach(walk);};walk(msg.payload);
  const want=q.get('n')||'';const hit=parts.find(p=>p.filename&&p.filename===want)||parts.find(p=>p.body?.attachmentId&&(p.mimeType||'').toLowerCase()===type)||parts.find(p=>p.body?.attachmentId&&/pdf/i.test((p.mimeType||'')+(p.filename||'')));
  if(hit?.body?.data)data=hit.body.data;else if(hit?.body?.attachmentId)data=String((await gmail('messages/'+encodeURIComponent(m)+'/attachments/'+encodeURIComponent(hit.body.attachmentId))).data||'');}
 if(!data)return new Response('not found',{status:404});
 const bytes=Buffer.from(data,'base64url');
 return new Response(bytes,{headers:{'Content-Type':type,'Content-Disposition':(type==='application/octet-stream'?'attachment':'inline')+'; filename*=UTF-8\'\''+encodeURIComponent(name),'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox"}});
}catch(e){return fail(e);}}
