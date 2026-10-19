'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {signOut} from 'next-auth/react';
import {Ticket as TicketIcon,CalendarDays,History,Settings,RefreshCw,Search,MapPin,Clock,Navigation,Map as MapIcon,CalendarPlus,Mail,Copy,ChevronRight,FileText,QrCode,Wallet,ExternalLink,Music,Drama,Clapperboard,Trophy,PartyPopper,Mic,Armchair,EyeOff,DoorOpen,LogOut,RotateCcw,Users} from 'lucide-react';
import type {Ticket,Kind,TFile} from '@/lib/tickets';
type User={id:string;name:string;email:string};
type Store={tickets:Ticket[];read:string[];updated:string};
const KIND:Record<Kind,{label:string;Icon:typeof Music}>={concert:{label:'הופעה',Icon:Music},show:{label:'הצגה',Icon:Drama},movie:{label:'סרט',Icon:Clapperboard},sport:{label:'ספורט',Icon:Trophy},festival:{label:'פסטיבל',Icon:PartyPopper},standup:{label:'סטנדאפ',Icon:Mic},other:{label:'אירוע',Icon:TicketIcon}};
const DAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];const DAY_SHORT=["א'","ב'","ג'","ד'","ה'","ו'",'שבת'];
const MONTHS=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const MON_SHORT=['ינו׳','פבר׳','מרץ','אפר׳','מאי','יוני','יולי','אוג׳','ספט׳','אוק׳','נוב׳','דצמ׳'];
// "2026-11-03T20:30" is the time at the venue (Israel), read as local time on the phone.
const when=(t:Ticket)=>{const [d,h]=t.start.split('T');const [y,m,dd]=d.split('-').map(Number);const [hh,mm]=(h||'').split(':').map(Number);return new Date(y,m-1,dd,h?hh:0,h?mm:0);};
const timed=(t:Ticket)=>t.start.includes('T');
const time=(t:Ticket)=>t.start.split('T')[1]||'';
const dayStart=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
const daysTo=(t:Ticket)=>Math.round((dayStart(when(t))-dayStart(new Date()))/864e5);
const upcoming=(t:Ticket)=>daysTo(t)>=0;
const longDate=(t:Ticket)=>{const d=when(t);return 'יום '+DAYS[d.getDay()]+', '+d.getDate()+' ב'+MONTHS[d.getMonth()]+(d.getFullYear()!==new Date().getFullYear()?' '+d.getFullYear():'');};
function countdown(t:Ticket):[string,string]{const n=daysTo(t);
 if(n<0)return [String(-n),-n===1?'יום מאז':'ימים מאז'];
 if(n===0){if(timed(t)){const h=Math.round((when(t).getTime()-Date.now())/36e5);if(h>=1)return [String(h),h===1?'שעה נשארה':'שעות נשארו'];if(h>-4)return ['עכשיו',''];}return ['היום',''];}
 if(n===1)return ['מחר',timed(t)?'ב-'+time(t):''];
 return [String(n),'ימים'];}
const place=(t:Ticket)=>[t.venue,t.city].filter(Boolean).join(', ');
const where=(t:Ticket)=>[t.venue,t.address,t.city].filter(Boolean).join(', ');
const fileUrl=(f:TFile)=>'/api/file?'+new URLSearchParams({m:f.msg,a:f.id,n:f.name,t:f.type});
const fileIcon=(f:TFile)=>/pkpass/i.test(f.type+f.name)?Wallet:/image/.test(f.type)?QrCode:FileText;
const fileLabel=(f:TFile,i:number,n:number)=>/pkpass/i.test(f.type+f.name)?'הוספה ל-Wallet':/image/.test(f.type)?'ברקוד'+(n>1?' '+(i+1):''):'כרטיס'+(n>1?' '+(i+1):'');
const bidi=(s:string)=>s.replace(/[A-Za-z0-9][A-Za-z0-9 .\/()+&'":-]*[A-Za-z0-9)]/g,m=>'⁦'+m+'⁩');
const KEY=(u:string)=>'gate:v1:'+u;const HID=(u:string)=>'gate:hidden:'+u;
const load=<T,>(k:string,d:T):T=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}};
const save=(k:string,v:unknown)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
function mergeAll(a:Ticket[],b:Ticket[]){const by=new Map(a.map(t=>[t.key,t]));
 for(const t of b){const o=by.get(t.key);if(!o){by.set(t.key,t);continue;}
  by.set(t.key,{...o,...(t.ai||!o.ai?t:{}),msgs:[...new Set([...o.msgs,...t.msgs])],seats:[...new Set([...o.seats,...t.seats])],files:[...o.files,...t.files.filter(f=>!o.files.some(g=>g.id===f.id))],links:[...o.links,...t.links.filter(l=>!o.links.some(x=>x.url===l.url))],cancelled:o.cancelled||t.cancelled,mailed:Math.max(o.mailed,t.mailed)});}
 return [...by.values()];}
