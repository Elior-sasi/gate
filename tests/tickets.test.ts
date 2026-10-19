import {test} from 'node:test';
import assert from 'node:assert/strict';
import {eventStart,seatsIn,cleanTitle,guessKind,ruleTicket,mergeTickets,withKey} from '@/lib/tickets';
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
