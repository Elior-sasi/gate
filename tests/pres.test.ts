import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presApi,presTicket} from '@/lib/pres';
import {withSms,current} from '@/lib/combine';
import type {Ticket} from '@/lib/tickets';
const T=(o:object)=>({reservationIdentifier:'209803927955490',reservationIdentifierFormatted:'20980-39279-55490',featureName:'טארה סטרונג - מאסטרקלאס',venueName:'סינמטק 2',locationHeader1:'סינמטק ירושלים',
 locationSubheader1:'דרך חברון 11,ירושלים',presentationDateTime:'2026-11-03 17:00:00',isReserved:true,row:'1',...o});
test('pres.global links map to their data address',()=>{
 assert.equal(presApi('https://prestickets.com/jer-cin/3c603657-1dcb-4c2d-b007-e37c98a21729/?id=209803927955490'),'https://jer-cin.pres.global/api/edocument/3c603657-1dcb-4c2d-b007-e37c98a21729?id=209803927955490');
 assert.equal(presApi('https://jer-cin.pres.global/edocument/3c603657-1dcb-4c2d-b007-e37c98a21729/?id=209803927955490'),'https://jer-cin.pres.global/api/edocument/3c603657-1dcb-4c2d-b007-e37c98a21729?id=209803927955490');
 assert.equal(presApi('https://example.com/jer-cin/3c603657-1dcb-4c2d-b007-e37c98a21729/?id=209803927955490'),null);});
test('a pres.global ticket is drawn with a QR per ticket, and its seats replace the order\'s',async()=>{
 const real=globalThis.fetch;globalThis.fetch=(async()=>new Response(JSON.stringify({document:{reservationIsCancelled:false,tickets:[T({seat:'3',displayName:'רגיל',amount:43,barcode:'6781150189034020013-1.433407'}),T({seat:'4',displayName:'נכה',amount:38,barcode:'3959450189006030014-1.433408'})]}}),{headers:{'content-type':'application/json'}})) as typeof fetch;
 try{const r=await presTicket('https://prestickets.com/jer-cin/3c603657-1dcb-4c2d-b007-e37c98a21729/?id=209803927955490');assert.ok(r);
  assert.deepEqual(r.info.seats,['שורה 1, כיסא 3','שורה 1, כיסא 4']);assert.equal(r.info.count,2);assert.equal(r.info.start,'2026-11-03T17:00');assert.equal(r.info.price,'₪ 81');
  assert.equal((r.html.match(/<svg/g)||[]).length,3);assert.ok(!/<script/i.test(r.html));
  const t:Ticket={key:'k',msgs:['a'],thread:'a',title:'טארה סטרונג',kind:'other',start:'2026-11-03T17:00',seats:['שורה 1, כיסא 2'],count:1,order:'20980-39279-55490',mailed:1,links:[],
   files:[{msg:'a',id:'f1',name:'t.pdf',type:'application/pdf',size:1,at:1,order:'20980-39279-55490'},{msg:'sms5',id:'k_x',name:'כרטיס.html',type:'text/html',size:1,at:5,order:'20980-39279-55490'}]};
  const n=withSms(t,'m:sms5',5,r.info);assert.deepEqual(n.seats,['שורה 1, כיסא 3','שורה 1, כיסא 4']);assert.equal(n.count,2);assert.deepEqual(current(n).map(f=>f.id),['k_x']);
 }finally{globalThis.fetch=real;}});
