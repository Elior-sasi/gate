import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withKey,signals,type Ticket} from '@/lib/tickets';
import {mergeAll,current} from '@/lib/combine';
import {detectTicketChanges,changeNotes} from '@/lib/changes';
const D=(d:number)=>Date.UTC(2026,9,d);
const base={thread:'t',title:'שלמה ארצי',kind:'concert' as const,venue:'היכל מנורה מבטחים',city:'תל אביב',links:[],ai:true,seller:'leaan.co.il'};
const mail=(o:Partial<Ticket>&{msgs:string[];mailed:number}):Ticket=>withKey({...base,key:'',start:'2026-11-05T20:00',seats:[],files:[],...o} as Ticket);
const pdf=(msg:string,id:string)=>({msg,id,name:'tickets.pdf',type:'application/pdf',size:1000});
const two=mail({msgs:['m1'],mailed:D(1),order:'A100',seats:['שורה 5, כיסא 12','שורה 5, כיסא 13'],count:2,price:'₪ 400',files:[pdf('m1','f1')]});

test('two tickets in one order: one event, two seats, one file',()=>{const all=mergeAll([],[two]);assert.equal(all.length,1);assert.equal(all[0].count,2);assert.equal(all[0].seats.length,2);assert.equal(current(all[0]).length,1);});

test('confirmation, ticket mail and reminder about the same order are one event (identity by order number)',()=>{
 const tix=mail({msgs:['m2'],mailed:D(2),order:'A100',seats:['שורה 5, כיסא 12','שורה 5, כיסא 13'],files:[pdf('m2','f2')]});
 const rem=mail({msgs:['m3'],mailed:D(4),order:'A100',seats:[]});
 const all=mergeAll([],[two,tix,rem]);assert.equal(all.length,1);assert.equal(all[0].count,2);});

test('different events with the same title stay apart',()=>{const other=mail({msgs:['x1'],mailed:D(2),order:'B200',start:'2026-12-20T21:00',seats:['שורה 1, כיסא 1']});
 assert.equal(mergeAll([],[two,other]).length,2);});

test('changed time: the same event is updated, one notification, not sent twice',()=>{
 const ch=mail({msgs:['m4'],mailed:D(5),order:'A100',start:'2026-11-05T21:00',update:true});
 const before=mergeAll([],[two])[0];const after=mergeAll([before],[ch]);assert.equal(after.length,1);assert.equal(after[0].start,'2026-11-05T21:00');
 assert.deepEqual(detectTicketChanges(before,after[0]).map(c=>c.type),['TIME_CHANGED']);
 const a=changeNotes(before,after[0],true,{});assert.equal(a.notes.length,1);assert.match(a.notes[0].body,/20:00.*21:00/);
 const b=changeNotes(before,after[0],true,a.sent);assert.equal(b.notes.length,0);});

test('a stale confirmation scanned again does not undo the change',()=>{
 const ch=mail({msgs:['m4'],mailed:D(5),order:'A100',start:'2026-11-05T21:00',update:true});
 const all=mergeAll(mergeAll([],[two,ch]),[mail({msgs:['m1'],mailed:D(1),order:'A100',start:'2026-11-05T20:00',seats:['שורה 5, כיסא 12','שורה 5, כיסא 13']})]);
 assert.equal(all.length,1);assert.equal(all[0].start,'2026-11-05T21:00');
 // Even when the old mail is read last in a fresh scan.
 assert.equal(mergeAll([],[ch,two])[0].start,'2026-11-05T21:00');});

test('changed date without an order number still joins the event (a change notice from the same seller)',()=>{
 const a=mail({msgs:['n1'],mailed:D(1),seats:['שורה 2, כיסא 3']});const ch=mail({msgs:['n2'],mailed:D(6),start:'2026-11-12T20:00',update:true});
 const all=mergeAll([],[a,ch]);assert.equal(all.length,1);assert.equal(all[0].start,'2026-11-12T20:00');
 assert.deepEqual(detectTicketChanges(mergeAll([],[a])[0],all[0]).map(c=>c.type),['DATE_CHANGED']);});

