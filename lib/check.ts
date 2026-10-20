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
   if(!known&&!r.ticket.cancelled&&!u.hidden?.includes(r.ticket.key))notes.push(newTicket(r.ticket));
   // A cancellation mail for an event already on the list: say so (the whole event, or one of its orders).
   if(r.ticket.cancelled){const ev=tickets.find(t=>t.msgs.includes(id));if(ev&&ev.start&&!u.hidden?.includes(ev.key))notes.push({key:ev.key,tag:'cx:'+ev.key+':'+id,title:(ev.cancelled?'בוטל: ':'הזמנה בוטלה: ')+ev.title,body:ev.cancelled?'האירוע הוסר מהקרובים ומהיומן':'שאר הכרטיסים לאירוע בתוקף',url:'/?t='+encodeURIComponent(ev.key)});}}
 }catch{gmailOk=false;}}
 notes.push(...reminders(tickets,sent,u.hidden||[]));
 let ok=0;const dead=new Set<string>();
 for(const n of notes){for(const s of u.subs||[]){const live=await send(s,{title:n.title,body:n.body,tag:n.tag,url:n.url}).catch(()=>true);if(live)ok++;else dead.add(s.endpoint);}sent=mark(sent,n);}
 const subs=(u.subs||[]).filter(s=>!dead.has(s.endpoint));
 await sql`update gate_users set tickets=${JSON.stringify(tickets)},seen=${JSON.stringify([...seen].slice(-600))},sent=${JSON.stringify(sent)},subs=${JSON.stringify(subs)},checked_at=now() where user_id=${u.user_id}`;
 return {sent:ok,notes:notes.length,gmail:gmailOk};}
// Gmail instant push: Gmail tells our Pub/Sub topic about new mail the moment it arrives (lib: /api/gmail-push).
// A watch lasts 7 days, so it is renewed every 6.
export const GMAIL_TOPIC=process.env.GMAIL_TOPIC||'projects/gate-512116/topics/gmail';
export async function watch(u:Row,sql:Sql){const k='watch:'+u.user_id;const last=(await sql`select v from gate_meta where k=${k}`)[0]?.v;if(last&&Date.now()-new Date(last as string).getTime()<6*864e5)return false;
 if(!u.refresh)return false;const access=await freshAccess({refreshToken:unseal(u.refresh),expiresAt:0,accessToken:''});
 const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({topicName:GMAIL_TOPIC,labelIds:['INBOX'],labelFilterBehavior:'include'}),signal:AbortSignal.timeout(15000)});
 if(r.ok)await sql`insert into gate_meta(k,v) values(${k},now()) on conflict(k) do update set v=now()`;return r.ok;}
