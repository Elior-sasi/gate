import {db,unseal} from '@/lib/push';
import {freshAccess} from '@/lib/identity';
import {gmailClient,QUERY,SELLER_QUERY,type Message} from '@/lib/gmail';
import {readTicket,mergeTickets} from '@/lib/tickets';
export const dynamic='force-dynamic';export const maxDuration=60;
// Temporary: is the Lev Cinema mail listed, and what does the scan's reading give (event fields only).
export async function GET(){const {sql,ready}=db();await ready;const u=(await sql`select refresh from gate_users where user_id='104186574244796540011'`)[0];
 const gmail=gmailClient(await freshAccess({refreshToken:unseal(String(u.refresh)),expiresAt:0,accessToken:''}));const ID='1a1cf5febf2c1f2f';
 const ids:string[]=[];let token='';for(let page=0;page<6;page++){const p=new URLSearchParams({maxResults:'500',q:'newer_than:730d '+QUERY,fields:'messages/id,nextPageToken'});if(token)p.set('pageToken',token);const l=await gmail('messages?'+p);for(const m of l.messages||[])ids.push(m.id);token=l.nextPageToken||'';if(!token)break;}
 const s=await gmail('messages?'+new URLSearchParams({maxResults:'200',q:'newer_than:45d '+SELLER_QUERY,fields:'messages/id'}));
 const m=await gmail('messages/'+ID+'?format=full') as Message;const r=await readTicket(m,false);const t=r.ticket;
 return Response.json({total:ids.length,listed:ids.includes(ID),pos:ids.indexOf(ID),sellers:(s.messages||[]).length,inSellers:(s.messages||[]).some((x:{id:string})=>x.id===ID),retry:r.retry,t:t&&{title:t.title,start:t.start,key:t.key,cx:t.cancelled},merged:t&&mergeTickets([t]).length,qlen:QUERY.length},{headers:{'Cache-Control':'no-store'}});}