test('changed venue and changed hall; the same place written differently is not a change',()=>{
 const b=mergeAll([],[two])[0];
 assert.deepEqual(detectTicketChanges(b,{...b,venue:'היכל התרבות'}).map(c=>c.type),['VENUE_CHANGED']);
 const h={...b,venue:'סינמטק ירושלים - אולם 1'};assert.deepEqual(detectTicketChanges(h,{...h,venue:'סינמטק ירושלים - אולם 3'}).map(c=>c.type),['HALL_CHANGED']);
 assert.deepEqual(detectTicketChanges({...b,venue:'סינמטק ירושלים'},{...b,venue:'סינמטק ירושלים - סינמטק 2'}),[]);});

test('changed seat: a newer ticket for the same order replaces the seats and the old file',()=>{
 const ch=mail({msgs:['m5'],mailed:D(7),order:'A100',seats:['שורה 8, כיסא 4','שורה 8, כיסא 5'],files:[pdf('m5','f5')],update:true});
 const before=mergeAll([],[two])[0];const after=mergeAll([before],[ch])[0];
 assert.deepEqual(after.seats,['שורה 8, כיסא 4','שורה 8, כיסא 5']);assert.deepEqual(current(after).map(f=>f.id),['f5']);
 const types=detectTicketChanges(before,after).map(c=>c.type);assert.ok(types.includes('SEAT_CHANGED'));assert.ok(types.includes('TICKET_REPLACED'));
 // The old ticket never comes back, whatever order the mails are read in.
 assert.deepEqual(current(mergeAll([],[ch,two])[0]).map(f=>f.id),['f5']);});

test('replacement ticket with the same seats: the new file is current, the old one hidden',()=>{
 const rep=mail({msgs:['m6'],mailed:D(8),order:'A100',seats:['שורה 5, כיסא 12','שורה 5, כיסא 13'],files:[pdf('m6','f6')],update:true});
 const after=mergeAll([],[two,rep])[0];assert.deepEqual(current(after).map(f=>f.id),['f6']);assert.equal(after.files.find(f=>f.id==='f1')?.stale,true);});

test('a second order for more seats adds tickets and keeps both files (not a replacement)',()=>{
 const more=mail({msgs:['m7'],mailed:D(9),order:'A101',seats:['שורה 5, כיסא 14'],count:1,files:[pdf('m7','f7')]});
 const before=mergeAll([],[two])[0];const after=mergeAll([before],[more])[0];
 assert.equal(after.count,3);assert.equal(current(after).length,2);assert.deepEqual(detectTicketChanges(before,after),[]);});

test('cancellation, then back on; neither is sent twice; the event stays in the list',()=>{
 const cx=mail({msgs:['c1'],mailed:D(10),order:'A100',start:'',cancelled:true});
 const before=mergeAll([],[two])[0];const cancelled=mergeAll([before],[cx]);
 assert.equal(cancelled.length,1);assert.equal(cancelled[0].cancelled,true);
 const a=changeNotes(before,cancelled[0],true,{});assert.equal(a.notes[0].title,'האירוע בוטל');assert.equal(changeNotes(before,cancelled[0],true,a.sent).notes.length,0);
 const back=mail({msgs:['r1'],mailed:D(11),order:'A100',start:'',restored:true});const restored=mergeAll(cancelled,[back])[0];
 assert.ok(!restored.cancelled);assert.equal(changeNotes(cancelled[0],restored,true,a.sent).notes[0].title,'האירוע חזר להתקיים');
 // An old cancellation read again after the "back on" mail does not cancel it again.
 assert.ok(!mergeAll([restored],[cx])[0].cancelled);});

test('Gemini alone never cancels: only the mail\'s own words do',()=>{
 assert.equal(signals('אישור הזמנה - שלמה ארצי','מדיניות ביטולים: ניתן לבטל עד 3 ימים לפני').cancelSaid,false);
 assert.equal(signals('סינמה סיטי - ביטול הזמנה מהאינטרנט','הזמנתך בוטלה בהצלחה!').cancelSaid,true);
 assert.equal(signals('עדכון חשוב','ההופעה של שלמה ארצי בוטלה עקב מזג האוויר').cancelSaid,true);
 assert.equal(signals('ההופעה נדחתה','ההופעה נדחתה ל-12 בנובמבר').update,true);
 assert.equal(signals('כרטיסים מעודכנים לאירוע','מצורפים הכרטיסים החדשים').replace,true);
 assert.equal(signals('עדכון','האירוע יתקיים כמתוכנן').restored,true);});

