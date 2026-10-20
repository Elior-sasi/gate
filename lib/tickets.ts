// Turns a ticket email into an event: what, when, where, which seats, and the ticket files to show at the gate.
// Gemini reads the mail when a key is set (stores word things very differently); the rules below are the fallback and the guard.
import {gemini} from '@/lib/gemini';
import {mergeAll,cleanSeats} from '@/lib/combine';
import {bodyText,header,ticketFiles,ticketLinks,type Message} from '@/lib/gmail';
export type Kind='concert'|'show'|'movie'|'lecture'|'sport'|'festival'|'standup'|'other';
export type TFile={msg:string;id:string;name:string;type:string;size:number};
export type Part={seats:string[];count?:number;price?:string;order?:string;ai?:boolean;cancelled?:boolean};
export type Ticket={parts?:Record<string,Part>;key:string;msgs:string[];thread:string;title:string;kind:Kind;start:string;doors?:string;venue?:string;address?:string;city?:string;
 seats:string[];count?:number;order?:string;provider?:string;price?:string;files:TFile[];links:{label:string;url:string}[];mailed:number;ai?:boolean;cancelled?:boolean};
const HE_MONTHS=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const EN_MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const pad=(n:number)=>String(n).padStart(2,'0');
const fullYear=(y:number)=>y<100?2000+y:y;
// Every date written in the text, with where it was found (Hebrew/English month names and dd/mm/yy forms).
export function datesIn(text:string){const out:{at:number;y:number;m:number;d:number}[]=[];
 for(const x of text.matchAll(/(?<![\d/.])(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?![\d/.])/g)){const d=+x[1],m=+x[2],y=fullYear(+x[3]);if(m>=1&&m<=12&&d>=1&&d<=31&&y>=2020&&y<=2040)out.push({at:x.index!,y,m,d});}
 const he=new RegExp('(\\d{1,2})\\s*(?:ב|ל)?(?:'+HE_MONTHS.join('|')+'|מארס)\\s*,?\\s*(\\d{4})?','g');
 for(const x of text.matchAll(he)){const name=x[0].replace(/[\d\s,]/g,'').replace(/^[בל]/,'');let m=HE_MONTHS.indexOf(name)+1;if(name==='מארס')m=3;if(m)out.push({at:x.index!,y:x[2]?+x[2]:0,m,d:+x[1]});}
 for(const x of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})\b/gi))out.push({at:x.index!,y:+x[3],m:EN_MONTHS.indexOf(x[2].toLowerCase())+1,d:+x[1]});
 for(const x of text.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi))out.push({at:x.index!,y:+x[3],m:EN_MONTHS.indexOf(x[1].toLowerCase())+1,d:+x[2]});
 return out.sort((a,b)=>a.at-b.at);}
const TIME=/(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?!\d)/g;
// The event moment: the first date that has a time close to it, and is not before the mail was sent.
export function eventStart(text:string,mailed:number){const sent=new Date(mailed);const floor=new Date(sent.getFullYear(),sent.getMonth(),sent.getDate()).getTime();
 const cand=datesIn(text).map(c=>{let y=c.y;if(!y){y=sent.getFullYear();if(new Date(y,c.m-1,c.d).getTime()<floor)y++;}
  const before=text.slice(Math.max(0,c.at-30),c.at);const near=text.slice(Math.max(0,c.at-14),c.at+90).split('\n').slice(0,3).join(' ');const t=[...near.matchAll(TIME)].find(t=>!/^0?0:00$/.test(t[0]));
  const bought=/(?:הזמנ|רכיש|נרכש|הונפק|תשלום|purchase|order(?:ed)? date|issued|booked on)[^\n]{0,20}$/i.test(before);
  return {y,m:c.m,d:c.d,t:t?pad(+t[1])+':'+t[2]:'',bought,when:new Date(y,c.m-1,c.d).getTime()};}).filter(c=>c.when>=floor-864e5);
 const real=cand.filter(c=>!c.bought);const pool=real.length?real:cand;
 // A date on the day the mail was sent is usually the purchase date; a later date wins when there is one.
 const later=pool.filter(c=>c.when>floor);const best=later.find(c=>c.t)||pool.find(c=>c.t)||later[0]||pool[0];if(!best)return '';
 return best.y+'-'+pad(best.m)+'-'+pad(best.d)+(best.t?'T'+best.t:'');}
