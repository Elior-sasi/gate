import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localAnswer} from '@/lib/answer';
import type {Ticket} from '@/lib/tickets';
const mk=(title:string,kind:Ticket['kind'],start:string,seats:string[]=[]):Ticket=>({key:title,msgs:[],thread:'',title,kind,start,venue:'היכל מנורה',seats,files:[],links:[],mailed:0});
const list=[mk('עבר','concert','2026-10-01T20:00',['שורה 9, כיסא 1']),mk('טארה סטרונג - מאסטרקלאס','lecture','2026-11-03T17:00',['שורה 1, כיסא 3']),mk('נועה קירל','concert','2026-11-20T21:00',['שורה 12, כיסא 7','שורה 12, כיסא 8'])];
const now=new Date(2026,9,20,20,0);
test('local answers',()=>{
 assert.match(localAnswer('באיזה שורה אני יושב בהופעה הבאה?',list,now)!,/נועה קירל.*שורה 12, כיסא 7/);
 assert.match(localAnswer('מתי טארה?',list,now)!,/3 בנובמבר בשעה 17:00/);
 assert.match(localAnswer('מה האירוע הבא?',list,now)!,/טארה/);
 assert.equal(localAnswer('תמליץ לי על מסעדה',list,now),null);});
