import {test} from 'node:test';
import assert from 'node:assert/strict';
import {eventStart,seatsIn,cleanTitle,guessKind,ruleTicket,mergeTickets,withKey,looksLikePurchase} from '@/lib/tickets';
const sent=new Date(2026,9,1,10).getTime();
const mail=(subject:string,text:string,from='לאן <noreply@leaan.co.il>')=>({id:'abc123',threadId:'t1',internalDate:String(sent),payload:{mimeType:'text/plain',headers:[{name:'Subject',value:subject},{name:'From',value:from}],body:{data:Buffer.from(text).toString('base64url')}}});
test('event date with time, not the order date',()=>{
 assert.equal(eventStart('תאריך הזמנה: 01/10/2026\nמועד המופע: יום ה\' 23/10/2026 בשעה 21:00',sent),'2026-10-23T21:00');
 assert.equal(eventStart('Thursday, October 23, 2026 at 8:30 PM, doors 19:30',sent).slice(0,10),'2026-10-23');
 assert.equal(eventStart('ההופעה תתקיים ב-12 בנובמבר, 20:30',sent),'2026-11-12T20:30');
 assert.equal(eventStart('23.10.26 21:15',sent),'2026-10-23T21:15');});
test('seats',()=>{assert.deepEqual(seatsIn('אזור B שורה 7 כיסא 12\nשורה 7 כסא 13'),['אזור B, שורה 7, כיסא 12','שורה 7, כיסא 13']);
 assert.deepEqual(seatsIn('Row: F | Seat: 4'),['שורה F, כיסא 4']);});
test('titles and kinds',()=>{assert.equal(cleanTitle('אישור הזמנה - עומר אדם בהיכל מנורה'),'עומר אדם בהיכל מנורה');assert.equal(cleanTitle('Your tickets for Coldplay'),'Coldplay');
 assert.equal(guessKind('סינמה סיטי גלילות - דיונה'),'movie');assert.equal(guessKind('הבימה - המלט'),'show');assert.equal(guessKind('מכבי ת"א נגד הפועל'),'sport');});
test('rule ticket from a mail',()=>{const t=ruleTicket(mail('הכרטיסים שלך: שלמה ארצי','מקום: היכל התרבות, תל אביב\nתאריך: 05/11/2026 20:30\nפתיחת דלתות: 19:30\nשורה 12 כיסא 8\nמספר הזמנה: 884512\nסה"כ: ₪ 398') as never,'מקום: היכל התרבות, תל אביב\nתאריך: 05/11/2026 20:30\nפתיחת דלתות: 19:30\nשורה 12 כיסא 8\nמספר הזמנה: 884512\nסה"כ: ₪ 398')!;
 assert.equal(t.title,'שלמה ארצי');assert.equal(t.start,'2026-11-05T20:30');assert.equal(t.venue,'היכל התרבות, תל אביב');assert.equal(t.doors,'19:30');assert.equal(t.order,'884512');assert.deepEqual(t.seats,['שורה 12, כיסא 8']);assert.equal(t.price,'₪ 398');});
test('not tickets',()=>{assert.equal(ruleTicket(mail('ההזמנה שלך נשלחה','משלוח בדרך 05/11/2026') as never,'משלוח בדרך 05/11/2026'),null);});
test('merge by order number',()=>{const a=withKey({key:'',msgs:['1'],thread:'t',title:'A',kind:'concert',start:'2026-11-05',seats:[],files:[],links:[],mailed:1,order:'884512'});const b=withKey({...a,msgs:['2'],start:'2026-11-05T20:30',seats:['שורה 1, כיסא 2'],mailed:2});
 const m=mergeTickets([a,b]);assert.equal(m.length,1);assert.equal(m[0].start,'2026-11-05T20:30');assert.deepEqual(m[0].msgs,['1','2']);});
