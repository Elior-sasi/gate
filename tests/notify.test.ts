import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ilMoment,reminders,mark} from '@/lib/notify';
import {lines} from '@/lib/widget';
const T=(start:string,extra={})=>({key:'k1',msgs:['m'],thread:'t',title:'האי הנעלם',kind:'movie' as const,start,venue:'סינמה סיטי ירושלים',seats:[],files:[{msg:'m',id:'a',name:'t.pdf',type:'application/pdf',size:1}],links:[],mailed:0,...extra});
test('Israel local time becomes the right moment (summer and winter)',()=>{
 assert.equal(new Date(ilMoment('2026-08-10T20:30')).toISOString(),'2026-08-10T17:30:00.000Z');
 assert.equal(new Date(ilMoment('2026-12-10T20:30')).toISOString(),'2026-12-10T18:30:00.000Z');});
test('evening-before and hours-before reminders, once each',()=>{
 const t=T('2026-11-03T17:00');
 const eve=Date.parse('2026-11-02T17:00:00Z'); // 19:00 in Israel, the day before
 const r1=reminders([t],{},[],eve);assert.equal(r1.length,1);assert.match(r1[0].title,/^מחר: /);
 assert.equal(reminders([t],mark({},r1[0]),[],eve).length,0);
 const soon=Date.parse('2026-11-03T13:00:00Z'); // 15:00 Israel, two hours before
 const r2=reminders([t],mark({},r1[0]),[],soon);assert.equal(r2.length,1);assert.match(r2[0].title,/^בעוד 2 שעות: /);assert.match(r2[0].body,/הכרטיס מוכן/);
 assert.equal(reminders([t],{},['k1'],soon).length,0);
 assert.equal(reminders([{...t,cancelled:true}],{},[],soon).length,0);});
test('widget shows the next event first',()=>{const now=Date.parse('2026-11-02T10:00:00Z');const L=lines([T('2026-11-03T17:00'),T('2026-11-20T20:00',{key:'k2',title:'המלט'})],[],now);
 assert.equal(L[0].t,'מחר 17:00');assert.equal(L[1].t,'האי הנעלם');assert.match(L.at(-1)!.t,/המלט/);});