function addToCalendar(t:Ticket){const f=document.createElement('form');f.method='POST';f.action='/api/ics';
 const v:Record<string,string>={start:t.start,title:t.title,venue:t.venue||'',address:t.address||'',city:t.city||'',seats:t.seats.join('; '),doors:t.doors||'',order:t.order||'',provider:t.provider||'',hours:t.kind==='movie'?'2':'3'};
 for(const [k,val] of Object.entries(v)){const i=document.createElement('input');i.type='hidden';i.name=k;i.value=val;f.appendChild(i);}document.body.appendChild(f);f.submit();f.remove();}
// The G of "Gate": a gold ring whose bar is a ticket with a tear line (same idea as the U of Unbox).
function Logo(){return <svg viewBox="112 136 296 280" aria-hidden="true"><defs><linearGradient id="lg" gradientUnits="userSpaceOnUse" x1="0" y1="400" x2="0" y2="150"><stop offset="0" stopColor="#ff9f2e"/><stop offset="1" stopColor="#ffd27a"/></linearGradient><mask id="lm"><rect x="0" y="0" width="512" height="512" fill="#fff"/><circle cx="262" cy="276" r="16" fill="#000"/><circle cx="398" cy="276" r="16" fill="#000"/></mask></defs><path d="M331 201 A106 106 0 1 0 362 276" fill="none" stroke="url(#lg)" strokeWidth="58" strokeLinecap="round"/><rect x="262" y="246" width="136" height="60" rx="14" fill="#ffd27a" mask="url(#lm)"/><line x1="352" y1="256" x2="352" y2="296" stroke="var(--bg)" strokeWidth="6" strokeDasharray="3 9" strokeLinecap="round"/></svg>;}
export default function App({user,gmail,configured,login}:{user:User|null;gmail:boolean;configured:boolean;login:()=>Promise<void>}){
 const [store,setStore]=useState<Store>({tickets:[],read:[],updated:''});const [hidden,setHidden]=useState<string[]>([]);const [ready,setReady]=useState(false);
 const [tab,setTab]=useState(0);const [q,setQ]=useState('');const [open,setOpen]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);const [prog,setProg]=useState<[number,number]|null>(null);const [err,setErr]=useState('');const [toast,setToast]=useState('');
 const running=useRef(false);
 useEffect(()=>{if(!user)return;if(user.id==='demo'){import('@/lib/demo').then(d=>{setStore(d.demo());setReady(true);});return;}setStore(load(KEY(user.id),{tickets:[],read:[],updated:''}));setHidden(load(HID(user.id),[]));setReady(true);},[user]);
 const say=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),2200);};
 const scan=useCallback(async(fresh=false)=>{if(!user||running.current)return;running.current=true;setBusy(true);setErr('');
  try{const base:Store=fresh?{tickets:[],read:[],updated:''}:load(KEY(user.id),{tickets:[],read:[],updated:''});
   const r=await fetch('/api/tickets',{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'הסריקה נכשלה');
   const seen=new Set(base.read);const todo=(j.ids as string[]).filter(id=>!seen.has(id));let cur=base;setProg([0,todo.length]);
   const batches:string[][]=[];for(let i=0;i<todo.length;i+=8)batches.push(todo.slice(i,i+8));let done=0;
   const worker=async()=>{for(let b=batches.shift();b;b=batches.shift()){const res=await fetch('/api/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:b})});const d=await res.json();
     if(!res.ok){if(res.status===401||res.status===403)throw new Error(d.error);continue;}
     cur={tickets:mergeAll(cur.tickets,d.tickets),read:[...cur.read,...d.read],updated:cur.updated};setStore(cur);save(KEY(user.id),cur);done+=b.length;setProg([done,todo.length]);}};
   await Promise.all([worker(),worker(),worker()]);
   cur={...cur,updated:new Date().toISOString()};setStore(cur);save(KEY(user.id),cur);
  }catch(e){setErr(e instanceof Error?e.message:'הסריקה נכשלה');}
  finally{running.current=false;setBusy(false);setProg(null);}},[user]);
 useEffect(()=>{if(ready&&gmail&&user?.id!=='demo')scan();},[ready,gmail,scan,user]);
 const visible=useMemo(()=>{const s=q.trim().toLowerCase();return store.tickets.filter(t=>!hidden.includes(t.key)&&(!s||[t.title,t.venue,t.city,t.provider].some(x=>x?.toLowerCase().includes(s))));},[store,hidden,q]);
 const next=useMemo(()=>visible.filter(t=>upcoming(t)).sort((a,b)=>when(a).getTime()-when(b).getTime()),[visible]);
 const past=useMemo(()=>visible.filter(t=>!upcoming(t)).sort((a,b)=>when(b).getTime()-when(a).getTime()),[visible]);
 const hero=next.find(t=>!t.cancelled);
 const sel=store.tickets.find(t=>t.key===open);
 useEffect(()=>{const back=()=>setOpen(null);if(open){history.pushState({sheet:1},'');addEventListener('popstate',back);return ()=>removeEventListener('popstate',back);}},[open]);
 const close=()=>{if(history.state?.sheet)history.back();else setOpen(null);};
 const hide=(k:string)=>{if(!user)return;const h=[...hidden,k];setHidden(h);save(HID(user.id),h);close();say('האירוע הוסתר');};
 if(!configured)return <main className="app"><Header/><div className="panel"><TicketIcon size={40}/><h2>Gate עוד לא מחובר</h2><p>חסרים מפתחות Google ב-Vercel (AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET).</p></div></main>;
 if(!user)return <main className="app"><Header/><h1>הכרטיסים שלך,<br/>במקום אחד</h1><p className="sub">Gate קורא את מיילי הכרטיסים ב-Gmail ומסדר כל הופעה, הצגה וסרט בכרטיס אחד - עם התאריך, המקום, הכיסאות והברקוד לכניסה.</p>
  <form action={login}><button className="primary"><Mail size={20}/>כניסה עם Google</button></form><p className="footnote">הגישה ל-Gmail היא לקריאה בלבד. הכרטיסים נשמרים רק בטלפון שלך.</p></main>;
 const list=tab===0?next:past;
 return <main className={'app'+(sel?' detailOn':'')}>
  <Header actions={<button className="ib" onClick={()=>scan()} disabled={busy} aria-label="סריקה מחדש"><RefreshCw className={busy?'spin':''}/></button>}/>
  {!gmail&&<div className="error"><span>נכנסת עם Google, אבל לא אישרת קריאת Gmail.</span><form action={login}><button className="ghost">חידוש הרשאה</button></form></div>}
  {err&&<div className="error"><span>{err}</span><button className="ghost" onClick={()=>scan()}>נסה שוב</button></div>}
  {prog&&prog[1]>0&&<div className="progress"><div className="pbar"><i style={{width:Math.round(prog[0]/prog[1]*100)+'%'}}/></div><div className="plabel">קורא מיילים {prog[0]} מתוך {prog[1]}</div></div>}
  {tab<2&&<>
   <h1>{tab===0?'קרובים':'היו'}</h1>
   <label className="search"><Search size={20}/><span className="sr">חיפוש</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="חיפוש אירוע, מקום או מוכר"/></label>
   {tab===0&&hero&&!q&&<Hero t={hero} onOpen={()=>setOpen(hero.key)}/>}
   {(()=>{const rest=tab===0&&hero&&!q?list.filter(t=>t.key!==hero.key):list;
    if(!rest.length&&!(tab===0&&hero&&!q))return busy&&!store.tickets.length?<div className="list">{[0,1,2].map(i=><div key={i} className="card skel"><div className="c"><div className="date"/><div className="info"><i/><i/></div></div></div>)}</div>
     :<div className="panel">{tab===0?<CalendarDays size={40}/>:<History size={40}/>}<h2>{q?'לא נמצא':tab===0?'אין אירועים קרובים':'עוד אין אירועים שהיו'}</h2><p>{q?'נסה מילה אחרת.':tab===0?'כשתקנה כרטיסים, הם יופיעו כאן לבד.':'אירועים שעברו יעברו לכאן.'}</p></div>;
    return <>{tab===0&&hero&&!q&&rest.length>0&&<div className="listH">בהמשך</div>}<div className="list">{rest.map(t=><Card key={t.key} t={t} onOpen={()=>setOpen(t.key)}/>)}</div></>;})()}
   {store.updated&&<p className="footnote">עודכן {new Date(store.updated).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})}</p>}
  </>}
  {tab===2&&<SettingsView user={user} hiddenCount={hidden.length} onRestore={()=>{setHidden([]);save(HID(user.id),[]);say('כל האירועים חזרו');}} onRescan={()=>{save(KEY(user.id),{tickets:[],read:[],updated:''});setStore({tickets:[],read:[],updated:''});setTab(0);scan(true);}}/>}
  {sel&&<Sheet t={sel} onClose={close} onHide={()=>hide(sel.key)} onCopy={()=>say('הועתק')}/>}
  {toast&&<div className="toast" role="status">{toast}</div>}
  {!sel&&<nav style={{['--tab' as string]:tab}} aria-label="ניווט">{[['קרובים',CalendarDays],['היו',History],['הגדרות',Settings]].map(([l,I],i)=>{const Ic=I as typeof Music;return <button key={i} className={tab===i?'selected':''} aria-current={tab===i?'page':undefined} onClick={()=>{setTab(i);scrollTo({top:0});}}><Ic/><span>{l as string}</span></button>;})}</nav>}
 </main>;}
