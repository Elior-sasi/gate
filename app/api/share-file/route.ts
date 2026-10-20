import {NextRequest} from 'next/server';
import {getShare} from '@/lib/share';
import {unseal} from '@/lib/push';
import {freshAccess} from '@/lib/identity';
import {gmailClient} from '@/lib/gmail';
import {attachment,SAFE} from '@/lib/attach';
import {readKept,KEPT_CSP} from '@/lib/keep';
import {db} from '@/lib/push';
export const dynamic='force-dynamic';
// One ticket file of a shared event, read from the owner's mail at the moment it is opened (nothing is copied or stored).
export async function GET(req:NextRequest){try{
 const q=req.nextUrl.searchParams;const s=await getShare(q.get('s')||'');const i=Number(q.get('i'));
 if(!s||s.expires.getTime()<Date.now()||!s.refresh)return new Response('הקישור כבר לא בתוקף',{status:410,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 const f=s.data.files[i];if(!f)return new Response('not found',{status:404});
 if(f.id.startsWith('k_')){const {sql,ready}=db();await ready;const k=await readKept(sql as never,s.user,f.id);if(!k)return new Response('not found',{status:404});
  return new Response(k.bytes,{headers:{'Content-Type':k.type==='text/html'?'text/html; charset=utf-8':k.type,'Content-Disposition':"inline; filename*=UTF-8''"+encodeURIComponent(k.name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Content-Security-Policy':KEPT_CSP}});}
 let type=f.type.toLowerCase();if(/\.pkpass$/i.test(f.name))type='application/vnd.apple.pkpass';else if(/\.pdf$/i.test(f.name))type='application/pdf';if(!SAFE.test(type))type='application/octet-stream';
 const access=await freshAccess({refreshToken:unseal(s.refresh),expiresAt:0,accessToken:''});
 const data=await attachment(gmailClient(access),f.msg,f.id,f.name,type);if(!data)return new Response('not found',{status:404});
 const name=(f.name||'ticket').replace(/[^\w֐-׿ .()-]/g,'').slice(0,80)||'ticket';
 return new Response(Buffer.from(data,'base64url'),{headers:{'Content-Type':type,'Content-Disposition':(type==='application/octet-stream'?'attachment':'inline')+"; filename*=UTF-8''"+encodeURIComponent(name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox"}});
}catch{return new Response('לא הצלחתי לפתוח את הכרטיס',{status:502,headers:{'Content-Type':'text/plain; charset=utf-8'}});}}
