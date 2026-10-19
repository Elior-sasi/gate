import {GmailError} from '@/lib/gmail';
// One Hebrew message per failure, shared by the routes.
const TEXT:Record<string,string>={
 UNAUTHORIZED:'יש להיכנס עם Google',
 NO_GMAIL:'נכנסת עם Google, אבל לא אישרת קריאת Gmail. לחץ "חידוש הרשאה" וסמן את תיבת Gmail.',
 RECONNECT:'ההרשאה ל-Gmail פגה. לחץ "חידוש הרשאה".',
 GMAIL_API_DISABLED:'Gmail API כבויה בפרויקט Google Cloud. יש להפעיל אותה ולנסות שוב.',
 RATE:'Google הגבילה זמנית את הסריקה. נסה שוב בעוד דקה.'};
export function fail(e:unknown){const code=e instanceof Error?e.message:'';
 if(!(e instanceof GmailError)&&!TEXT[code])console.error('route error',e instanceof Error?e.name+': '+e.message:e);
 const status=code==='UNAUTHORIZED'?401:['NO_GMAIL','RECONNECT','GMAIL_API_DISABLED'].includes(code)?403:code==='RATE'?429:502;
 return Response.json({error:TEXT[code]||'הסריקה לא הושלמה. נסה שוב.',code},{status,headers:{'Cache-Control':'no-store'}});}