function Header({actions}:{actions?:React.ReactNode}){return <header className="top row"><span className="brand" dir="ltr" aria-label="Gate"><Logo/><span aria-hidden="true">ate</span></span><div className="actions">{actions}</div></header>;}
function Hero({t,onOpen}:{t:Ticket;onOpen:()=>void}){const [n,u]=countdown(t);const K=KIND[t.kind];
 return <button className="nextCard" onClick={onOpen}>
  <div className="nc-k"><K.Icon size={16}/>האירוע הבא · {K.label}</div>
  <div className="nc-cd"><b>{n}</b>{u&&<span>{u}</span>}</div>
  <div className="nc-nm">{bidi(t.title)}</div>
  <div className="nc-chips"><span><CalendarDays/>{longDate(t)}</span>{timed(t)&&<span><Clock/>{time(t)}</span>}{place(t)&&<span><MapPin/>{bidi(place(t))}</span>}{t.seats.length>0&&<span><Armchair/>{t.seats.length===1?t.seats[0]:t.seats.length+' מקומות'}</span>}</div>
  {t.files.length>0&&<div className="nc-go"><QrCode size={20}/>הצג כרטיס</div>}
 </button>;}
function Card({t,onOpen}:{t:Ticket;onOpen:()=>void}){const d=when(t);const n=daysTo(t);const K=KIND[t.kind];
 return <button className={'card'+(n<0?' past':'')+(t.cancelled?' cx':'')} onClick={onOpen}><div className="c">
  <div className={'date'+(n===0?' today':'')}><small>{n===0?'היום':DAY_SHORT[d.getDay()]}</small><b>{d.getDate()}</b><span>{MON_SHORT[d.getMonth()]}{d.getFullYear()!==new Date().getFullYear()?' '+String(d.getFullYear()).slice(2):''}</span></div>
  <div className="info"><div className="nm">{bidi(t.title)}</div>{place(t)&&<div className="meta"><MapPin/><span>{bidi(place(t))}</span></div>}
   <div className="st">{t.cancelled?<span className="pill bad">בוטל</span>:<span className="pill"><K.Icon/>{K.label}</span>}{timed(t)&&<span className="pill soft">{time(t)}</span>}
    {n>1&&n<=14&&!t.cancelled&&<span className="pill hot">בעוד {n} ימים</span>}{n===1&&!t.cancelled&&<span className="pill hot">מחר</span>}
    {t.files.length>0&&<span className="pill soft"><QrCode/>כרטיס</span>}</div></div></div></button>;}
