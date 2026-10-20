// How to cancel tickets, per seller (by the sender's domain). Checked against each seller's own site or terms, October 2026.
// The mail's own wording comes first; this fills in when the mail says nothing. hours = how long before the start cancelling closes.
import type {Ticket} from '@/lib/tickets';
export type Cancel={name:string;note:string;url?:string;label?:string;tel?:string;mail?:string;wa?:string;hours?:number};
const S:[RegExp,Cancel][]=[
 [/cinema-city\.co\.il$/,{name:'סינמה סיטי',note:'ביטול באזור האישי באתר עד 3 שעות לפני הסרט, בלי דמי ביטול. הזמנה ששולמה בכרטיס דיירקט או דרך גוף אחר מבטלים מול מי שהזמנתם דרכו.',url:'https://www.cinema-city.co.il/my-account',label:'ביטול באזור האישי',hours:3}],
 [/jer-cin\.(?:co|org)\.il$|jff\.org\.il$/,{name:'סינמטק ירושלים',note:'ביטול בטלפון לקופה עד 24 שעות לפני ההקרנה. כרטיסים ששולמו בכרטיס דיירקט אי אפשר לבטל, רק להחליף בקופה להקרנה אחרת.',tel:'*9377',url:'https://jer-cin.org.il/he/%D7%9E%D7%90%D7%9E%D7%A8/4187',label:'תקנון הביטולים',hours:24}],
 [/planetcinema\.co\.il$|yesplanet\.co\.il$|rav-hen\.co\.il$/,{name:'פלאנט',note:'ביטול בעמוד ניהול הזמנה באתר או באפליקציה, עד 6 שעות לפני ההקרנה, בכפוף לדמי ביטול.',url:'https://cancel.planetcinema.co.il/mma',label:'ניהול הזמנה',hours:6}],
 [/lev\.co\.il$/,{name:'קולנוע לב',note:'ההזמנות מנוהלות באזור האישי באתר.',url:'https://www.lev.co.il/userarea/',label:'ניהול הזמנה'}],
 [/leaan\.co\.il$/,{name:'לאן',note:'עד 7 ימי עסקים לפני האירוע, בוואטסאפ או במייל. דמי ביטול: 5% או 100 ₪, הנמוך מביניהם.',url:'https://www.leaan.co.il/content/%D7%91%D7%99%D7%98%D7%95%D7%9C-%D7%A2%D7%A1%D7%A7%D7%94',label:'ביטול עסקה',wa:'972503002526',mail:'support@leaan.co.il'}],
 [/eventim\.co\.il$/,{name:'איוונטים',note:'ביטול בטופס ביטול עסקה של איוונטים.',url:'https://www.eventim.co.il/obj/media/IL-eventim/pdf/iw/eventim-shaket-cancelation-new301016.pdf',label:'טופס ביטול עסקה'}],
 [/ticketmaster\.co\.il$/,{name:'טיקטמאסטר',note:'באתר: החשבון שלי, הכרטיסים שלי, ובחירת ההזמנה. אפשר לבטל רק את כל ההזמנה. בעיות: 9964*.',url:'https://help.ticketmaster.co.il/hc/he/articles/45109561617681',label:'איך מבטלים',tel:'*9964'}],
 [/go-out\.co$/,{name:'GO-OUT',note:'טופס בקשת החזר של GO-OUT: עד 14 יום מהרכישה ולפחות 7 ימים שאינם ימי מנוחה לפני האירוע. ההפקה מאשרת או דוחה, והאישור מגיע ב-SMS.',url:'https://www.go-out.co/requestrefund',label:'טופס בקשת החזר'}],
 [/eventer\.co\.il$/,{name:'Eventer',note:'ביטול בטופס ביטול ההזמנה של Eventer.',url:'https://www.eventer.co.il/orderCancellation',label:'טופס ביטול הזמנה'}],
 [/zappa-club\.co\.il$/,{name:'זאפה',note:'תנאי הביטול בתקנון של זאפה.',url:'https://www.zappa-club.co.il/help/terms/',label:'תקנון'}]];
// Israeli consumer law for tickets bought online or by phone (המועצה הישראלית לצרכנות).
export const LAW:Cancel={name:'',note:'לפי חוק הגנת הצרכן: עד 14 יום מהרכישה, ולפחות 7 ימים שאינם ימי מנוחה לפני האירוע. דמי ביטול: עד 5% או 100 ₪, הנמוך מביניהם.',url:'https://www.consumers.org.il/category/cancel_events',label:'הזכויות שלך'};
export function sellerCancel(t:Ticket):Cancel|null{const d=(t.seller||'').toLowerCase();if(!d)return null;for(const [re,c] of S)if(re.test(d))return c;return null;}
// Phone numbers and e-mail addresses written in the cancellation terms, so they can be tapped.
export function contacts(text:string){const mail=text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];const tel=text.match(/\*\d{4}\b|\b0\d{1,2}-?\d{7}\b/)?.[0];return {mail,tel};}
