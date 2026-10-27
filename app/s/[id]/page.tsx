import type {Metadata} from 'next';
import {getShare} from '@/lib/share';
import {dbOn} from '@/lib/push';
import {navQuery,navLinks} from '@/lib/place';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'כרטיס - Unstage',robots:{index:false,follow:false}};
const KIND:Record<string,string>={concert:'הופעה',show:'הצגה',movie:'סרט',lecture:'הרצאה',sport:'משחק',festival:'פסטיבל',standup:'סטנדאפ',party:'מסיבה',con:'כנס',other:'אירוע'};
const DAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];const MONTHS=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const longDate=(s:string)=>{const [y,m,d]=s.slice(0,10).split('-').map(Number);const dt=new Date(Date.UTC(y,m-1,d));return 'יום '+DAYS[dt.getUTCDay()]+', '+d+' ב'+MONTHS[m-1];};
const bidi=(s:string)=>s.replace(/[A-Za-z0-9][A-Za-z0-9 .\/()+&'":,!?–—-]*[A-Za-z0-9)!?]/g,m=>'⁦'+m+'⁩');
// The page the person a ticket was bought for opens: just this event, its seats and the ticket files.
export default async function Shared({params}:{params:Promise<{id:string}>}){const {id}=await params;
 const s=dbOn()||id==='demo'?await getShare(id).catch(()=>null):null;const live=!!s&&s.expires.getTime()>Date.now()&&!!s.refresh;
 const brand=<header className="top"><div className="row"><span className="brand" dir="ltr" aria-label="Unstage"><img src="/logo.svg" alt="" width={34} height={34} style={{borderRadius:9}}/><span aria-hidden="true">nstage</span></span></div></header>;
 if(!s||!live)return <main className="app">{brand}<section className="panel empty"><h2>הקישור כבר לא בתוקף</h2><p>הקישור לכרטיס פג אחרי האירוע, או שמי ששלח אותו ביטל אותו. אפשר לבקש ממנו לשלוח שוב.</p></section></main>;
 const t=s.data;const time=t.start.split('T')[1]||'';const place=[t.venue,t.city].filter(Boolean).join(', ');const nav=navLinks(navQuery(t));
 const docs=t.files.map((f,i)=>({f,i})).filter(x=>!/pkpass/i.test(x.f.type+x.f.name));const pass=t.files.map((f,i)=>({f,i})).filter(x=>/pkpass/i.test(x.f.type+x.f.name));
 const url=(i:number)=>'/api/share-file?s='+id+'&i='+i;
 return <main className="app">
  <header className="top"><div className="row"><span className="brand" dir="ltr" aria-label="Unstage"><img src="/logo.svg" alt="" width={34} height={34} style={{borderRadius:9}}/><span aria-hidden="true">nstage</span></span></div>
   <p className="sub">{t.from?t.from+' שלח/ה לך '+(t.count>1?t.count+' כרטיסים':'כרטיס'):'נשלח אליך '+(t.count>1?t.count+' כרטיסים':'כרטיס')}</p></header>
  <div className="stub"><div className="k">{KIND[t.kind]||'אירוע'}</div><h2>{bidi(t.title)}</h2>
   <div className="when"><div><span>תאריך</span><b>{longDate(t.start)}</b></div>{time&&<div><span>שעה</span><b>{time}</b></div>}{t.doors&&<div><span>דלתות</span><b>{t.doors}</b></div>}</div>
   <div className="perf"/><div className="cd"><b>{t.count}</b><span>{t.count>1?'כרטיסים':'כרטיס'}</span></div></div>
  {(docs.length>0||t.links.length>0||pass.length>0)&&<div className="box"><h3>{t.count>1?'הכרטיסים':'הכרטיס'}</h3><div className="files">
   {docs.map(({f,i},n)=><a key={i} className="file" href={url(i)} target="_blank" rel="noopener"><span>{/image/.test(f.type)?'ברקוד':'כרטיס'}{docs.length>1?' '+(n+1):''}</span></a>)}
   {pass.map(({i})=><a key={i} className="file" href={url(i)}><span>הוספה ל-Wallet</span></a>)}
   {!docs.length&&t.links.map(l=><a key={l.url} className="file" href={l.url} target="_blank" rel="noopener noreferrer"><span>{l.label}</span></a>)}</div></div>}
  {t.seats.length>0&&<div className="box"><h3>{t.seats.length>1?t.seats.length+' מקומות':'המקום'}</h3><ul className="seats">{t.seats.map((x,i)=><li key={x}><i>{i+1}</i>{bidi(x)}</li>)}</ul></div>}
  {place&&<div className="box"><h3>מקום</h3><p className="place">{bidi(place)}</p>{t.address&&<p className="addr">{t.address}</p>}
   <div className="navLinks"><a className="ghost" href={nav.google} target="_blank" rel="noopener noreferrer">Google Maps</a><a className="ghost" href={nav.moovit} target="_blank" rel="noopener noreferrer">Moovit</a><a className="ghost" href={nav.waze} target="_blank" rel="noopener noreferrer">Waze</a></div></div>}
  <p className="footnote">הקישור אישי ויפסיק לעבוד אחרי האירוע. נשלח דרך <a href="/" style={{color:'inherit'}}>Unstage</a>.</p>
 </main>;}