test('marketing and self mail are not tickets',()=>{
 const m=(subject:string,from:string,to='me@gmail.com')=>({id:'x123456',threadId:'t',internalDate:String(sent),payload:{headers:[{name:'Subject',value:subject},{name:'From',value:from},{name:'To',value:to}]}}) as never;
 assert.equal(looksLikePurchase(m('עדכון שבועי מס\' 145 על עולם הAI (תוכן שיווקי)','AI <news@ai.co.il>')),false);
 assert.equal(looksLikePurchase(m('ספר חדש במחיר מיוחד | פרסומת','כנרת <a@kinneret.co.il>')),false);
 assert.equal(looksLikePurchase(m('עולם המשאלות SRT','me <me@gmail.com>')),false);
 assert.equal(looksLikePurchase(m('התראה בנושא צפייה בפרטי כרטיס','max <info@max-finance.co.il>')),false);
 assert.equal(looksLikePurchase(m('סינמה סיטי ירושלים - אישור הזמנה','Cinema City <noreply@cinema-city.co.il>')),true);
 assert.equal(looksLikePurchase(m('AnimeFest 07.11','GO-OUT <tickets@go-out.co>')),true);
 assert.equal(looksLikePurchase(m('הזמנה חדשה','Planet <noreply@planetcinema.co.il>')),true);
 assert.equal(cleanTitle('סינמטק ירושלים - אישור הזמנה'),'סינמטק ירושלים');
 assert.equal(cleanTitle('אישור רכישה - FRIENDS רשת מועדוני תרבות (מס״ד: 1571809 הזמנה: 55'),'FRIENDS רשת מועדוני תרבות');});
test('lectures at a cinematheque are lectures',()=>{assert.equal(guessKind('סינמטק ירושלים - הרצאה: היסטוריה של האנימה'),'lecture');assert.equal(guessKind('סינמטק תל אביב - מפגש עם הבמאי'),'lecture');assert.equal(guessKind('סינמטק תל אביב - פרפקט דייז'),'movie');});
test('three orders for one show add up, and a re-read does not double count',async()=>{const {mergeAll}=await import('@/lib/combine');
 const base={thread:'t',title:'טארה סטרונג - מאסטרקלאס',kind:'lecture' as const,start:'2026-11-03T17:00',files:[],links:[],ai:true};
 const a=withKey({...base,key:'',msgs:['m1'],order:'16320-39278-74340',seats:['שורה 1, כיסא 5','שורה 1, כיסא 6'],count:2,price:'86.00 ₪',mailed:1});
 const b=withKey({...base,key:'',msgs:['m2'],order:'20980-39279-55490',seats:['שורה 1, כיסא 2'],count:1,price:'43.00 ₪',mailed:2});
 const c=withKey({...base,key:'',msgs:['m3'],order:'55310-39279-82909',seats:['שורה 1, כיסא 10'],count:1,price:'43.00 ₪',mailed:3});
 let all=mergeAll([],[a,b,c]);assert.equal(all.length,1);assert.equal(all[0].count,4);assert.equal(all[0].seats.length,4);assert.match(all[0].price!,/172/);
 all=mergeAll(all,[b]);assert.equal(all[0].count,4);
 assert.deepEqual(seatsIn('רגיל x 2 אזור: אולם, שורה: 1, כיסאות: 5 - 6'),['אזור אולם, שורה 1, כיסא 5','אזור אולם, שורה 1, כיסא 6']);});
test('the same order read twice, and seats written three ways, count once',async()=>{const {mergeAll}=await import('@/lib/combine');
 const base={thread:'t',title:'טארה סטרונג - מאסטרקלאס',kind:'lecture' as const,start:'2026-11-03T17:00',files:[],links:[]};
 const rule={...base,key:'t:x',msgs:['m1'],seats:['אזור אולם, שורה 1, כיסא 5','שורה 1, כיסא 5','שורה 1, כיסא 6'],mailed:1};
 const ai=withKey({...base,key:'',msgs:['m1'],order:'16320-39278-74340',seats:['אזור: אולם, שורה: 1, כיסא: 5','אזור: אולם, שורה: 1, כיסא: 6'],count:2,ai:true,mailed:1});
 const remind=withKey({...base,key:'',msgs:['m9'],order:'16320-39278-74340',seats:['שורה 1, כיסא 5','שורה 1, כיסא 6'],count:2,ai:true,mailed:5});
 const other=withKey({...base,key:'',msgs:['m2'],order:'20980-39279-55490',seats:['אזור: אולם, שורה: 1, כיסא: 2'],count:1,ai:true,mailed:2});
 const all=mergeAll([],[rule,ai,remind,other]);assert.equal(all.length,1);assert.equal(all[0].count,3);assert.deepEqual(all[0].seats,['שורה 1, כיסא 5','שורה 1, כיסא 6','שורה 1, כיסא 2']);});