const pick=(text:string,re:RegExp)=>text.match(re)?.[1]?.replace(/\s*\|\s*$/,'').replace(/\s+/g,' ').trim().slice(0,80)||'';
export function seatsIn(text:string){const out:string[]=[];
 for(const x of text.matchAll(/(?:אזור\s*[:\-]?\s*([\w\u0590-\u05FF'-]{1,12})[\s,|]*)?(?:שורה|row)\s*[:\-]?\s*(\w{1,4})[\s,|]*(?:כי?סאות|מושבים|seats)\s*[:\-]?\s*(\d{1,4})\s*[-–]\s*(\d{1,4})/gi)){const a=+x[3],b=+x[4];if(b>=a&&b-a<12)for(let n=a;n<=b;n++){const s=(x[1]?'אזור '+x[1]+', ':'')+'שורה '+x[2]+', כיסא '+n;if(!out.includes(s))out.push(s);}}
 for(const x of text.matchAll(/(?:(?:אזור|יציע|גוש|section|block)\s*[:\-]?\s*([\w֐-׿'-]{1,12})[\s,|]*)?(?:שורה|row)\s*[:\-]?\s*(\w{1,4})[\s,|]*(?:כי?סא|מושב|מקום|seat)\s*[:\-]?\s*(\d{1,4})/gi)){
  const s=(x[1]?'אזור '+x[1]+', ':'')+'שורה '+x[2]+', כיסא '+x[3];if(!out.includes(s))out.push(s);}
 return out.slice(0,12);}
const CLEAN=/^(?:fwd?|re|הועבר)\s*:\s*|^(?:אישור (?:ה)?(?:הזמנה|רכישה)|הזמנתך|ההזמנה שלך|הכרטיסים שלך|כרטיסים|כרטיס|your tickets?|tickets? for|booking confirmation|order confirmation)\s*(?:ל|for|-|:|–)?\s*/gi;
export function cleanTitle(s:string){let t=s.replace(/\s*[-|–]\s*(?:אישור (?:ה)?(?:הזמנה|רכישה)|order confirmation|booking confirmation)\s*$/i,'').replace(/\s*\((?:מס[״"']?ד|הזמנה)[^)]*\)?\s*$/,'');for(let i=0;i<3;i++)t=t.replace(CLEAN,'');return t.replace(/\s*[-|–]\s*(?:מס['׳]?\s*)?(?:הזמנה|order)\s*#?\s*\w+$/i,'').replace(/^["'״]|["'״]$/g,'').trim()||s.trim();}
export function kindOf(subject:string,text:string):Kind{const k=guessKind(subject);if(k!=='other')return k;const b=guessKind(text.slice(0,1500));return b==='lecture'?'other':b;}
export function guessKind(t:string):Kind{
 // Cinematheques also host talks: a lecture is a lecture even when it is at a cinema.
 if(/הרצא|מרצה|lecture|talk\b|מאסטר.?קלאס|masterclass|כיתת אמן|שיחה עם|מפגש עם|רב.?שיח|סדנ|workshop|סמינר|כנס/i.test(t))return 'lecture';
 if(/סרט|הקרנה|קולנוע|cinema|movie|imax|4dx|סינמה|סינמטק|פלאנט|planet/i.test(t))return 'movie';
 if(/סטנד.?אפ|stand.?up|קומי/i.test(t))return 'standup';
 if(/משחק|נגד|vs\.?|מכבי|הפועל|בית"ר|ליגה|יורוליג|כדורגל|כדורסל|match|game/i.test(t))return 'sport';
 if(/פסטיבל|festival/i.test(t))return 'festival';
 if(/הצגה|תיאטרון|הבימה|הקאמרי|גשר|לסין|מחזה|מחזמר|theat(?:er|re)|musical|אופרה|בלט|opera|ballet/i.test(t))return 'show';
 if(/הופעה|הופעת|קונצרט|concert|live|tour|בארבי|זאפה|פילהרמונית|מופע/i.test(t))return 'concert';
 return 'other';}
const TICKETISH=/כרטיס|ticket|הזמנת מקומות|שורה|row|מושב|seat|הופעה|הצגה|הקרנה|מופע|כניסה|פתיחת דלתות|doors|admission|e-?ticket|ברקוד|barcode|qr/i;
// Who sells tickets (sender domain) and how a purchase mail is titled. A ticket needs one of the two, so newsletters that merely mention a date are left out.
export const SELLERS=/(?:leaan|eventim|tixwise|zappa-club|barby|eventer|smarticket|tickchak|go-out|bimot|hatarbut|kupat|habima|cameri|gesher-theatre|beitlessin|israel-opera|ipo|tmu-na|hasimta|cinema-city|yesplanet|planetcinema|lev|hotcinema|rav-hen|globusmax|cinema|jer-cin|cinematheque|eventbuzz|ticketmaster|eventbrite|dice|seetickets|livenation|axs|stubhub|viagogo|tickets|mytickets|tix|ticketsi)\.(?:co\.il|org\.il|com|co|fm|il|org|co\.uk)$/i;
const PURCHASE=/אישור (?:ה)?(?:הזמנה|רכישה)|הזמנת(?:ך)? (?:כרטיסים|מקומות)|הכרטיס(?:ים)? שלך|הכרטיסים (?:ל|עבור)|כרטיס(?:ים)? (?:ל|עבור)(?:הופעה|הצגה|סרט|אירוע)|your (?:e-?)?tickets?|tickets? (?:for|confirmation)|booking confirm|order confirm|e-?ticket|purchase confirm/i;
const MARKETING=/פרסומת|שיווקי|ניוזלטר|newsletter|עדכון שבועי|עדכוני |מבצע|המלצות|הנחה|במחיר מיוחד|כרטיסים אחרונים|sale\b|promo/i;
// A cancellation or refund of tickets: kept apart from purchases, and joined to the event it cancels.
export const CANCEL=/בוטל|בוטלה|בוטלו|ביטול|מבוטל|החזר כספי|זיכוי|cancel+(?:ed|ation)|refund/i;
const NOT_PURCHASE=/טופס|forms|צפייה בפרטי כרטיס|כרטיס (?:אשראי|האשראי)|credit card/i;
const domainOf=(from:string)=>(from.match(/@([\w.-]+)>?\s*$/)?.[1]||'').toLowerCase();
const addr=(h:string)=>(h.match(/[\w.+-]+@[\w.-]+/)?.[0]||'').toLowerCase();
// Strong enough to be a purchase: from a ticket seller, or titled like a purchase - and not marketing, mail to yourself, or a card/forms notice.
export const fromSeller=(m:Message)=>{const d=domainOf(header(m,'from'));return SELLERS.test(d)||d.split('.').some(x=>/^(?:tickets?|tix|cinema|kupat)$/.test(x));};
export function looksLikePurchase(m:Message){const subject=header(m,'subject'),from=header(m,'from');
 if(MARKETING.test(subject)||NOT_PURCHASE.test(subject))return false;
 if(CANCEL.test(subject)&&!/כרטיס|ticket|הזמנ|order|booking|אירוע|הופעה|הצגה|מופע|הקרנה|event|show/i.test(subject)&&!fromSeller(m))return false;
 if(addr(from)&&addr(from)===addr(header(m,'to')))return false;
 const d=domainOf(from);return SELLERS.test(d)||d.split('.').some(x=>/^(?:tickets?|tix|cinema|kupat)$/.test(x))||PURCHASE.test(subject);}
const NOT_TICKET=/טיסה|flight|boarding pass|מלון|hotel|booking\.com|airbnb|השכרת רכב|רכבת ישראל|משלוח|shipped|parcel|חבילה|קבלה על תרומה|newsletter|ניוזלטר/i;
// Rule-based reading, used without a Gemini key and as the fallback when Gemini is busy.
export function ruleTicket(m:Message,text:string):Ticket|null{
 const subject=header(m,'subject');const mailed=+(m.internalDate||Date.now());const all=subject+'\n'+text;
 if(!TICKETISH.test(all)||NOT_TICKET.test(subject)||!looksLikePurchase(m))return null;
 const cancelled=CANCEL.test(subject);const start=eventStart(text,mailed)||eventStart(subject,mailed)||'';if(!start&&!cancelled)return null;
 const lines=text.split('\n').map(l=>l.replace(/[|#*]/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean);
 // Many sellers title the mail with the venue ("סינמטק ירושלים - אישור הזמנה") and write the event as a line followed by "ב<venue>".
 const at=lines.findIndex(l=>/^ב(?:סינמטק|סינמה|קולנוע|תיאטרון|היכל|אולם|מוזיאון|בית|זאפה|בארבי|מועדון|מרכז|גני|פארק|אמפי|האנגר|רידינג)/.test(l));
 const named=at>0&&lines[at-1].length<=80&&!/[:]|הזמנה|כרטיס/.test(lines[at-1])?lines[at-1]:'';
 const title=named||cleanTitle(subject);const files=ticketFiles(m).map(f=>({...f,msg:m.id}));
 const hour=start&&!start.includes('T')&&pick(text,/בשעה\s*[-:]?\s*(\d{1,2}:\d{2})/);
 if(!fromSeller(m)&&!files.length&&!seatsIn(text).length&&!/כרטיס|ticket|הופעה|הצגה|הקרנה|מופע|כנס|הרצאה/i.test(subject))return null;
 const k=guessKind(title);
 return {key:'',msgs:[m.id],thread:m.threadId,title,kind:k!=='other'?k:kindOf(subject,text),start:hour?start+'T'+hour.padStart(5,'0'):start,
  doors:pick(text,/(?:פתיחת (?:דלתות|שערים)|doors open)\s*[:\-]?\s*(\d{1,2}:\d{2})/i)||undefined,
  venue:pick(text,/(?:^|\n)\s*(?:מקום(?: האירוע)?|אולם|מיקום|היכל|venue|location)\s*[:\-]\s*([^\n]{3,80})/i)||(named?lines[at].slice(1):undefined),
  address:pick(text,/(?:^|\n)\s*(?:כתובת|address)\s*[:\-]\s*([^\n]{4,80})/i)||undefined,
  // The same seat is often written twice (Hebrew and English parts of one mail).
  seats:cleanSeats(seatsIn(text)),count:Number(pick(text,/(?:מספר כרטיסים|סה["״]?כ כרטיסים(?: בהזמנה)?|כמות(?: כרטיסים)?|quantity|tickets?)\s*[:\-x×]\s*(\d{1,2})\b/i))||undefined,
  order:pick(text,/(?:מס['׳]?\s*(?:ה)?הזמנה|מספר (?:ה)?הזמנה|order\s*(?:no\.?|number|#)|booking\s*(?:ref(?:erence)?|no\.?|#))\s*[:#\-]?\s*([A-Z0-9-]{4,24})/i)||pick(text,/(?:אישור הזמנה|booking confirmation)[\s|#]*(\d[\d-]{5,24})/i)||undefined,
  provider:header(m,'from').replace(/<.*>/,'').replace(/"/g,'').trim()||undefined,
  price:pick(text,/(?:סה["״]?כ(?: לתשלום)?|total)\s*[:\-]?\s*(₪\s?[\d,.]+|[\d,.]+\s?₪|[$€£]\s?[\d,.]+)/i)||undefined,
  files,links:ticketLinks(m),mailed,cancelled};}
const SCHEMA={type:'OBJECT',properties:{
 isTicket:{type:'BOOLEAN',description:'true for tickets/booking confirmations for an event (concert, show, movie, sport, festival, stand-up, lecture), and also for a mail cancelling or refunding such tickets or saying such an event was cancelled. false for flights, hotels, shop orders, marketing, newsletters.'},
 title:{type:'STRING',description:'Short event name as people say it, in the language used in the mail (Hebrew preferred): the film, show, artist or lecture title - not the cinema or venue name. No words like "אישור הזמנה" or order numbers.'},
 kind:{type:'STRING',enum:['concert','show','movie','lecture','sport','festival','standup','other'],description:'lecture = a talk, lecture, panel, workshop or conversation with a speaker - also when held at a cinema or cinematheque. movie = a film screening.'},
 start:{type:'STRING',description:'Event start in local time, YYYY-MM-DDTHH:mm (or YYYY-MM-DD if no time). Not the purchase or cancellation date. Empty if the mail does not say.'},
 doors:{type:'STRING',description:'Doors/gates opening time HH:mm, if stated'},
 venue:{type:'STRING',description:'Venue or hall name'},address:{type:'STRING',description:'Street address of the venue, if stated'},city:{type:'STRING'},
 seats:{type:'ARRAY',items:{type:'STRING'},description:'One entry per seat in Hebrew, e.g. "אזור B, שורה 7, כיסא 12". A range like "כיסאות: 5 - 6" is two entries (כיסא 5, כיסא 6). Standing tickets: "עמידה".'},
 count:{type:'INTEGER',description:'Number of tickets in this order (e.g. "סה\"כ כרטיסים בהזמנה: 2")'},order:{type:'STRING',description:'Order/booking number'},
 provider:{type:'STRING',description:'Ticket seller or cinema chain'},price:{type:'STRING',description:'Total paid with currency sign'},
 cancelled:{type:'BOOLEAN',description:'true only if this mail itself says the tickets/order were cancelled or refunded, or the event was cancelled. false for a normal purchase, a reminder, or a mail that only explains the refund policy.'},
 eventCancelled:{type:'BOOLEAN',description:'true if the whole event was cancelled by the organiser (not just this order)'}},required:['isTicket']};
export type AiResult={ok:true;ticket:Ticket|null}|{ok:false};
export async function aiTicket(m:Message,text:string):Promise<AiResult>{
 if(!process.env.GEMINI_API_KEY)return {ok:false};
 const subject=header(m,'subject'),from=header(m,'from');const mailed=+(m.internalDate||Date.now());
 const prompt='Mail sent '+new Date(mailed).toISOString().slice(0,10)+'\nFrom: '+from+'\nSubject: '+subject+'\n\n'+text.slice(0,7000);
 const r=await gemini({systemInstruction:{parts:[{text:'You read emails for an Israeli user and extract event ticket details as JSON. Cinemas and cinematheques sell tickets to lectures and talks too: tell a lecture from a film screening. Be exact; leave fields out when the mail does not say them.'}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',responseSchema:SCHEMA,temperature:0}},20000);
 if(!r.ok)return {ok:false};
 let j:Record<string,any>;try{j=JSON.parse(r.text);}catch{return {ok:false};}
 const cx=!!j.cancelled||!!j.eventCancelled;const dated=/^\d{4}-\d{2}-\d{2}/.test(String(j.start||''));
 // A cancellation may leave out the date: it is kept only to be joined to the event it cancels (by order number or name).
 if(!j.isTicket||(!dated&&!cx))return {ok:true,ticket:null};
 const s=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim().slice(0,120):undefined;
 return {ok:true,ticket:{key:'',msgs:[m.id],thread:m.threadId,title:s(j.title)||cleanTitle(subject),kind:(['concert','show','movie','lecture','sport','festival','standup','other'].includes(j.kind)?j.kind:kindOf(subject,text)) as Kind,
  start:dated?String(j.start).slice(0,16):'',doors:s(j.doors),venue:s(j.venue),address:s(j.address),city:s(j.city),seats:Array.isArray(j.seats)?j.seats.map(String).slice(0,12):[],count:Number(j.count)||undefined,
  order:j.eventCancelled?undefined:s(j.order),provider:s(j.provider),price:s(j.price),files:cx?[]:ticketFiles(m).map(f=>({...f,msg:m.id})),links:ticketLinks(m),mailed,ai:true,cancelled:cx}};}
export type Read={ticket:Ticket|null;retry:boolean};
// last: this mail already waited once for Gemini, so the rules' reading is used rather than waiting again.
export async function readTicket(m:Message,last=false):Promise<Read>{
 const text=bodyText(m);const rule=ruleTicket(m,text);
 // Mail with no ticket words at all is skipped without spending a Gemini call.
 if(!TICKETISH.test(header(m,'subject')+'\n'+text)||!looksLikePurchase(m))return {ticket:null,retry:false};
 const ai=await aiTicket(m,text);
 if(ai.ok)return {ticket:ai.ticket?withKey(ai.ticket):null,retry:false};
 // Gemini busy: show the rules' reading now, and read the mail again later; Gemini's reading then replaces it (same mail).
 if(process.env.GEMINI_API_KEY&&!last)return {ticket:rule?withKey(rule):null,retry:true};
 return {ticket:rule?withKey(rule):null,retry:false};}
const norm=(s:string)=>s.toLowerCase().replace(/[^\w֐-׿]+/g,'');
export function withKey(t:Ticket):Ticket{return {...t,key:t.order?'o:'+norm(t.order):'t:'+norm(t.title).slice(0,24)+':'+t.start.slice(0,10)};}
// Several mails about one event (confirmation, reminder, the tickets themselves) become one card.
// Several mails about one event (confirmation, reminder, a second order for more seats) become one card.
export function mergeTickets(list:Ticket[]):Ticket[]{return mergeAll([],[...list].sort((a,b)=>a.mailed-b.mailed));}
