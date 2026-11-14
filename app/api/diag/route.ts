import {db,unseal} from '@/lib/push';
import {freshAccess} from '@/lib/identity';
import {gmailClient,type Message} from '@/lib/gmail';
import {readTicket} from '@/lib/tickets';
export const dynamic='force-dynamic';export const maxDuration=60;
// Temporary: how two ticket mails are read (event fields only, no addresses or links).
export async function GET(){const {sql,ready}=db();await ready;const u=(await sql`select refresh from gate_users where user_id='104186574244796540011'`)[0];
 const access=await freshAccess({refreshToken:unseal(String(u.refresh)),expiresAt:0,accessToken:''});const gmail=gmailClient(access);const out:unknown[]=[];
 for(const id of ['1a1cf5febf2c1f2f','1a1cfc8f8ff8dab5']){try{const m=await gmail('messages/'+id+'?format=full') as Message;const r=await readTicket(m,true);
  const t=r.ticket;out.push(t?{title:t.title,start:t.start,kind:t.kind,cancelled:t.cancelled,venue:t.venue,seats:t.seats.length,links:t.links.map(l=>l.label),files:t.files.length,order:!!t.order}:{none:true,retry:r.retry});}catch(e){out.push(String(e).slice(0,150));}}
 return Response.json(out,{headers:{'Cache-Control':'no-store'}});}