function Sheet({t,onClose,onHide,onCopy}:{t:Ticket;onClose:()=>void;onHide:()=>void;onCopy:()=>void}){const K=KIND[t.kind];const [n,u]=countdown(t);const w=where(t);
 useEffect(()=>{scrollTo({top:0});},[]);
 const copy=(s:string)=>{navigator.clipboard?.writeText(s).then(onCopy,()=>{});};
 return <div className="sheet" role="dialog" aria-label={t.title}>
  <div className="sheetTop"><button className="ib" onClick={onClose} aria-label="חזרה"><ChevronRight/></button></div>
  <div className="stub"><div className="k"><K.Icon size={17}/>{K.label}{t.provider&&' · '+t.provider}</div><h2>{bidi(t.title)}</h2>
   <div className="when"><div><span>תאריך</span><b>{longDate(t)}</b></div>{timed(t)&&<div><span>שעה</span><b>{time(t)}</b></div>}{t.doors&&<div><span>דלתות</span><b>{t.doors}</b></div>}</div>
   <div className="perf"/>{t.cancelled?<div className="cd"><b style={{color:'var(--bad)'}}>בוטל</b></div>:<div className="cd"><b>{n}</b><span>{u}</span></div>}</div>
  {t.files.length>0&&<div className="box"><h3><QrCode/>הכרטיסים</h3><div className="files">{t.files.map((f,i)=>{const I=fileIcon(f);return <a key={f.msg+f.id} className="file" href={fileUrl(f)} target="_blank" rel="noopener"><I size={22}/><span>{fileLabel(f,i,t.files.length)}</span><small>{f.name.length<28?f.name:''}</small></a>;})}</div></div>}
  {t.files.length===0&&t.links.length>0&&<div className="box"><h3><TicketIcon/>הכרטיסים</h3><div className="files">{t.links.map(l=><a key={l.url} className="file" href={l.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={22}/><span>{l.label}</span></a>)}</div></div>}
  {w&&<div className="box"><h3><MapPin/>מקום</h3>{t.venue&&<p className="place">{bidi(t.venue)}</p>}{(t.address||t.city)&&<p className="addr">{bidi([t.address,t.city].filter(Boolean).join(', '))}</p>}
   <div className="navLinks"><a className="ghost" href={'https://waze.com/ul?q='+encodeURIComponent(w)+'&navigate=yes'} target="_blank" rel="noopener"><Navigation size={18}/>Waze</a><a className="ghost" href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(w)} target="_blank" rel="noopener"><MapIcon size={18}/>מפות</a></div></div>}
  {t.seats.length>0&&<div className="box"><h3><Armchair/>{t.seats.length===1?'המקום שלך':t.seats.length+' מקומות'}</h3><ul className="seats">{t.seats.map((s,i)=><li key={i}><i>{i+1}</i>{s}</li>)}</ul></div>}
  {(t.order||t.count||t.price)&&<div className="box"><h3><TicketIcon/>פרטי ההזמנה</h3>
   {t.order&&<div className="kv"><span>מספר הזמנה</span><button className="copy" onClick={()=>copy(t.order!)}><b dir="ltr">{t.order}</b><Copy size={17}/></button></div>}
   {t.count&&<div className="kv"><span>כרטיסים</span><b style={{color:'var(--ink)'}}><Users size={16} style={{verticalAlign:-3,marginLeft:5}}/>{t.count}</b></div>}
   {t.price&&<div className="kv"><span>שולם</span><b style={{color:'var(--ink)'}} dir="ltr">{t.price}</b></div>}
   {t.doors&&<div className="kv"><span>פתיחת דלתות</span><b style={{color:'var(--ink)'}}><DoorOpen size={16} style={{verticalAlign:-3,marginLeft:5}}/>{t.doors}</b></div>}</div>}
  <div className="sheetActions">
   {upcoming(t)&&!t.cancelled&&<button className="primary" onClick={()=>addToCalendar(t)}><CalendarPlus size={20}/>הוספה ליומן עם תזכורת</button>}
   <a className="ghost" href={'https://mail.google.com/mail/u/0/#all/'+t.thread} target="_blank" rel="noopener"><Mail size={19}/>פתיחת המייל</a></div>
  <button className="textBtn" onClick={onHide}><EyeOff size={16} style={{verticalAlign:-3,marginLeft:6}}/>זה לא כרטיס - הסתר</button>
 </div>;}
function SettingsView({user,hiddenCount,onRestore,onRescan}:{user:User;hiddenCount:number;onRestore:()=>void;onRescan:()=>void}){
 return <><h1>הגדרות</h1><div className="settings">
  <div className="set"><h3><Mail size={18}/>חשבון</h3><p className="setNote"><b>{user.name}</b><br/><span dir="ltr">{user.email}</span></p><button className="ghost" onClick={()=>signOut({redirectTo:'/'})}><LogOut size={18}/>יציאה</button></div>
  <div className="set"><h3><RefreshCw size={18}/>סריקה</h3><p className="setNote">Gate קורא מיילים של כרטיסים מהשנתיים האחרונות. סריקה מלאה קוראת הכל מחדש.</p><button className="ghost" onClick={onRescan}><RotateCcw size={18}/>סריקה מלאה מחדש</button>
   {hiddenCount>0&&<button className="ghost" onClick={onRestore}><EyeOff size={18}/>החזרת {hiddenCount} אירועים מוסתרים</button>}</div>
  <p className="footnote">הגישה ל-Gmail היא לקריאה בלבד. הכרטיסים נשמרים רק בטלפון הזה, וקובצי הכרטיס נפתחים ישירות מהמייל שלך.</p></div></>;}
