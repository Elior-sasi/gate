// Tickets that come by SMS ("מצורפים הכרטיסים שהזמנת להקרנת הסרט: טארה סטרונג - מאסטרקלאס … https://prestickets.com/…?id=209803927955490").
// The iPhone Shortcut forwards the message; the ticket behind the link is kept (lib/keep) and joined to the event it belongs to.
export type SmsTicket={url:string;ref?:string;title?:string};
export function parseTicketSms(text:string):SmsTicket|null{
 const url=(text.match(/https:\/\/[^\s<>"')]+/i)||[])[0]?.replace(/[.,;!?]+$/,'');if(!url)return null;
 let host='';try{host=new URL(url).hostname;}catch{return null;}
 // Only a real web address (no internal or numeric hosts).
 if(!/\.[a-z]{2,}$/i.test(host)||/^\d+\.\d+\.\d+\.\d+$/.test(host)||/localhost|\.local$|\.internal$/i.test(host))return null;
 if(!/כרטיס|ticket|הזמנ|להקרנ|להופע|להצג|לאירוע|ברקוד|barcode|qr/i.test(text))return null;
 const ref=(url.match(/[?&](?:id|ticket|barcode|order|code)=([\w-]{6,40})/i)||[])[1];
 const title=(text.match(/(?:להקרנת הסרט|להקרנה|לסרט|להופעה|להצגה|לאירוע|למופע|להרצאה)\s*:?\s*([^,\n]{2,80}?)\s*(?:,|\n|$)/)||[])[1]?.trim();
 return {url,ref,title};}
// Which event an SMS ticket belongs to: its number inside an order number (209803927955490 → 20980-39279-55490), else the name.
const digits=(s:string)=>s.replace(/\D/g,'');const norm=(s:string)=>s.toLowerCase().replace(/[^\w֐-׿]+/g,'');
export function matchSms<T extends {key:string;title:string;start:string;order?:string;parts?:Record<string,{order?:string}>}>(list:T[],s:SmsTicket,now=Date.now()):{event:T;order?:string}|null{
 const orders=(t:T)=>[t.order||'',...Object.values(t.parts||{}).map(p=>p.order||'')].flatMap(o=>o.split(', ')).filter(Boolean);
 if(s.ref){const d=digits(s.ref);for(const t of list)for(const o of orders(t)){const od=digits(o);if(od.length>=6&&(d===od||d.startsWith(od)||od.startsWith(d)))return {event:t,order:o};}}
 if(s.title){const n=norm(s.title);const hits=list.filter(t=>{const x=norm(t.title);return x.length>=4&&(x.includes(n)||n.includes(x));})
  .sort((a,b)=>Math.abs(new Date(a.start).getTime()-now)-Math.abs(new Date(b.start).getTime()-now));if(hits[0])return {event:hits[0]};}
 return null;}
