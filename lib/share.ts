// "שלח למישהו": a personal link to some or all of an event's tickets, for the person they were bought for.
// It shows only that event, needs no sign-in, and stops working a day after the event.
import {randomBytes} from 'node:crypto';
import {db} from '@/lib/push';
import {ilMoment} from '@/lib/notify';
export type Shared={title:string;kind:string;start:string;venue?:string;city?:string;address?:string;doors?:string;seats:string[];count:number;
 files:{msg:string;id:string;name:string;type:string}[];links:{label:string;url:string}[];from?:string};
export const newId=()=>randomBytes(12).toString('base64url');
export const expiry=(start:string)=>new Date(ilMoment(start)+(start.includes('T')?24:36)*36e5);
export async function getShare(id:string){
 // Local preview only (GATE_DEMO=1): a sample shared ticket at /s/demo.
 if(id==='demo'&&process.env.NODE_ENV!=='production'&&process.env.GATE_DEMO==='1')return {user:'demo',expires:new Date(Date.now()+864e5*3),refresh:'x',data:{title:'שלמה ארצי - מופע 50 שנה',kind:'concert',start:new Date(Date.now()+864e5*3).toISOString().slice(0,10)+'T21:00',venue:'היכל מנורה מבטחים',city:'תל אביב',address:'יגאל אלון 51',doors:'19:30',seats:['גוש 12, שורה 7, כיסא 14'],count:1,files:[{msg:'m1',id:'aaaaaaaaaaaa',name:'tickets.pdf',type:'application/pdf'}],links:[],from:'אליאור'} as Shared};
 if(!/^[\w-]{16}$/.test(id))return null;const {sql,ready}=db();await ready;
 const row=(await sql`select s.user_id,s.data,s.expires,u.refresh from gate_shares s left join gate_users u on u.user_id=s.user_id where s.id=${id}`)[0];
 if(!row)return null;return {user:String(row.user_id),data:row.data as Shared,expires:new Date(row.expires as string),refresh:String(row.refresh||'')};}