test('cancellations: one order of three, a whole event, and a notice with no date',async()=>{const {mergeAll}=await import('@/lib/combine');
 const base={thread:'t',title:'טארה סטרונג - מאסטרקלאס',kind:'lecture' as const,start:'2026-11-03T17:00',files:[],links:[],ai:true};
 const a=withKey({...base,key:'',msgs:['m1'],order:'111-1',seats:['שורה 1, כיסא 5','שורה 1, כיסא 6'],count:2,price:'86 ₪',mailed:1});
 const b=withKey({...base,key:'',msgs:['m2'],order:'222-2',seats:['שורה 1, כיסא 2'],count:1,price:'43 ₪',mailed:2});
 // Order 222-2 refunded; the refund mail has no date.
 const cx=withKey({...base,key:'',msgs:['m3'],title:'ביטול הזמנה',start:'',order:'222-2',seats:[],mailed:3,cancelled:true});
 let all=mergeAll([],[a,b,cx]);assert.equal(all.length,1);assert.equal(all[0].cancelled,false);assert.equal(all[0].count,2);assert.match(all[0].price!,/86/);assert.equal(all[0].title,base.title);
 // The organiser cancels the event (no order number): the event is cancelled, and stays where it was in time.
 const ev=withKey({...base,key:'',msgs:['m4'],start:'',seats:[],mailed:4,cancelled:true});
 all=mergeAll(all,[ev]);assert.equal(all.length,1);assert.equal(all[0].cancelled,true);assert.equal(all[0].start,base.start);
 // A cancellation that matches nothing stays apart (and has no date, so the app does not list it).
 const lone=withKey({...base,key:'',msgs:['m5'],title:'הופעה אחרת לגמרי',start:'',order:'999',seats:[],mailed:5,cancelled:true});
 all=mergeAll(all,[lone]);assert.equal(all.length,2);
 // A plain purchase of a past event is not cancelled.
 const past=withKey({...base,key:'',msgs:['m6'],title:'שלמה ארצי',start:'2025-01-01T20:00',order:'777',seats:[],mailed:6});
 assert.ok(!mergeAll([],[past])[0].cancelled);});
// Mail text as the app flattens it: one line per row, no table borders.
const flat=(p:TemplateStringsArray,...v:unknown[])=>String.raw({raw:p},...v).split('\n').map(l=>l.replace(/[|#]/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
test('cinematheque mail read by the rules: the event name, lecture, time, seats once, order number',()=>{
 const body=(order:string,line:string,n:number,eng:string)=>flat`| # אישור הזמנה |\n\n| |\n| # ${order} |\n\n| שלום אליאור, |\n| פרטי הרכישה: |\n| לחצו כאן לקבלת הכרטיסים |\n\n| |\n| טארה סטרונג - מאסטרקלאס |\n\n| |\n| בסינמטק ירושלים - סינמטק 2 |\n\n| |\n| ביום - שלישי 3/11/2026 |\n\n| |\n| בשעה - 17:00 |\n\n| ${line} |\n| סה"כ כרטיסים בהזמנה: ${n} |\n| סה"כ תשלום בהזמנה: ${43*n}.00 ₪ |\n| # Booking Confirmation |\n| # ${order} |\n| ${eng} |`;
 const a=ruleTicket(mail('סינמטק ירושלים - אישור הזמנה',body('16320-39278-74340','(43.00 ₪) רגיל x 2 אזור: אולם, שורה: 1, כיסאות: 5 - 6',2,'Row: 1, Seats: 5 - 6'),'סינמטק <service@jer-cin.co.il>') as never,body('16320-39278-74340','(43.00 ₪) רגיל x 2 אזור: אולם, שורה: 1, כיסאות: 5 - 6',2,'Row: 1, Seats: 5 - 6'))!;
 assert.equal(a.title,'טארה סטרונג - מאסטרקלאס');assert.equal(a.kind,'lecture');assert.equal(a.start,'2026-11-03T17:00');assert.equal(a.seats.length,2);assert.equal(a.order,'16320-39278-74340');assert.equal(a.count,2);assert.equal(a.venue,'סינמטק ירושלים - סינמטק 2');});
test('a table header "Row and Seat" is not a seat',()=>{assert.deepEqual(seatsIn('Date and time | Movie | Venue | Number of tickets | Row and Seat\n1/10/2026 14:45 | X | אולם 2 | 2 | Row: 6, Seats: 8 - 9\nתאריך ושעה | סרט | שורה וכסא'),['שורה 6, כיסא 8','שורה 6, כיסא 9']);
 assert.deepEqual(seatsIn('Row F Seat 4 | שורה 12א כיסא 3'),['שורה F, כיסא 4','שורה 12א, כיסא 3']);});
