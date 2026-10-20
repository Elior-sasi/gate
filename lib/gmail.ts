// Gmail access: which mail to look at, and how to read text and ticket files out of a message.
// Israeli ticket sellers, cinemas and venues by sender, plus ticket words in the subject, so confirmations are not missed.
const SENDERS=['leaan.co.il','eventim.co.il','tixwise.co.il','zappa-club.co.il','barby.co.il','eventer.co.il','smarticket.co.il','tickchak.co.il','go-out.co','bimot.co.il','hatarbut.co.il','kupat.co.il','habima.co.il','cameri.co.il','gesher-theatre.co.il','beitlessin.org.il','israel-opera.co.il','ipo.co.il','tmu-na.org.il','hasimta.com','cinema-city.co.il','yesplanet.co.il','planetcinema.co.il','lev.co.il','hotcinema.co.il','rav-hen.co.il','globusmax.co.il','ticketmaster.com','ticketmaster.co.uk','eventbrite.com','dice.fm','seetickets.com','livenation.com','axs.com','stubhub.com','viagogo.com','tickets.co.il','mytickets.co.il','tix.co.il','ticketsi.co.il','menoramivtachim-arena.co.il','maccabi.co.il','hapoel.co.il'];
const SUBJECTS=['כרטיס','כרטיסים','כרטיסייה','"הכרטיסים שלך"','"הזמנת כרטיסים"','"אישור הזמנה"','מופע','הופעה','הצגה','קונצרט','פסטיבל','הקרנה','ticket','tickets','"your order"','"booking confirmation"','e-ticket','eticket','ביטול','בוטל','בוטלה','"החזר כספי"','cancelled','refund'];
export const QUERY='-in:spam -in:trash -category:promotions {'+[...SENDERS.map(s=>'from:'+s),...SUBJECTS.map(s=>'subject:'+s),'"מקום ישיבה"','"שורה"','"פתיחת דלתות"','"doors open"','"row"'].join(' ')+'}';
export class GmailError extends Error{}
export type Gmail=(path:string)=>Promise<any>;
export function gmailClient(accessToken:string):Gmail{
 return async function gmail(path:string,attempt=0):Promise<any>{const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{headers:{Authorization:'Bearer '+accessToken},cache:'no-store',signal:AbortSignal.timeout(18000)});
  if(r.ok)return r.json();
  const detail=await r.text().catch(()=>'');
  if(r.status===403&&/accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/i.test(detail))throw new GmailError('GMAIL_API_DISABLED');
  if(r.status===403&&/insufficient|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(detail))throw new GmailError('NO_GMAIL');
  if(r.status===401)throw new GmailError('RECONNECT');
  if((r.status===429||(r.status===403&&/rateLimitExceeded/i.test(detail)))&&attempt<4){await new Promise(res=>setTimeout(res,500*2**attempt+Math.random()*300));return gmail(path,attempt+1);}
  if(r.status===429)throw new GmailError('RATE');
  throw new GmailError('GMAIL');};}
export type Part={partId?:string;filename?:string;mimeType?:string;body?:{attachmentId?:string;size?:number;data?:string};parts?:Part[];headers?:{name:string;value:string}[]};
export type Message={id:string;threadId:string;internalDate?:string;payload?:Part};
export const header=(m:Message,name:string)=>m.payload?.headers?.find(h=>h.name.toLowerCase()===name.toLowerCase())?.value||'';
const decode=(d?:string)=>d?Buffer.from(d,'base64url').toString('utf8'):'';
const ENT:Record<string,string>={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",rlm:'',lrm:'',zwnj:'',zwj:''};
// HTML mail as lines of text: one line per row or paragraph, table cells joined with " | ", layout-only lines dropped.
export function htmlText(h:string){
 return h.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|head)[\s\S]*?<\/\1>/gi,' ').replace(/\s+/g,' ')
  .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|table|tbody)>|<(p|div|tr|li|h\d|table)\b[^>]*>/gi,'\n').replace(/<\/t[dh]>/gi,' | ').replace(/<[^>]+>/g,'')
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&([a-z]+);/gi,(m,n)=>ENT[n.toLowerCase()]??m)
  .replace(/[‎‏]/g,'').split('\n').map(l=>l.replace(/[ \t ]+/g,' ').replace(/(?:\s*\|\s*)+/g,' | ').replace(/^[\s|]+|[\s|]+$/g,'')).filter(Boolean).join('\n');}
// The readable text of a message: the plain part when it has real content, else the HTML part flattened.
export function bodyText(m:Message){let plain='',html='';
 const walk=(p?:Part)=>{if(!p)return;if(!p.filename){if(p.mimeType==='text/plain'&&!plain)plain=decode(p.body?.data);else if(p.mimeType==='text/html'&&!html)html=decode(p.body?.data);}p.parts?.forEach(walk);};walk(m.payload);
 const h=html?htmlText(html):'';return plain.trim().length>200||!h?plain.trim():h;}
// Links in the mail that open the ticket on the seller's site ("לצפייה בכרטיס", "View tickets").
export function ticketLinks(m:Message){let html='';const walk=(p?:Part)=>{if(!p)return;if(p.mimeType==='text/html'&&!html)html=decode(p.body?.data);p.parts?.forEach(walk);};walk(m.payload);
 const out:{label:string;url:string;msg?:string}[]=[];for(const a of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){const label=htmlText(a[2]).replace(/\s+/g,' ').trim();
  if(/^https?:\/\//.test(a[1])&&label.length<40&&/כרטיס|ticket|הזמנה שלי|צפייה בהזמנה|view order|wallet|ארנק|ביטול|ניהול (?:ה)?הזמנה|cancel|manage|booking management/i.test(label)&&!/unsubscribe|הסר/i.test(label)&&!out.some(o=>o.url===a[1]))out.push({label,url:a[1].replace(/&amp;/g,'&'),msg:m.id});}
 return out.slice(0,5);}
export type File={id:string;name:string;type:string;size:number};
// Ticket files: PDFs, Apple Wallet passes and barcode/QR images (logos and tiny pictures are left out).
export function ticketFiles(m:Message):File[]{const out:File[]=[];
 const walk=(p?:Part)=>{if(!p)return;const id=p.body?.attachmentId,size=p.body?.size||0,name=p.filename||'',type=(p.mimeType||'').toLowerCase();
  if(id&&(/pdf/.test(type)||/\.pdf$/i.test(name)||/pkpass/.test(type)||/\.pkpass$/i.test(name)||(/^image\//.test(type)&&size>2500&&(/qr|barcode|ticket|כרטיס/i.test(name)||!name&&size<60000))))out.push({id,name:name||(type.includes('image')?'ברקוד':'כרטיס'),type:type||'application/octet-stream',size});
  p.parts?.forEach(walk);};walk(m.payload);
 return out.slice(0,8);}
