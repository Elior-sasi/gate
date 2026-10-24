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
// One card per ticket, like the cinema's own printed ticket (QR on the left, the details on the right, row and seat in boxes),
// drawn as one picture so the viewer shows it like the other tickets, with nothing to scroll inside.
async function qr(s:string,x:number,y:number,size:number){const v=await QRCode.toString(s,{type:'svg',margin:0,errorCorrectionLevel:'M',color:{dark:'#000000',light:'#ffffff'}});
 const vb=v.match(/viewBox="([^"]+)"/)?.[1]||'0 0 1 1';const inner=v.replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
 return `<rect x="${x-8}" y="${y-8}" width="${size+16}" height="${size+16}" fill="#fff"/><svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${vb}" shape-rendering="crispEdges">${inner}</svg>`;}
export async function presSvg(info:PresInfo,ts:T[]):Promise<string>{const W=640,H=330,G=24;
 const d=info.start?new Date(info.start+':00Z'):null;const DAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
 const when=d?'יום '+DAYS[d.getUTCDay()]+' '+d.getUTCDate()+'/'+(d.getUTCMonth()+1)+'/'+d.getUTCFullYear()+'  '+info.start!.slice(11,16):'';
 const T=(x:number,y:number,size:number,txt:string,weight=400,fill='#111',anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" direction="rtl" text-anchor="${anchor}">${esc(txt)}</text>`;
 const cards=await Promise.all(ts.map(async(t,i)=>{const y0=i*(H+G);const R=W-28;let g=`<g transform="translate(0 ${y0})"><rect x="0" y="0" width="${W}" height="${H}" rx="26" fill="#fff"/>`;
  g+=T(R,52,26,info.title||'',700);
  g+=T(R,88,19,[t.displayName||t.ticketName,t.amount&&!t.hideTicketPrice?'₪'+t.amount:''].filter(Boolean).join(' · '),400,'#333');
  g+=T(R,128,23,when,700);g+=T(R,164,22,[info.hall,info.venue&&info.venue!==info.hall?info.venue:''].filter(Boolean).join(' · '),700);
  if(t.row&&t.seat){const bx=R-250;g+=`<rect x="${bx}" y="186" width="250" height="78" fill="none" stroke="#111" stroke-width="2"/><line x1="${bx+125}" y1="186" x2="${bx+125}" y2="264" stroke="#111" stroke-width="2"/>`;
   g+=T(R-14,210,15,'שורה',400,'#444')+T(R-62,252,30,t.row,700,'#111','middle')+T(R-139,210,15,'מושב',400,'#444')+T(R-187,252,30,t.seat,700,'#111','middle');}
  g+=T(R,302,15,'הזמנה '+(info.order||'')+'  ·  כרטיס '+(i+1)+' מתוך '+ts.length,400,'#555');
  if(t.barcode){g+=await qr(t.barcode,34,58,190);g+=`<text x="129" y="282" font-size="12" fill="#666" text-anchor="middle" font-family="ui-monospace,monospace">${esc(t.barcode)}</text>`;}
  return g+'</g>';}));
 const h=ts.length*(H+G)-G;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" font-family="-apple-system,system-ui,Arial,sans-serif">${cards.join('')}</svg>`;}
export async function presTicket(url:string):Promise<{svg:string;info:PresInfo}|null>{const api=presApi(url);if(!api)return null;
 const r=await fetch(api+'&_='+Date.now(),{headers:{'User-Agent':UA,Accept:'application/json','Accept-Language':'he-IL,he;q=0.9'},signal:AbortSignal.timeout(12000)});
 if(!r.ok)return null;const j=await r.json().catch(()=>null) as {document?:{tickets?:T[];reservationIsCancelled?:boolean}}|null;const doc=j?.document;if(!doc)return null;
 const info=presInfo(doc);if(!info)return null;const ts=(doc.tickets||[]).filter(t=>t&&(t.barcode||t.reservationIdentifier));
 return {svg:await presSvg(info,ts),info};}