test('an untrusted reading (rules, no change wording) does not send time or place alarms',()=>{
 const before=mergeAll([],[two])[0];const after={...before,start:'2026-11-05T19:00'};
 assert.equal(changeNotes(before,after,false,{}).notes.length,0);assert.equal(changeNotes(before,after,true,{}).notes.length,1);});
import {offlinePlan,personalKeys} from '@/lib/offline';
test('offline: the next two weeks are fetched ahead, a replaced ticket is not kept, old events leave the phone',()=>{
 const now=new Date(2026,10,1,12).getTime();const f=(id:string,stale=false)=>({msg:'m'+id,id,name:'t.pdf',type:'application/pdf',size:1,...(stale?{stale:true}:{})});
 const soon=mail({msgs:['s'],mailed:D(1),start:'2026-11-03T20:00',files:[f('new'),f('old',true)]});
 const later=mail({msgs:['l'],mailed:D(1),start:'2026-12-30T20:00',files:[f('far')]});const past=mail({msgs:['p'],mailed:D(1),start:'2026-10-31T20:00',files:[f('past')]});
 const gone=mail({msgs:['g'],mailed:D(1),start:'2026-10-20T20:00',files:[f('gone')]});const cx=mail({msgs:['c'],mailed:D(1),start:'2026-11-04T20:00',files:[f('cx')],cancelled:true});
 const p=offlinePlan([soon,later,past,gone,cx],now);
 assert.deepEqual(p.fetch.map(x=>x.id),['new']);assert.deepEqual(p.keep.map(x=>x.id).sort(),['cx','far','new','past']);});
test('sign out clears this account from the phone (the text size setting stays)',()=>{
 assert.deepEqual(personalKeys(['gate:v11:123','gate:hidden:123','gate:names:123','gate:kept-try:123','unstage:size','other']),['gate:v11:123','gate:hidden:123','gate:names:123','gate:kept-try:123']);});
import {parseTicketSms,matchSms} from '@/lib/sms';
test('a ticket by SMS: the link and its number are read, and it joins the right order (209803927955490 → 20980-39279-55490)',()=>{
 const s=parseTicketSms('מצורפים הכרטיסים שהזמנת\n להקרנת הסרט: טארה סטרונג - מאסטרקלאס, \nניתן לגשת ישירות לכניסה לאולם.\nצפייה מהנה! סינמטק ירושלים. https://prestickets.com/jer-cin/3c603657-1dcb-4c2d-b007-e37c98a21729/?id=209803927955490')!;
 assert.equal(s.url,'https://prestickets.com/jer-cin/3c603657-1dcb-4c2d-b007-e37c98a21729/?id=209803927955490');assert.equal(s.ref,'209803927955490');assert.equal(s.title,'טארה סטרונג - מאסטרקלאס');
 const tara=mail({msgs:['j1'],mailed:D(1),title:'טארה סטרונג - מאסטרקלאס',start:'2026-11-03T17:00',order:'16320-39278-74340',seats:['שורה 1, כיסא 5']});
 const tara2=mail({msgs:['j2'],mailed:D(1),title:'טארה סטרונג - מאסטרקלאס',start:'2026-11-03T17:00',order:'20980-39279-55490',seats:['שורה 1, כיסא 2']});
 const ev=mergeAll([],[tara,tara2]);const m=matchSms([...ev,two],s);assert.equal(m?.event.title,'טארה סטרונג - מאסטרקלאס');assert.equal(m?.order,'20980-39279-55490');
 assert.equal(parseTicketSms('קוד האימות שלך הוא 1234'),null);assert.equal(parseTicketSms('כרטיס http://127.0.0.1/x'),null);});
test('an SMS ticket for an order replaces that order\'s old file, and a later scan keeps it that way',()=>{
 const t={...mergeAll([],[two])[0]};const sms={msg:'sms'+D(3),id:'k_abcdefghijklmnop',name:'כרטיס.html',type:'text/html',size:10,at:D(3),order:'A100'};
 const withSms={...t,files:[...t.files.map(f=>({...f,stale:true})),sms]};
 const again=mergeAll([withSms],[mail({msgs:['m1'],mailed:D(1),order:'A100',seats:['שורה 5, כיסא 12','שורה 5, כיסא 13'],files:[pdf('m1','f1')]})])[0];
 assert.deepEqual(current(again).map(f=>f.id),['k_abcdefghijklmnop']);});
