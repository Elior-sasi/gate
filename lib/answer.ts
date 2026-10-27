// Answers for the usual questions ("באיזו שורה אני יושב בהופעה הבאה?", "מתי הסרט?", "איפה זה?") without Gemini,
// from the events on the phone: used when Gemini is busy or unavailable, so a simple question still gets an answer.
import type {Ticket,Kind} from '@/lib/tickets';
const KINDS:[RegExp,Kind[]][]=[[/הופע|קונצרט|מופע/,['concert','festival','standup']],[/הצג|תיאטרון/,['show']],[/סרט|הקרנ|קולנוע/,['movie']],[/הרצא|מאסטרקלאס/,['lecture']],[/משחק|ספורט/,['sport']],[/סטנד/,['standup']],[/פסטיבל/,['festival']],[/מסיב/,['party']],[/כנס/,['con']]];
const DAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const MONTHS=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const norm=(s:string)=>s.toLowerCase().replace(/[^\w֐-׿]+/g,' ').trim();
const at=(t:Ticket)=>{const [d,h]=t.start.split('T');const [y,m,dd]=d.split('-').map(Number);const [hh,mm]=(h||'00:00').split(':').map(Number);return new Date(y,m-1,dd,hh,mm);};
const date=(t:Ticket)=>{const d=at(t);return 'יום '+DAYS[d.getDay()]+', '+d.getDate()+' ב'+MONTHS[d.getMonth()];};
const hour=(t:Ticket)=>t.start.split('T')[1]||'';
const place=(t:Ticket)=>[t.venue,t.city].filter(Boolean).join(', ');
export function localAnswer(q:string,list:Ticket[],now=new Date()):string|null{
 const s=norm(q);if(!s)return null;const live=list.filter(t=>!t.cancelled&&t.start);
 const day0=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
 const upcoming=live.filter(t=>at(t).getTime()>=day0).sort((a,b)=>at(a).getTime()-at(b).getTime());
 // Which event: one named in the question, else the next one (of the kind asked about, if any).
 const named=live.filter(t=>norm(t.title).split(' ').filter(w=>w.length>=3).some(w=>s.includes(w))).sort((a,b)=>Math.abs(at(a).getTime()-now.getTime())-Math.abs(at(b).getTime()-now.getTime()));
 const kinds=KINDS.find(([r])=>r.test(s))?.[1];
 if(/כמה\s+(?:אירועים|הופעות|כרטיסים)/.test(s)&&!named.length){const n=upcoming.filter(t=>!kinds||kinds.includes(t.kind)).length;return n?'יש לך '+n+' אירועים קרובים.':'אין לך אירועים קרובים.';}
 const t=named[0]||upcoming.find(t=>!kinds||kinds.includes(t.kind));
 if(!t)return kinds?'לא מצאתי אירוע קרוב מהסוג הזה.':upcoming.length?null:'אין לך אירועים קרובים.';
 const who=t.title;const out:string[]=[];
 if(/שור|כיס|מקום ישיב|יושב|מושב|מקומות/.test(s)){out.push(t.seats.length?'ב'+who+': '+t.seats.join('; ')+'.':'ב'+who+' אין מקומות מסומנים בכרטיס.');}
 if(/מתי|תאריך|איזה יום|באיזה יום/.test(s))out.push(who+' ב'+date(t)+(hour(t)?' בשעה '+hour(t):'')+'.');
 else if(/שעה|באיזו שעה|מתחיל/.test(s))out.push(hour(t)?who+' מתחיל בשעה '+hour(t)+(t.doors?', פתיחת דלתות '+t.doors:'')+'.':'אין לי שעה ל'+who+'.');
 if(/איפה|מקום האירוע|כתובת|לאן|באיזה מקום|אולם/.test(s)&&!out.some(x=>x.includes(place(t))))out.push(place(t)?who+' ב'+place(t).replace(/^ב/,'')+(t.address?', '+t.address:'')+'.':'אין לי מקום ל'+who+'.');
 if(/כמה ימים|עוד כמה/.test(s)){const d=Math.round((new Date(at(t).getFullYear(),at(t).getMonth(),at(t).getDate()).getTime()-day0)/864e5);out.push(d===0?who+' היום.':d===1?who+' מחר.':d===2?'עוד יומיים ל'+who+'.':'עוד '+d+' ימים ל'+who+'.');}
 if(/כמה שילמ|מחיר|עלה|עלו/.test(s))out.push(t.price?'על '+who+' שילמת '+t.price+'.':'אין לי מחיר ל'+who+'.');
 if(/דלתות/.test(s)&&!out.some(x=>x.includes('דלתות')))out.push(t.doors?'פתיחת דלתות ב'+t.doors+'.':'אין לי שעת פתיחת דלתות.');
 if(!out.length&&/הבא|הקרוב|מה יש|מה האירוע/.test(s))out.push('האירוע הבא: '+who+', '+date(t)+(hour(t)?' בשעה '+hour(t):'')+(place(t)?', ב'+place(t).replace(/^ב/,''):'')+'.');
 return out.length?out.join(' '):null;}
