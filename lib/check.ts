// One user's background round (from the schedule): new ticket mail in the last days, then reminders.
import {QUERY,gmailClient,type Message} from '@/lib/gmail';
import {readTicket,mergeTickets,type Ticket} from '@/lib/tickets';
import {reminders,mark,newTicket,type Sent,type Note} from '@/lib/notify';
import {unseal,send,type Sub} from '@/lib/push';
import {freshAccess} from '@/lib/identity';
export type Row={user_id:string;refresh:string;subs:Sub[];tickets:Ticket[];hidden:string[];seen:string[];sent:Sent;checked_at:string|null};
type Sql=(s:TemplateStringsArray,...v:unknown[])=>Promise<Record<string,unknown>[]>;
export async function check(u:Row,sql:Sql){let tickets=u.tickets||[];let sent=u.sent||{};const seen=new Set(u.seen||[]);const notes:Note[]=[];let gmailOk=true;
 if(u.refresh){try{const access=await freshAccess({refreshToken:unseal(u.refresh),expiresAt:0,accessToken:''});const gmail=gmailClient(access);
  const list=await gmail('messages?'+new URLSearchParams({maxResults:'30',q:'newer_than:3d '+QUERY,fields:'messages/id'}));
  const fresh=((list.messages||[]) as {id:string}[]).map(m=>m.id).filter(id=>!seen.has(id)).slice(0,8);
  for(const id of fresh){const m=await gmail('messages/'+encodeURIComponent(id)+'?format=full') as Message;const r=await readTicket(m).catch(()=>({ticket:null,retry:true}));
   if(r.retry)continue;seen.add(id);if(!r.ticket)continue;
   const known=tickets.some(t=>t.key===r.ticket!.key||t.msgs.some(x=>r.ticket!.msgs.includes(x)));tickets=mergeTickets([...tickets,r.ticket]);
   if(!known&&!r.ticket.cancelled&&!u.hidden?.includes(r.ticket.key))notes.push(newTicket(r.ticket));}
 }catch{gmailOk=false;}}
 notes.push(...reminders(tickets,sent,u.hidden||[]));
 let ok=0;const dead=new Set<string>();
 for(const n of notes){for(const s of u.subs||[]){const live=await send(s,{title:n.title,body:n.body,tag:n.tag,url:n.url}).catch(()=>true);if(live)ok++;else dead.add(s.endpoint);}sent=mark(sent,n);}
 const subs=(u.subs||[]).filter(s=>!dead.has(s.endpoint));
 await sql`update gate_users set tickets=${JSON.stringify(tickets)},seen=${JSON.stringify([...seen].slice(-600))},sent=${JSON.stringify(sent)},subs=${JSON.stringify(subs)},checked_at=now() where user_id=${u.user_id}`;
 return {sent:ok,notes:notes.length,gmail:gmailOk};}
