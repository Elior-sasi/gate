import {NextRequest} from 'next/server';
import {pushIdentity} from '@/lib/identity';
import {gemini} from '@/lib/gemini';
export const dynamic='force-dynamic';export const maxDuration=40;
const H={'Cache-Control':'no-store'};
// Fills in the form from the ticket picture (name, date, time, place, seats). Nothing is kept; the user checks and fixes it.
export async function POST(req:NextRequest){if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'forbidden'},{status:403,headers:H});
 try{await pushIdentity(req);}catch{return Response.json({error:'auth'},{status:401,headers:H});}
 const b=await req.json().catch(()=>({}));const data=String(b.data||'');const type=String(b.type||'');
 if(!data||data.length>5_000_000||!/^(image\/(png|jpe?g|webp|gif)|application\/pdf)$/.test(type))return Response.json({error:'bad'},{status:400,headers:H});
 const year=new Date().getFullYear();
 const prompt=`זו תמונה או קובץ של כרטיס לאירוע (הופעה, הצגה, סרט, הרצאה, משחק, מסיבה). החזר JSON בלבד:
{"title":"שם האירוע או האמן","date":"YYYY-MM-DD","time":"HH:MM","venue":"המקום והעיר","kind":"concert|show|movie|lecture|sport|festival|standup|party|other","count":מספר הכרטיסים,"seats":["שורה X, כיסא Y"]}
שדה שלא מופיע - השאר ריק (או [] למקומות). שנה חסרה: ${year} או ${year+1}, לפי מה שעוד לא עבר. אל תמציא.`;
 const g=await gemini({contents:[{role:'user',parts:[{inlineData:{mimeType:type,data}},{text:prompt}]}],generationConfig:{temperature:0,responseMimeType:'application/json',maxOutputTokens:500}},30000);
 if(!g.ok)return Response.json({error:g.status===429?'busy':'fail'},{headers:H});
 let j:Record<string,unknown>={};try{j=JSON.parse(g.text.replace(/^```(?:json)?|```$/g,'').trim());}catch{return Response.json({error:'fail'},{headers:H});}
 const s=(v:unknown,re?:RegExp)=>typeof v==='string'&&(!re||re.test(v))?v.trim():'';
 return Response.json({title:s(j.title).slice(0,120),date:s(j.date,/^\d{4}-\d{2}-\d{2}$/),time:s(j.time,/^\d{2}:\d{2}$/),venue:s(j.venue).slice(0,120),kind:s(j.kind,/^(concert|show|movie|lecture|sport|festival|standup|party|other)$/)||'',
  count:Number.isInteger(j.count)&&(j.count as number)>0&&(j.count as number)<=40?j.count:0,seats:Array.isArray(j.seats)?(j.seats as unknown[]).filter(x=>typeof x==='string').slice(0,40):[]},{headers:H});}
