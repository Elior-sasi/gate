import {NextRequest} from 'next/server';
import {identity} from '@/lib/identity';
import {gmailClient} from '@/lib/gmail';
import {attachment,SAFE} from '@/lib/attach';
import {readKept,KEPT_CSP} from '@/lib/keep';
import {db} from '@/lib/push';
import {fail} from '@/lib/errors';
export const dynamic='force-dynamic';
// Opens a ticket file (PDF, Wallet pass, barcode image) straight from the user's own mail, so it is never stored anywhere else.
export async function GET(req:NextRequest){try{
 const q=req.nextUrl.searchParams;const m=q.get('m')||'',a=q.get('a')||'';let type=(q.get('t')||'').toLowerCase();const name=(q.get('n')||'ticket').replace(/[^\w\u0590-\u05FF .()-]/g,'').slice(0,80)||'ticket';
 if(!/^[a-zA-Z0-9]{6,40}$/.test(m)||!/^[\w-]{10,2000}$/.test(a))return new Response('bad request',{status:400});
 // A kept copy of a ticket that was behind a link (lib/keep).
 if(a.startsWith('k_')){const {id}=await identity(req);const {sql,ready}=db();await ready;const k=await readKept(sql as never,id,a);if(!k)return new Response('not found',{status:404});
  return new Response(k.bytes,{headers:{'Content-Type':k.type==='text/html'?'text/html; charset=utf-8':k.type,'Content-Disposition':"inline; filename*=UTF-8''"+encodeURIComponent(k.name),'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':KEPT_CSP}});}
 if(/\.pkpass$/i.test(name))type='application/vnd.apple.pkpass';else if(/\.pdf$/i.test(name))type='application/pdf';
 if(!SAFE.test(type))type='application/octet-stream';
 const {accessToken}=await identity(req);const gmail=gmailClient(accessToken);
 const data=await attachment(gmail,m,a,q.get('n')||'',type);
 if(!data)return new Response('not found',{status:404});
 const bytes=Buffer.from(data,'base64url');
 return new Response(bytes,{headers:{'Content-Type':type,'Content-Disposition':(type==='application/octet-stream'?'attachment':'inline')+'; filename*=UTF-8\'\''+encodeURIComponent(name),'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox"}});
}catch(e){return fail(e);}}
