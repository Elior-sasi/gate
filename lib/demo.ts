import type {Ticket} from '@/lib/tickets';
// Sample tickets for the local preview only (GATE_DEMO=1).
const day=(n:number,t?:string)=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+(t?'T'+t:'');};
const base={msgs:['m1'],thread:'t1',links:[],mailed:Date.now(),ai:true};
export function demo(){const tickets:Ticket[]=[
 {...base,key:'a',title:'שלמה ארצי - מופע 50 שנה',kind:'concert',start:day(3,'21:00'),doors:'19:30',venue:'היכל מנורה מבטחים',address:'יגאל אלון 51',city:'תל אביב',seats:['גוש 12, שורה 7, כיסא 14','גוש 12, שורה 7, כיסא 15'],count:2,order:'LN-884512',provider:'לאן',price:'₪ 796',files:[{msg:'m1',id:'aaaaaaaaaaaa',name:'tickets.pdf',type:'application/pdf',size:90000}]},
 {...base,key:'b',title:'דיונה: חלק שלישי',kind:'movie',start:day(0,'22:15'),venue:'סינמה סיטי גלילות',city:'רמת השרון',seats:['שורה 9, כיסא 6'],provider:'סינמה סיטי',files:[{msg:'m1',id:'bbbbbbbbbbbb',name:'',type:'image/png',size:8000}]},
 {...base,key:'c',title:'המלט',kind:'show',start:day(11,'20:30'),venue:'תיאטרון הבימה',city:'תל אביב',seats:['אולם רובינא, שורה 4, כיסא 21'],provider:'הבימה',files:[]},
 {...base,key:'d',title:'מכבי תל אביב נגד ריאל מדריד',kind:'sport',start:day(24,'21:05'),venue:'היכל מנורה מבטחים',city:'תל אביב',seats:[],count:1,provider:'Eventim',files:[]},
 {...base,key:'e',title:'Infected Mushroom',kind:'concert',start:day(-20,'23:00'),venue:'בארבי',city:'תל אביב',seats:['עמידה'],provider:'Barby',files:[]},
 {...base,key:'f',title:'שחר חסון - חדש',kind:'standup',start:day(-48,'21:30'),venue:'צוותא',city:'תל אביב',seats:['שורה 3, כיסא 2'],provider:'צוותא',files:[]}];
 return {tickets,read:[],updated:new Date().toISOString()};}
