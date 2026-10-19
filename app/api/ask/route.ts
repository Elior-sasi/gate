import {NextRequest} from 'next/server';
import {pushIdentity} from '@/lib/identity';
import {gemini} from '@/lib/gemini';
export const runtime='nodejs';export const maxDuration=40;
// "שאל את Unstage": free questions about the user's own events, answered by Gemini from the list the app sends (nothing is stored).
const H={'Cache-Control':'no-store'};
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'forbidden'},{status:403,headers:H});
 try{await pushIdentity(req);}catch{return Response.json({error:'auth'},{status:401,headers:H});}
 const b=await req.json().catch(()=>({}));const q=String(b.q||'').slice(0,400).trim();if(!q)return Response.json({error:'empty'},{status:400,headers:H});
 const data=String(b.data||'').slice(0,24000);const hist=(Array.isArray(b.history)?b.history:[]).slice(-10) as {role?:string;text?:string}[];
 const today=new Date().toLocaleDateString('he-IL',{timeZone:'Asia/Jerusalem',weekday:'long',day:'numeric',month:'numeric',year:'numeric'});
 const sys=`אתה העוזר של Unstage, אפליקציה שמסדרת כרטיסים להופעות, הצגות, סרטים והרצאות. היום ${today}. ענה בעברית, קצר וברור (עד 4 משפטים), בלי טבלאות ובלי כוכביות, כי התשובה עשויה להיות מוקראת בקול.
עובדות על האירועים (תאריכים, שעות, מקומות, כיסאות, מחירים) - רק מהרשימה שלמטה. אם משהו לא שם, אמור שאין לך מידע על זה, ואל תמציא.
מותר לחשב מהרשימה (כמה אירועים, כמה הוצאתי, כמה ימים נשארו) ולתת עצות כלליות (מתי לצאת, חניה ליד מקומות מוכרים בישראל) כשמבקשים.
סכומים בשקלים. השעות הן שעון ישראל.
רשימת האירועים (שורה לכל אירוע):
${data}`;
 const contents=[...hist.filter(h=>h.text).map(h=>({role:h.role==='model'?'model':'user',parts:[{text:String(h.text).slice(0,800)}]})),{role:'user',parts:[{text:q}]}];
 const g=await gemini({contents,systemInstruction:{parts:[{text:sys}]},generationConfig:{temperature:0.2,maxOutputTokens:600}},30000);
 if(!g.ok)return Response.json({error:g.status===429?'busy':'fail'},{status:200,headers:H});
 return Response.json({answer:g.text.replace(/\*\*/g,'').trim()},{headers:H});}
