// Tickets from pres.global (cinematheques and cinemas: prestickets.com/<site>/<id>/?id=… → <site>.pres.global/edocument/…).
// The ticket page is built in the browser by scripts, so instead of copying the page its data is read
// (/api/edocument/<id>?id=…) and the ticket is drawn again: one QR per ticket (its barcode) and one for the whole order.
import QRCode from 'qrcode';
export type PresInfo={title?:string;start?:string;hall?:string;venue?:string;address?:string;order?:string;seats:string[];count:number;price?:string;cancelled?:boolean};
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const SITE=/^[a-z0-9-]{2,30}$/i,DOC=/^[0-9a-f-]{20,40}$/i;
// The data address for a ticket link, or null when the link is not a pres.global ticket.
export function presApi(url:string):string|null{let u:URL;try{u=new URL(url);}catch{return null;}
 const id=u.searchParams.get('id')||'';if(!/^\d{6,30}$/.test(id))return null;const p=u.pathname.split('/').filter(Boolean);
 if(/(^|\.)prestickets\.com$/i.test(u.hostname)&&SITE.test(p[0]||'')&&DOC.test(p[1]||''))return `https://${p[0]}.pres.global/api/edocument/${p[1]}?id=${id}`;
 const h=u.hostname.match(/^([a-z0-9-]{2,30})\.pres\.global$/i);if(h&&p[0]==='edocument'&&DOC.test(p[1]||''))return `https://${h[1]}.pres.global/api/edocument/${p[1]}?id=${id}`;
 return null;}
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type T={reservationIdentifier?:string;reservationIdentifierFormatted?:string;featureName?:string;ticketName?:string;displayName?:string;amount?:number;hideTicketPrice?:number;
 venueName?:string;sectionName?:string;locationHeader1?:string;locationSubheader1?:string;row?:string;seat?:string;presentationDateTime?:string;barcode?:string;isReserved?:boolean};
const svg=(s:string)=>QRCode.toString(s,{type:'svg',margin:1,errorCorrectionLevel:'M',color:{dark:'#000000',light:'#ffffff'}});
export function presInfo(doc:{tickets?:T[];reservationIsCancelled?:boolean}):PresInfo|null{const ts=(doc.tickets||[]).filter(t=>t&&(t.barcode||t.reservationIdentifier));if(!ts.length)return null;const a=ts[0];
 const seats=ts.filter(t=>t.isReserved!==false&&t.row&&t.seat).map(t=>'שורה '+t.row+', כיסא '+t.seat);
 const sum=ts.reduce((s,t)=>s+(Number(t.amount)||0),0);
 const start=(a.presentationDateTime||'').match(/^(\d{4}-\d\d-\d\d)[ T](\d\d:\d\d)/);
 return {title:a.featureName||undefined,start:start?start[1]+'T'+start[2]:undefined,hall:a.venueName||undefined,venue:a.locationHeader1||undefined,address:a.locationSubheader1||undefined,
  order:a.reservationIdentifierFormatted||a.reservationIdentifier||undefined,seats,count:ts.length,price:sum&&!a.hideTicketPrice?'₪ '+sum:undefined,...(doc.reservationIsCancelled?{cancelled:true}:{})};}
export async function presTicket(url:string):Promise<{html:string;info:PresInfo}|null>{const api=presApi(url);if(!api)return null;
 const r=await fetch(api+'&_='+Date.now(),{headers:{'User-Agent':UA,Accept:'application/json','Accept-Language':'he-IL,he;q=0.9'},signal:AbortSignal.timeout(12000)});
 if(!r.ok)return null;const j=await r.json().catch(()=>null) as {document?:{tickets?:T[];reservationIsCancelled?:boolean}}|null;const doc=j?.document;if(!doc)return null;
 const info=presInfo(doc);if(!info)return null;const ts=(doc.tickets||[]).filter(t=>t&&(t.barcode||t.reservationIdentifier));
 const when=info.start?new Date(info.start+':00Z').toLocaleString('he-IL',{weekday:'long',day:'numeric',month:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}):'';
 const whole=ts[0].reservationIdentifier?await svg('R.'+ts[0].reservationIdentifier):'';
 const cards=await Promise.all(ts.map(async(t,i)=>`<section class="t"><div class="n">כרטיס ${i+1} מתוך ${ts.length}</div>`+
  (t.row&&t.seat?`<div class="s">שורה <b>${esc(t.row)}</b> · כיסא <b>${esc(t.seat)}</b></div>`:'')+
  `<div class="k">${esc(t.displayName||t.ticketName||'')}${t.amount&&!t.hideTicketPrice?' · ₪'+esc(t.amount):''}</div>`+
  (t.barcode?`<div class="q">${await svg(t.barcode)}</div><div class="b">${esc(t.barcode)}</div>`:'')+`</section>`));
 const html=`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(info.title)}</title><style>
body{margin:0;background:#f4f4f4;color:#111;font:16px/1.4 -apple-system,system-ui,sans-serif}main{max-width:460px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:4px 0 6px}.m{color:#444;margin:2px 0}.o{margin:10px 0 14px;font-size:14px;color:#555}
.t,.w{background:#fff;border-radius:14px;padding:16px;margin:0 0 14px;text-align:center;box-shadow:0 1px 3px #0002}.n{font-size:13px;color:#666}.s{font-size:20px;margin:6px 0}.k{color:#555;font-size:14px}
.q svg{width:230px;height:230px;margin:10px auto 2px;display:block}.b{font:12px ui-monospace,monospace;color:#777;direction:ltr}.w .q svg{width:170px;height:170px}.x{color:#b00;font-weight:700}
</style></head><body><main><h1>${esc(info.title)}</h1>${when?`<div class="m">${esc(when)}</div>`:''}<div class="m">${esc([info.venue,info.hall].filter(Boolean).join(' · '))}</div>${info.address?`<div class="m">${esc(info.address)}</div>`:''}
${info.cancelled?'<p class="x">ההזמנה בוטלה</p>':''}<div class="o">הזמנה ${esc(info.order)}</div>${cards.join('')}${whole&&ts.length>1?`<section class="w"><div class="n">כל ההזמנה</div><div class="q">${whole}</div></section>`:''}</main></body></html>`;
 return {html,info};}
