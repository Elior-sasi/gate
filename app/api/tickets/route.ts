import {NextRequest} from 'next/server';
import {z} from 'zod';
import {identity} from '@/lib/identity';
import {QUERY,GmailError,gmailClient,type Message} from '@/lib/gmail';
import {readTicket,mergeTickets,type Ticket} from '@/lib/tickets';
import {fail} from '@/lib/errors';
export const dynamic='force-dynamic';
export const maxDuration=60;
const H={'Cache-Control':'private, no-store'};
// Step 1 (fast): message IDs of possible ticket mail from the last two years. The browser skips mail it already read.
export async function GET(req:NextRequest){try{
 const {accessToken}=await identity(req);const gmail=gmailClient(accessToken);
 const ids:string[]=[];let token='';
 for(let page=0;page<6;page++){const p=new URLSearchParams({maxResults:'500',q:'newer_than:730d '+QUERY,fields:'messages/id,nextPageToken'});if(token)p.set('pageToken',token);
  const list=await gmail('messages?'+p);for(const m of list.messages||[])ids.push(m.id);token=list.nextPageToken||'';if(!token)break;}
 return Response.json({ids,updated:new Date().toISOString()},{headers:H});
}catch(e){return fail(e);}}
const body=z.object({ids:z.array(z.string().regex(/^[a-zA-Z0-9]{6,40}$/)).min(1).max(12)});
// Step 2: read a few messages in full and turn ticket mail into events. "retry" lists mail to read again later (Gemini was busy).
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'בקשה לא מורשית'},{status:403});
 try{const {accessToken}=await identity(req);const gmail=gmailClient(accessToken);const {ids}=body.parse(await req.json());
  const got=await Promise.allSettled(ids.map(id=>gmail('messages/'+encodeURIComponent(id)+'?format=full') as Promise<Message>));
  const tickets:Ticket[]=[];const read:string[]=[];const retry:string[]=[];
  // One message at a time: the Gemini free tier allows only a few calls a minute.
  for(const [i,g] of got.entries())await (async()=>{if(g.status==='rejected'){if(g.reason instanceof GmailError&&!['GMAIL','RATE'].includes(g.reason.message))throw g.reason;retry.push(ids[i]);return;}
   const r=await readTicket(g.value).catch(()=>({ticket:null,retry:true}));if(r.ticket)tickets.push(r.ticket);(r.retry?retry:read).push(ids[i]);})();
  return Response.json({tickets:mergeTickets(tickets),read,retry},{headers:H});
 }catch(e){return fail(e);}}
