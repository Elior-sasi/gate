import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presApi,presTicket} from '@/lib/pres';
import {withSms,current,mergeAll} from '@/lib/combine';
import type {Ticket} from '@/lib/tickets';
const T=(o:object)=>({reservationIdentifier:'209803927955490',reservationIdentifierFormatted:'20980-39279-55490',featureName:'טארה סטרונג - מאסטרקלאס',venueName:'סינמטק 2',locationHeader1:'סינמטק ירושלים',
 locationSubheader1:'דרך חברון 11,ירושלים',presentationDateTime:'2026-11-03 17:00:00',isReserved:true,row:'1',...o});
test('pres.global links map to their data address',()=>{
 assert.equal(presApi('https://prestickets.com/jer-cin/3c603657-1dcb-4c2d-b007-e37c98a21729/?id=209803927955490'),'https://jer-cin.pres.global/api/edocument/3c603657-1dcb-4c2d-b007-e37c98a21729?id=209803927955490');
 assert.equal(presApi('https://jer-cin.pres.global/edocument/3c603657-1dcb-4c2d-b007-e37c98a21729/?id=209803927955490'),'https://jer-cin.pres.global/api/edocument/3c603657-1dcb-4c2d-b007-e37c98a21729?id=209803927955490');
 assert.equal(presApi('https://tickets.cinema-city.co.il/edocument/d08b133e-e19e-4285-a390-14a3652c8e6f/?id=864134394615752'),'https://tickets.cinema-city.co.il/api/edocument/d08b133e-e19e-4285-a390-14a3652c8e6f?id=864134394615752');
 assert.equal(presApi('https://example.com/jer-cin/3c603657-1dcb-4c2d-b007-e37c98a21729/?id=209803927955490'),null);});
test('a pres.global ticket is drawn with a QR per ticket, and its seats replace the order\'s',async()=>{
 const real=globalThis.fetch;globalThis.fetch=(async()=>new Response(JSON.stringify({document:{reservationIsCancelled:false,tickets:[T({seat:'3',displayName:'רגיל',amount:43,barcode:'6781150189034020013-1.433407'}),T({seat:'4',displayName:'נכה',amount:38,barcode:'3959450189006030014-1.433408'})]}}),{headers:{'content-type':'application/json'}})) as typeof fetch;
 try{const r=await presTicket('https://prestickets.com/jer-cin/3c603657-1dcb-4c2d-b007-e37c98a21729/?id=209803927955490');assert.ok(r);
  assert.deepEqual(r.info.seats,['שורה 1, כיסא 3','שורה 1, כיסא 4']);assert.equal(r.info.count,2);assert.equal(r.info.start,'2026-11-03T17:00');assert.equal(r.info.price,'₪ 81');
  assert.equal((r.svg.match(/<svg/g)||[]).length,3);assert.ok(!/<script/i.test(r.svg));
  const t:Ticket={key:'k',msgs:['a'],thread:'a',title:'טארה סטרונג',kind:'other',start:'2026-11-03T17:00',seats:['שורה 1, כיסא 2'],count:1,order:'20980-39279-55490',mailed:1,links:[],
   files:[{msg:'a',id:'f1',name:'t.pdf',type:'application/pdf',size:1,at:1,order:'20980-39279-55490'},{msg:'sms5',id:'k_x',name:'כרטיס.html',type:'text/html',size:1,at:5,order:'20980-39279-55490'}]};
  const n=withSms(t,'m:sms5',5,r.info);assert.deepEqual(n.seats,['שורה 1, כיסא 3','שורה 1, כיסא 4']);assert.equal(n.count,2);assert.deepEqual(current(n).map(f=>f.id),['k_x']);
 }finally{globalThis.fetch=real;}});
test('tickets exchanged at the box office into the SMS order are not counted twice',()=>{
 const mk=(msg:string,order:string,seats:string[],count:number,mailed:number):Ticket=>({key:'k'+msg,msgs:[msg],thread:'th',title:'טארה סטרונג - מאסטרקלאס',kind:'movie',start:'2026-11-03T17:00',seats,count,order,price:'₪ '+43*count,mailed,links:[],
  files:[{msg,id:'f'+msg,name:'p.pdf',type:'application/pdf',size:1,at:mailed,order}]});
 const [t]=mergeAll([],[mk('a','16320-39278-74340',['שורה 1, כיסא 5','שורה 1, כיסא 6'],2,1),mk('b','20980-39279-55490',['שורה 1, כיסא 2'],1,2),mk('c','55310-39279-82909',['שורה 1, כיסא 10'],1,3)]);
 const f={msg:'sms9',id:'k_x',name:'כרטיס.html',type:'text/html',size:1,at:9,order:'20980-39279-55490'};
 const n=withSms({...t,files:[...t.files,f]},'m:sms9',9,{order:'20980-39279-55490',seats:['שורה 1, כיסא 3','שורה 1, כיסא 4'],count:2});
 assert.deepEqual(n.seats,['שורה 1, כיסא 3','שורה 1, כיסא 4','שורה 1, כיסא 5','שורה 1, כיסא 6']);assert.equal(n.count,4);assert.deepEqual(current(n).map(f=>f.id).sort(),['fa','k_x']);
 const again=mergeAll([n],[mk('c','55310-39279-82909',['שורה 1, כיסא 10'],1,3),mk('b','20980-39279-55490',['שורה 1, כיסא 2'],1,2)])[0];
 assert.equal(again.count,4);assert.deepEqual(current(again).map(f=>f.id).sort(),['fa','k_x']);});
