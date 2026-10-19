'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {signOut} from 'next-auth/react';
import {Ticket as TicketIcon,CalendarDays,History,Settings,RefreshCw,Search,MapPin,Clock,Navigation,Map as MapIcon,CalendarPlus,Mail,Copy,ChevronRight,FileText,QrCode,Wallet,ExternalLink,Music,Drama,Clapperboard,Trophy,PartyPopper,Mic,Presentation,Sparkles,Send,Share2,X,ChartColumn,Pencil,Volume2,Type,Bell,BellOff,Smartphone,CalendarSync,Check,Armchair,EyeOff,DoorOpen,LogOut,RotateCcw,Users} from 'lucide-react';
import type {Ticket,Kind,TFile} from '@/lib/tickets';
import {mergeAll} from '@/lib/combine';
type User={id:string;name:string;email:string};
type Store={tickets:Ticket[];read:string[];updated:string};
const KIND:Record<Kind,{label:string;Icon:typeof Music}>={concert:{label:'הופעה',Icon:Music},show:{label:'הצגה',Icon:Drama},movie:{label:'סרט',Icon:Clapperboard},lecture:{label:'הרצאה',Icon:Presentation},sport:{label:'ספורט',Icon:Trophy},festival:{label:'פסטיבל',Icon:PartyPopper},standup:{label:'סטנדאפ',Icon:Mic},other:{label:'אירוע',Icon:TicketIcon}};
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
const NAM=(u:string)=>'gate:names:'+u;
const KEY=(u:string)=>'gate:v5:'+u;const HID=(u:string)=>'gate:hidden:'+u;
const load=<T,>(k:string,d:T):T=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}};
const save=(k:string,v:unknown)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
function addToCalendar(t:Ticket){const f=document.createElement('form');f.method='POST';f.action='/api/ics';
 const v:Record<string,string>={start:t.start,title:t.title,venue:t.venue||'',address:t.address||'',city:t.city||'',seats:t.seats.join('; '),doors:t.doors||'',order:t.order||'',provider:t.provider||'',hours:t.kind==='movie'?'2':'3'};
 for(const [k,val] of Object.entries(v)){const i=document.createElement('input');i.type='hidden';i.name=k;i.value=val;f.appendChild(i);}document.body.appendChild(f);f.submit();f.remove();}
// The U of "Unstage": the same U as Unbox, with a ticket as its lid.
// anim "draw": the U draws itself and the ticket drops on (opening screen); "bob": the ticket lifts and lands (loading).
function Mark({cls,anim}:{cls?:string;anim?:'draw'|'bob'}){const id=anim||'s';return <svg className={'mark'+(anim?' '+anim:'')+(cls?' '+cls:'')} viewBox="100 70 312 392" aria-hidden="true"><defs><linearGradient id={'lg'+id} gradientUnits="userSpaceOnUse" x1="0" y1="430" x2="0" y2="180"><stop offset="0" stopColor="#ff9f2e"/><stop offset="1" stopColor="#ffd27a"/></linearGradient><mask id={'lm'+id} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><rect x="0" y="0" width="512" height="512" fill="#fff"/><circle cx="156" cy="132" r="14.6" fill="#000"/><circle cx="356" cy="132" r="14.6" fill="#000"/></mask></defs><path className="ring" pathLength="100" strokeDasharray={anim==='draw'?'100':undefined} d="M150 214 V320 a106 106 0 0 0 212 0 V210" fill="none" stroke={'url(#lg'+id+')'} strokeWidth="58" strokeLinecap="round">{anim==='draw'&&<animate attributeName="stroke-dashoffset" values="100;0" dur=".85s" fill="freeze" calcMode="spline" keySplines=".6 0 .2 1"/>}</path><g className="tk">{anim==='draw'&&<><animateTransform attributeName="transform" type="translate" values="0 -80;0 6;0 0" keyTimes="0;.75;1" dur=".6s" begin=".6s" fill="freeze" calcMode="spline" keySplines=".2 .9 .3 1;.4 0 .6 1"/><animate attributeName="opacity" values="0;0;1" keyTimes="0;.01;1" dur=".25s" begin=".6s" fill="freeze"/></>}{anim==='bob'&&<animateTransform attributeName="transform" type="translate" values="0 0;0 -58;0 0" dur="1.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>}<g transform="rotate(-10 256 132)" opacity={anim==='draw'?0:1}>{anim==='draw'&&<set attributeName="opacity" to="1" begin=".6s" fill="freeze"/>}<rect x="156" y="89" width="200" height="86" rx="16" fill="#ffd27a" mask={'url(#lm'+id+')'}/><line x1="296" y1="101" x2="296" y2="163" stroke="var(--bg)" strokeWidth="7" strokeDasharray="3 11" strokeLinecap="round"/></g></g></svg>;}
const Logo=()=><Mark/>;
export default function App({user,gmail,configured,login}:{user:User|null;gmail:boolean;configured:boolean;login:()=>Promise<void>}){
 const [store,setStore]=useState<Store>({tickets:[],read:[],updated:''});const [hidden,setHidden]=useState<string[]>([]);const [ready,setReady]=useState(false);
 const [tab,setTab]=useState(0);const [names,setNames]=useState<Record<string,string>>({});const [size,setSize]=useState(0);const [q,setQ]=useState('');const [open,setOpen]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);const [prog,setProg]=useState<[number,number]|null>(null);const [err,setErr]=useState('');const [toast,setToast]=useState('');
 const running=useRef(false);
 useEffect(()=>{if(!user)return;if(user.id==='demo'){import('@/lib/demo').then(d=>{setStore(d.demo());setReady(true);});return;}setStore(load(KEY(user.id),{tickets:[],read:[],updated:''}));setHidden(load(HID(user.id),[]));setNames(load(NAM(user.id),{}));setSize(load('unstage:size',0));setReady(true);},[user]);
 const say=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),2200);};
 const scan=useCallback(async(fresh=false)=>{if(!user||running.current)return;running.current=true;setBusy(true);setErr('');
  try{const base:Store=fresh?{tickets:[],read:[],updated:''}:load(KEY(user.id),{tickets:[],read:[],updated:''});
   const r=await fetch('/api/tickets',{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'הסריקה נכשלה');
   const seen=new Set(base.read);const todo=(j.ids as string[]).filter(id=>!seen.has(id));let cur=base;setProg([0,todo.length]);
   const chunk=(l:string[])=>{const o:string[][]=[];for(let i=0;i<l.length;i+=6)o.push(l.slice(i,i+6));return o;};const batches=chunk(todo);let done=0;const retryIds:string[]=[];let second=false;
   const worker=async()=>{for(let b=batches.shift();b;b=batches.shift()){const res=await fetch('/api/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:b})});const d=await res.json();
     if(!res.ok){if(res.status===401||res.status===403)throw new Error(d.error);continue;}
     cur={tickets:mergeAll(cur.tickets,d.tickets),read:[...cur.read,...d.read],updated:cur.updated};setStore(cur);save(KEY(user.id),cur);if(!second)retryIds.push(...(d.retry||[]));done+=b.length;if(!second)setProg([done,todo.length]);}second=true;};
   await worker();
   // Mail Gemini could not read yet (busy) is tried again once after a short pause.
   if(retryIds.length){await new Promise(r=>setTimeout(r,25000));batches.push(...chunk(retryIds.splice(0)));await worker();}
   cur={...cur,updated:new Date().toISOString()};setStore(cur);save(KEY(user.id),cur);
  }catch(e){setErr(e instanceof Error?e.message:'הסריקה נכשלה');}
  finally{running.current=false;setBusy(false);setProg(null);}},[user]);
 useEffect(()=>{if(ready&&gmail&&user?.id!=='demo')scan();},[ready,gmail,scan,user]);
 // Opening screen, like Unbox: the G draws itself, then fades into the app.
 const [splash,setSplash]=useState<'on'|'out'|'off'>('on');
 useEffect(()=>{const a=setTimeout(()=>setSplash('out'),1500),b=setTimeout(()=>setSplash('off'),1900);return()=>{clearTimeout(a);clearTimeout(b);};},[]);
 // After a new deploy the open app reloads itself (at most once a minute).
 useEffect(()=>{const mine=process.env.NEXT_PUBLIC_BUILD;if(!mine)return;const check=()=>{if(document.visibilityState!=='visible')return;fetch('/api/version',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(d.build&&d.build!==mine){let last=0;try{last=+(sessionStorage.getItem('gate_reload')||0);}catch{}if(Date.now()-last>60000){try{sessionStorage.setItem('gate_reload',String(Date.now()));}catch{}setSplash('on');setTimeout(()=>location.reload(),60);}}}).catch(()=>{});};check();document.addEventListener('visibilitychange',check);return()=>document.removeEventListener('visibilitychange',check);},[]);
 // Coming back to the app after a while checks the mail again.
 const scanRef=useRef(scan);scanRef.current=scan;const lastScan=useRef(Date.now());
 useEffect(()=>{if(!user||!gmail)return;const onShow=()=>{if(document.visibilityState==='visible'&&Date.now()-lastScan.current>60000){lastScan.current=Date.now();void scanRef.current();}};document.addEventListener('visibilitychange',onShow);window.addEventListener('pageshow',onShow);return()=>{document.removeEventListener('visibilitychange',onShow);window.removeEventListener('pageshow',onShow);};},[user,gmail]);
 // Pull down at the top to refresh.
 const [pull,setPull]=useState(0);const pullStart=useRef<number|null>(null);const pullRef=useRef(0);
 useEffect(()=>{if(!user)return;const PULL=80;
  const start=(e:TouchEvent)=>{pullStart.current=window.scrollY<=0?e.touches[0].clientY:null;};
  const move=(e:TouchEvent)=>{if(pullStart.current===null)return;const dy=e.touches[0].clientY-pullStart.current;if(dy<=0||window.scrollY>0){pullRef.current=0;setPull(0);return;}pullRef.current=Math.min(130,dy*.55);setPull(pullRef.current);};
  const end=()=>{if(pullStart.current!==null&&pullRef.current>=PULL&&!running.current){lastScan.current=Date.now();void scanRef.current();}pullStart.current=null;pullRef.current=0;setPull(0);};
  window.addEventListener('touchstart',start,{passive:true});window.addEventListener('touchmove',move,{passive:true});window.addEventListener('touchend',end);window.addEventListener('touchcancel',end);
  return()=>{window.removeEventListener('touchstart',start);window.removeEventListener('touchmove',move);window.removeEventListener('touchend',end);window.removeEventListener('touchcancel',end);};},[user]);
 // Slide a finger along the tab bar to switch tabs.
 const [navDrag,setNavDrag]=useState<number|null>(null);
 function navSlide(e:React.TouchEvent<HTMLElement>,moving:boolean){const r=e.currentTarget.getBoundingClientRect();const x=e.touches[0]?.clientX;if(x===undefined)return;
  const pos=Math.min(2,Math.max(0,(r.right-x)/(r.width/3)-0.5));if(!moving){setNavDrag(null);return;}setNavDrag(pos);const t=Math.round(pos);if(t!==tab){setTab(t);setOpen(null);}}
 // The server copy (for reminders, the subscribed calendar and the widget) and phone notifications.
 type Srv={enabled:boolean;publicKey?:string;devices?:number;calendar?:string;widget?:string};
 const [srv,setSrv]=useState<Srv|null>(null);const [push,setPush]=useState<'checking'|'install'|'unsupported'|'denied'|'off'|'on'|'busy'>('checking');const [pushMsg,setPushMsg]=useState('');
 useEffect(()=>{if(!user||user.id==='demo')return;void (async()=>{const s:Srv=await fetch('/api/push',{cache:'no-store'}).then(r=>r.json()).catch(()=>({enabled:false}));setSrv(s);
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent),standalone=matchMedia('(display-mode: standalone)').matches||(navigator as {standalone?:boolean}).standalone===true;
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){setPush(ios&&!standalone?'install':'unsupported');return;}
  try{const reg=await navigator.serviceWorker.register('/sw.js');if(Notification.permission==='denied'){setPush('denied');return;}const sub=await reg.pushManager.getSubscription();setPush(sub&&Notification.permission==='granted'?'on':'off');}catch{setPush('unsupported');}})();},[user]);
 const sendServer=useCallback(async(extra:Record<string,unknown>={})=>{if(!user)return null;const r=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tickets:(()=>{const nm=load(NAM(user.id),{} as Record<string,string>);return load(KEY(user.id),{tickets:[] as Ticket[]}).tickets.map(t=>nm[t.key]?{...t,title:nm[t.key]}:t);})(),hidden:load(HID(user.id),[] as string[]),...extra})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'השמירה נכשלה');return d;},[user]);
 // After every scan, the server copy follows the phone.
 const synced=useRef('');useEffect(()=>{if(!srv?.enabled||!store.tickets.length)return;const sig=store.tickets.length+'|'+store.tickets.filter(t=>t.ai).length+'|'+hidden.length+'|'+JSON.stringify(names).length+'|'+(busy?'':store.updated);if(synced.current===sig)return;const id=setTimeout(()=>{synced.current=sig;sendServer().catch(()=>{});},busy?6000:500);return()=>clearTimeout(id);},[srv,busy,store,hidden.length,names,sendServer]);
 async function enablePush(){setPushMsg('');const perm=await Notification.requestPermission();if(perm!=='granted'){setPush(perm==='denied'?'denied':'off');return;}setPush('busy');
  try{const reg=await navigator.serviceWorker.ready;const key=Uint8Array.from(atob((srv?.publicKey||'').replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});await sendServer({subscription:sub.toJSON()});setPush('on');}
  catch(e){setPush('off');setPushMsg(e instanceof Error?e.message:'לא ניתן להפעיל התראות');}}
 async function disablePush(){setPush('busy');setPushMsg('');try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub){await sendServer({remove:sub.endpoint}).catch(()=>{});await sub.unsubscribe();}}finally{setPush('off');}}
 async function testPush(){setPushMsg('');try{await sendServer({test:true});setPushMsg('נשלחה התראת בדיקה');}catch(e){setPushMsg(e instanceof Error?e.message:'השליחה נכשלה');}}
 // A notification or the widget opens a ticket directly: /?t=<event>.
 useEffect(()=>{if(!ready)return;const k=new URLSearchParams(location.search).get('t');if(!k)return;history.replaceState(null,'','/');if(store.tickets.some(t=>t.key===k))setOpen(k);},[ready,store.tickets]);
 // "שאל את Unstage": questions about your own events, answered by Gemini from the list on the phone.
 const [askOpen,setAskOpen]=useState(false);const [askDraft,setAskDraft]=useState('');const [chat,setChat]=useState<{role:'user'|'model';text:string}[]>([]);const [asking,setAsking]=useState(false);
 const [canListen,setCanListen]=useState(false);useEffect(()=>{const w=window as unknown as {webkitSpeechRecognition?:unknown;SpeechRecognition?:unknown};setCanListen(!!(w.webkitSpeechRecognition||w.SpeechRecognition));},[]);
 const listen=(done:(t:string)=>void)=>{const W=window as unknown as {webkitSpeechRecognition?:new()=>any;SpeechRecognition?:new()=>any};const R=W.SpeechRecognition||W.webkitSpeechRecognition;if(!R)return;const r=new R();r.lang='he-IL';r.onresult=(ev:any)=>{const t=String(ev.results?.[0]?.[0]?.transcript||'');if(t)done(t);};r.start();};
 async function ask(text?:string){const q=(text??askDraft).trim();if(!q||asking)return;setAskDraft('');const hist=chat;setChat([...hist,{role:'user',text:q}]);setAsking(true);
  const data=named.filter(t=>!hidden.includes(t.key)).map(t=>[t.title,KIND[t.kind].label,t.start.replace('T',' '),[t.venue,t.city].filter(Boolean).join(', '),t.seats.length?'מקומות: '+t.seats.join('; '):'',t.doors?'דלתות '+t.doors:'',t.price?'שולם '+t.price:'',t.cancelled?'בוטל':''].filter(Boolean).join(' | ')).join('\n');
  try{const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q,data,history:hist})});const d=await r.json();
   setChat(c=>[...c,{role:'model',text:d.answer||(d.error==='busy'?'אני עמוס כרגע, נסה שוב בעוד דקה.':'לא הצלחתי לענות כרגע.')}]);}catch{setChat(c=>[...c,{role:'model',text:'לא הצלחתי לענות כרגע.'}]);}finally{setAsking(false);}}
 const splashEl=splash!=='off'&&<div className={'splash'+(splash==='out'?' out':'')} aria-hidden="true"><Mark cls="smark" anim="draw"/><div className="sname" dir="ltr">Unstage</div></div>;
 const named=useMemo(()=>store.tickets.map(t=>names[t.key]?{...t,title:names[t.key]}:t),[store.tickets,names]);
 const visible=useMemo(()=>{const s=q.trim().toLowerCase();return named.filter(t=>!hidden.includes(t.key)&&(!s||[t.title,t.venue,t.city,t.provider].some(x=>x?.toLowerCase().includes(s))));},[named,hidden,q]);
 const next=useMemo(()=>visible.filter(t=>upcoming(t)).sort((a,b)=>when(a).getTime()-when(b).getTime()),[visible]);
 const past=useMemo(()=>visible.filter(t=>!upcoming(t)).sort((a,b)=>when(b).getTime()-when(a).getTime()),[visible]);
 const hero=next.find(t=>!t.cancelled);
 const sel=named.find(t=>t.key===open);
 useEffect(()=>{const back=()=>setOpen(null);if(open){history.pushState({sheet:1},'');addEventListener('popstate',back);return ()=>removeEventListener('popstate',back);}},[open]);
 const close=()=>{if(history.state?.sheet)history.back();else setOpen(null);};
 const rename=(k:string)=>{if(!user)return;const cur=names[k]||store.tickets.find(t=>t.key===k)?.title||'';const v=prompt('שם לאירוע',cur);if(v===null)return;const n={...names};if(v.trim()&&v.trim()!==store.tickets.find(t=>t.key===k)?.title)n[k]=v.trim().slice(0,120);else delete n[k];setNames(n);save(NAM(user.id),n);say('השם עודכן');};
 const hide=(k:string)=>{if(!user)return;const h=[...hidden,k];setHidden(h);save(HID(user.id),h);close();say('האירוע הוסתר');};
 if(!configured)return <main className="app">{splashEl}<Header/><div className="panel"><TicketIcon size={40}/><h2>Unstage עוד לא מחובר</h2><p>חסרים מפתחות ב-Vercel (AUTH_GOOGLE_SECRET, AUTH_SECRET).</p></div></main>;
 if(!user)return <main className="app">{splashEl}<Header/><h1>הכרטיסים שלך,<br/>במקום אחד</h1><p className="sub">Unstage קורא את מיילי הכרטיסים ב-Gmail ומסדר כל הופעה, הצגה וסרט בכרטיס אחד - עם התאריך, המקום, הכיסאות והברקוד לכניסה.</p>
  <form action={login}><button className="primary"><Mail size={20}/>כניסה עם Google</button></form><p className="footnote">הגישה ל-Gmail היא לקריאה בלבד. הכרטיסים נשמרים רק בטלפון שלך.</p></main>;
 const list=tab===0?next:past;
 return <main className={'app'+(sel?' detailOn':'')+(size===1?' large':size===2?' xlarge':'')}>
  {splashEl}
  {pull>0&&!sel&&<div className={'ptr'+(pull>=80?' ready':'')} style={{transform:'translate(-50%,'+Math.max(0,pull-46)+'px)',opacity:Math.min(1,pull/80)}} aria-hidden="true"><RefreshCw style={{transform:'rotate('+pull*3+'deg)'}}/></div>}
  <Header actions={<><button className="ib" onClick={()=>scan()} disabled={busy} aria-label="סריקה מחדש"><RefreshCw className={busy?'spin':''}/></button><button className="ib" onClick={()=>{setTab(3);scrollTo({top:0});}} aria-label="הגדרות"><Settings/></button></>}/>
  {!gmail&&<div className="error"><span>נכנסת עם Google, אבל לא אישרת קריאת Gmail.</span><form action={login}><button className="ghost">חידוש הרשאה</button></form></div>}
  {err&&<div className="error"><span>{err}</span><button className="ghost" onClick={()=>scan()}>נסה שוב</button></div>}
  {prog&&prog[1]>0&&<div className="progress"><div className="pbar"><i style={{width:Math.round(prog[0]/prog[1]*100)+'%'}}/></div><div className="plabel">קורא מיילים {prog[0]} מתוך {prog[1]}</div></div>}
  {tab<2&&<>
   <h1>{tab===0?'קרובים':'היו'}</h1>
   <label className="search"><Search size={20}/><span className="sr">חיפוש</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="חיפוש אירוע, מקום או מוכר"/>{canListen&&<button type="button" className="micBtn" aria-label="חיפוש קולי" onClick={()=>listen(setQ)}><Mic size={19}/></button>}<button type="button" className="micBtn ask" aria-label="שאל את Unstage" onClick={()=>setAskOpen(true)}><Sparkles size={19}/></button></label>
   {tab===0&&hero&&!q&&<Hero t={hero} onOpen={()=>setOpen(hero.key)}/>}
   {(()=>{const rest=tab===0&&hero&&!q?list.filter(t=>t.key!==hero.key):list;
    if(!rest.length&&!(tab===0&&hero&&!q))return busy&&!store.tickets.length?<div className="loader" role="status"><Mark cls="lmark" anim="bob"/><p>{prog&&prog[1]?'מחפש כרטיסים במיילים…':'בודק את Gmail…'}</p></div>
     :<div className="panel">{tab===0?<CalendarDays size={40}/>:<History size={40}/>}<h2>{q?'לא נמצא':tab===0?'אין אירועים קרובים':'עוד אין אירועים שהיו'}</h2><p>{q?'נסה מילה אחרת.':tab===0?'כשתקנה כרטיסים, הם יופיעו כאן לבד.':'אירועים שעברו יעברו לכאן.'}</p></div>;
    return <>{tab===0&&hero&&!q&&rest.length>0&&<div className="listH">בהמשך</div>}<div className="list">{rest.map((t,i)=><Card key={t.key} t={t} i={i} onOpen={()=>setOpen(t.key)}/>)}</div></>;})()}
   {store.updated&&<p className="footnote">עודכן {new Date(store.updated).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})}</p>}
  </>}
  {tab===2&&<Summary list={visible}/>}
  {tab===3&&<SettingsView size={size} onSize={(i:number)=>{setSize(i);save('unstage:size',i);}} user={user} srv={srv} push={push} pushMsg={pushMsg} onPush={push==='on'?disablePush:enablePush} onTest={testPush} onCopy={(t:string)=>{navigator.clipboard?.writeText(t).then(()=>say('הועתק'),()=>{});}} hiddenCount={hidden.length} onRestore={()=>{setHidden([]);save(HID(user.id),[]);say('כל האירועים חזרו');}} onRescan={()=>{save(KEY(user.id),{tickets:[],read:[],updated:''});setStore({tickets:[],read:[],updated:''});setTab(0);scan(true);}}/>}
  {sel&&<Sheet t={sel} onClose={close} onRename={()=>rename(sel.key)} onHide={()=>hide(sel.key)} onCopy={()=>say('הועתק')}/>}
  {askOpen&&<div className="menuWrap" onClick={()=>setAskOpen(false)}><div className="menu askSheet" role="dialog" aria-modal="true" aria-label="שאל את Unstage" onClick={e=>e.stopPropagation()}>
   <div className="askHead"><h3><Sparkles size={19}/>שאל את Unstage</h3><button className="ib" aria-label="סגירה" onClick={()=>setAskOpen(false)}><X/></button></div>
   <div className="askList" aria-live="polite">{!chat.length&&<div className="askHints">{['מה האירוע הבא שלי?','כמה הוצאתי על כרטיסים השנה?','באיזה שורה אני יושב בהופעה הבאה?','מה יש לי החודש?'].map(h=><button key={h} onClick={()=>ask(h)}>{h}</button>)}</div>}
    {chat.map((m,i)=><p key={i} className={'askMsg '+m.role}>{m.text}</p>)}{asking&&<p className="askMsg model">…</p>}</div>
   <form className="askBar" onSubmit={e=>{e.preventDefault();void ask();}}><input aria-label="השאלה שלך" placeholder="שאל על האירועים שלך" value={askDraft} onChange={e=>setAskDraft(e.target.value)}/>{canListen&&<button type="button" className="ib" aria-label="לשאול בקול" onClick={()=>listen(t=>void ask(t))}><Mic/></button>}<button className="ib" aria-label="שליחה" disabled={!askDraft.trim()||asking}><Send/></button></form>
  </div></div>}
  {toast&&<div className="toast" role="status">{toast}</div>}
  {!sel&&<nav className={(navDrag!==null?'dragging':'')+(tab===3&&navDrag===null?' none':'')} style={{['--tab' as string]:navDrag??tab}} aria-label="ניווט" onTouchStart={e=>navSlide(e,false)} onTouchMove={e=>navSlide(e,true)} onTouchEnd={()=>setNavDrag(null)} onTouchCancel={()=>setNavDrag(null)}>{[['קרובים',CalendarDays],['היו',History],['סיכום',ChartColumn]].map(([l,I],i)=>{const Ic=I as typeof Music;return <button key={i} className={tab===i?'selected':''} aria-current={tab===i?'page':undefined} onClick={()=>{setTab(i);scrollTo({top:0});}}><Ic/><span>{l as string}</span></button>;})}</nav>}
 </main>;}
function Header({actions}:{actions?:React.ReactNode}){return <header className="top row"><span className="brand" dir="ltr" aria-label="Unstage"><Logo/><span aria-hidden="true">nstage</span></span><div className="actions">{actions}</div></header>;}
function Hero({t,onOpen}:{t:Ticket;onOpen:()=>void}){const [n,u]=countdown(t);const K=KIND[t.kind];
 return <button className="nextCard" onClick={onOpen}>
  <div className="nc-k"><K.Icon size={16}/>האירוע הבא · {K.label}</div>
  <div className="nc-cd"><b>{n}</b>{u&&<span>{u}</span>}</div>
  <div className="nc-nm">{bidi(t.title)}</div>
  <div className="nc-chips"><span><CalendarDays/>{longDate(t)}</span>{timed(t)&&<span><Clock/>{time(t)}</span>}{place(t)&&<span><MapPin/>{bidi(place(t))}</span>}{t.seats.length>0&&<span><Armchair/>{t.seats.length===1?t.seats[0]:t.seats.length+' מקומות'}</span>}</div>
  {t.files.length>0&&<div className="nc-go"><QrCode size={20}/>הצג כרטיס</div>}
 </button>;}
function Card({t,i=0,onOpen}:{t:Ticket;i?:number;onOpen:()=>void}){const d=when(t);const n=daysTo(t);const K=KIND[t.kind];
 return <button className={'card'+(n<0?' past':'')+(t.cancelled?' cx':'')} style={{['--i' as string]:Math.min(i,8)}} onClick={onOpen}><div className="c">
  <div className={'date'+(n===0?' today':'')}><small>{n===0?'היום':DAY_SHORT[d.getDay()]}</small><b>{d.getDate()}</b><span>{MON_SHORT[d.getMonth()]}{d.getFullYear()!==new Date().getFullYear()?' '+String(d.getFullYear()).slice(2):''}</span></div>
  <div className="info"><div className="nm">{bidi(t.title)}</div>{place(t)&&<div className="meta"><MapPin/><span>{bidi(place(t))}</span></div>}
   <div className="st">{t.cancelled?<span className="pill bad">בוטל</span>:<span className="pill"><K.Icon/>{K.label}</span>}{timed(t)&&<span className="pill soft">{time(t)}</span>}
    {n>1&&n<=14&&!t.cancelled&&<span className="pill hot">בעוד {n} ימים</span>}{n===1&&!t.cancelled&&<span className="pill hot">מחר</span>}
    {t.files.length>0&&<span className="pill soft"><QrCode/>כרטיס</span>}</div></div></div></button>;}
function Sheet({t,onClose,onRename,onHide,onCopy}:{t:Ticket;onClose:()=>void;onRename:()=>void;onHide:()=>void;onCopy:()=>void}){const [view,setView]=useState<TFile|null>(null);const K=KIND[t.kind];const [n,u]=countdown(t);const w=where(t);
 useEffect(()=>{scrollTo({top:0});},[]);
 const copy=(s:string)=>{navigator.clipboard?.writeText(s).then(onCopy,()=>{});};
 return <div className="sheet" role="dialog" aria-label={t.title}>
  {view&&<Viewer f={view} onClose={()=>setView(null)}/>}
  <div className="sheetTop"><button className="ib" onClick={onClose} aria-label="חזרה"><ChevronRight/></button><div className="actions">{typeof navigator!=='undefined'&&'share' in navigator&&<button className="ib" aria-label="שיתוף" onClick={()=>navigator.share({title:t.title,text:[t.title,longDate(t)+(timed(t)?' בשעה '+time(t):''),place(t)].filter(Boolean).join('\n')}).catch(()=>{})}><Share2/></button>}<button className="ib" onClick={onRename} aria-label="שינוי שם"><Pencil/></button></div></div>
  <div className="stub"><div className="k"><K.Icon size={17}/>{K.label}{t.provider&&' · '+t.provider}</div><h2>{bidi(t.title)}</h2>
   <div className="when"><div><span>תאריך</span><b>{longDate(t)}</b></div>{timed(t)&&<div><span>שעה</span><b>{time(t)}</b></div>}{t.doors&&<div><span>דלתות</span><b>{t.doors}</b></div>}</div>
   <div className="perf"/>{t.cancelled?<div className="cd"><b style={{color:'var(--bad)'}}>בוטל</b></div>:<div className="cd"><b>{n}</b><span>{u}</span></div>}</div>
  {t.files.length>0&&<div className="box"><h3><QrCode/>הכרטיסים</h3><div className="files">{t.files.map((f,i)=>{const I=fileIcon(f);return /pkpass/i.test(f.type+f.name)?<a key={f.msg+f.id} className="file" href={fileUrl(f)}><I size={22}/><span>{fileLabel(f,i,t.files.length)}</span></a>:<button key={f.msg+f.id} className="file" onClick={()=>setView(f)}><I size={22}/><span>{fileLabel(f,i,t.files.length)}</span><small>{f.name.length<28?f.name:''}</small></button>;})}</div></div>}
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
// Scriptable widget source with the personal link inside; the drawing code itself comes from Unstage, so updates arrive by themselves.
const widgetScript=(url:string)=>`// Unstage widget: loads its drawing code from Unstage, so updates arrive by themselves.
const u=${JSON.stringify(url)}
const r=await new Request(u).loadJSON().catch(()=>null)
const code=await new Request(u+'&js=1').loadString().catch(()=>'')
const AF=Object.getPrototypeOf(async function(){}).constructor
if(code&&code.includes('ListWidget')){await new AF('r',code)(r)}else{const w=new ListWidget();w.backgroundColor=new Color('#0a0f14');const t=w.addText(r&&r.lines?r.lines.map(x=>x.t).join('\\n'):'אין נתונים כרגע');t.textColor=Color.white();t.font=Font.boldSystemFont(15);if(config.runsInWidget)Script.setWidget(w);else await w.presentSmall();Script.complete()}`;
type SrvProps={srv:{enabled:boolean;devices?:number;calendar?:string;widget?:string}|null;push:string;pushMsg:string;onPush:()=>void;onTest:()=>void;onCopy:(t:string)=>void};
function SettingsView({user,srv,push,pushMsg,onPush,onTest,onCopy,hiddenCount,onRestore,onRescan,size,onSize}:{user:User;hiddenCount:number;onRestore:()=>void;onRescan:()=>void;size:number;onSize:(i:number)=>void}&SrvProps){
 const noDb=srv&&!srv.enabled;
 const speakUrl=srv?.widget?.replace('/api/widget','/api/speak');
 return <><h1>הגדרות</h1><div className="settings">
  <div className="set"><h3><Type size={18}/>גודל טקסט</h3><div className="seg" role="radiogroup" aria-label="גודל טקסט">{['רגיל','גדול','גדול מאוד'].map((l,i)=><button key={i} role="radio" aria-checked={size===i} className={size===i?'on':''} onClick={()=>onSize(i)}>{l}</button>)}</div></div>
  <div className="set"><h3><Bell size={18}/>התראות</h3>
   <p className="setNote">ערב לפני כל אירוע, שלוש שעות לפני עם הכרטיס מוכן, וכשמגיע כרטיס חדש למייל.</p>
   {noDb?<p className="setNote">השרת עוד לא חובר למסד נתונים.</p>
    :push==='install'?<p className="setNote">באייפון התראות עובדות רק מהאפליקציה שבמסך הבית: שיתוף ← <b>הוסף למסך הבית</b>, ואז לפתוח משם.</p>
    :push==='unsupported'?<p className="setNote">הדפדפן הזה לא תומך בהתראות.</p>
    :push==='denied'?<p className="setNote">ההתראות חסומות בהגדרות הטלפון עבור Unstage.</p>
    :<><button className={push==='on'?'ghost':'primary'} disabled={push==='busy'||push==='checking'||!srv} onClick={onPush}>{push==='on'?<><BellOff size={18}/>כיבוי התראות</>:<><Bell size={18}/>הפעלת התראות</>}</button>
     {push==='on'&&<button className="ghost" onClick={onTest}><Check size={18}/>התראת בדיקה</button>}</>}
   {pushMsg&&<p className="setNote">{pushMsg}</p>}</div>
  {srv?.calendar&&<div className="set"><h3><CalendarSync size={18}/>יומן שמתעדכן לבד</h3>
   <p className="setNote">כל האירועים מופיעים ביומן של הטלפון, עם תזכורת שעתיים לפני. כרטיס חדש נכנס ליומן בעצמו.</p>
   <a className="primary" href={srv.calendar}><CalendarPlus size={18}/>הוספה ליומן של האייפון</a>
   <button className="ghost" onClick={()=>onCopy(srv.calendar!.replace(/^webcal/,'https'))}><Copy size={18}/>העתקת הקישור (ל-Google Calendar)</button></div>}
  {srv?.widget&&<div className="set"><h3><Smartphone size={18}/>ווידג'ט למסך הבית ולמסך הנעילה</h3>
   <p className="setNote">מראה את האירוע הבא ומה אחריו. עובד דרך אפליקציית <b>Scriptable</b> (חינם ב-App Store).</p>
   <ol className="steps2"><li>העתק את הסקריפט.</li><li>ב-Scriptable: <b>+</b>, הדבק ושמור בשם <b>Unstage</b>.</li><li>במסך הבית: לחיצה ארוכה ← <b>+</b> ← Scriptable ← גודל בינוני. בהגדרות הווידג'ט בחר את הסקריפט <b>Unstage</b>.</li><li>גם למסך הנעילה: התאמה אישית ← מסך נעילה ← Scriptable, ובחר <b>Unstage</b>.</li></ol>
   <button className="ghost" onClick={()=>onCopy(widgetScript(srv.widget!))}><Copy size={18}/>העתקת הסקריפט</button></div>}
  {speakUrl&&<div className="set"><h3><Mic size={18}/>לשאול את Siri</h3>
   <p className="setNote">אומרים "היי Siri, מה האירוע הבא שלי" ושומעים מה, מתי ואיפה.</p>
   <ol className="steps2"><li>העתק את הקישור האישי.</li><li>באפליקציית קיצורים: <b>+</b> ← הוסף פעולה <b>קבל תוכן של URL</b> והדבק את הקישור.</li><li>הוסף פעולה <b>דבר טקסט</b>.</li><li>שמור את הקיצור בשם <b>מה האירוע הבא שלי</b>.</li></ol>
   <button className="ghost" onClick={()=>onCopy(speakUrl)}><Copy size={18}/>העתקת הקישור האישי</button>
   <button className="ghost" onClick={async()=>{try{const t=await (await fetch(speakUrl,{cache:'no-store'})).text();const u=new SpeechSynthesisUtterance(t);u.lang='he-IL';speechSynthesis.cancel();speechSynthesis.speak(u);}catch{}}}><Volume2 size={18}/>השמע עכשיו</button></div>}
  <div className="set"><h3><Mail size={18}/>חשבון</h3><p className="setNote"><b>{user.name}</b><br/><span dir="ltr">{user.email}</span></p><button className="ghost" onClick={()=>signOut({redirectTo:'/'})}><LogOut size={18}/>יציאה</button></div>
  <div className="set"><h3><RefreshCw size={18}/>סריקה</h3><p className="setNote">Unstage קורא מיילים של כרטיסים מהשנתיים האחרונות. סריקה מלאה קוראת הכל מחדש.</p><button className="ghost" onClick={onRescan}><RotateCcw size={18}/>סריקה מלאה מחדש</button>
   {hiddenCount>0&&<button className="ghost" onClick={onRestore}><EyeOff size={18}/>החזרת {hiddenCount} אירועים מוסתרים</button>}</div>
  <p className="footnote">הגישה ל-Gmail היא לקריאה בלבד. רשימת האירועים נשמרת בטלפון, ועותק שלה בשרת בשביל התזכורות, היומן והווידג'ט. קובצי הכרטיס נפתחים ישירות מהמייל שלך. <a href="/privacy">פרטיות</a></p></div></>;}

// Summary tab: how many events, what kind, where, and what they cost.
function Summary({list}:{list:Ticket[]}){const y=new Date().getFullYear();const real=list.filter(t=>!t.cancelled);
 const years=[...new Set(real.map(t=>+t.start.slice(0,4)))].sort((a,b)=>b-a);const [yr,setYr]=useState(years.includes(y)?y:years[0]||y);
 const inYear=real.filter(t=>+t.start.slice(0,4)===yr);const past=inYear.filter(t=>!upcoming(t)).length;
 const money=(p?:string)=>{const m=(p||'').replace(/,/g,'').match(/\d+(?:\.\d+)?/);return p&&/₪/.test(p)&&m?+m[0]:0;};const spent=inYear.reduce((a,t)=>a+money(t.price),0);
 const kinds=Object.entries(inYear.reduce((a,t)=>({...a,[t.kind]:(a[t.kind]||0)+1}),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]);
 const venues=Object.entries(inYear.reduce((a,t)=>{const v=(t.venue||'').split(' - ')[0].trim();return v?{...a,[v]:(a[v]||0)+1}:a;},{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const max=Math.max(1,...kinds.map(k=>k[1]));
 return <><h1>סיכום</h1>
  {years.length>1&&<div className="chips">{years.map(v=><button key={v} className={'chip'+(v===yr?' on':'')} onClick={()=>setYr(v)}>{v}</button>)}</div>}
  <div className="statGrid"><div className="stat"><b>{inYear.length}</b><span>אירועים</span></div><div className="stat"><b>{past}</b><span>היו</span></div><div className="stat"><b>{inYear.length-past}</b><span>בדרך</span></div></div>
  {spent>0&&<div className="box"><h3><Wallet/>הוצאות על כרטיסים</h3><div className="moneyBig"><b dir="ltr">₪{Math.round(spent).toLocaleString('he-IL')}</b></div></div>}
  {kinds.length>0&&<div className="box"><h3><TicketIcon/>לפי סוג</h3>{kinds.map(([k,n])=>{const K=KIND[k as Kind];return <div className="kindRow" key={k}><span><K.Icon size={16}/>{K.label}</span><i style={{width:(n/max*100)+'%'}}/><b>{n}</b></div>;})}</div>}
  {venues.length>0&&<div className="box"><h3><MapPin/>המקומות שלך</h3>{venues.map(([v,n])=><div className="kv" key={v}><span style={{whiteSpace:'normal'}}>{bidi(v)}</span><b style={{color:'var(--ink)'}}>{n}</b></div>)}</div>}
  {!inYear.length&&<div className="panel"><ChartColumn size={40}/><h2>עוד אין נתונים</h2><p>אחרי שיהיו כרטיסים, יופיע כאן סיכום.</p></div>}</>;}

// Full-screen ticket viewer with a close button: a home-screen app has no browser back button.
// PDFs are drawn page by page (pdf.js from cdnjs), images are shown as they are.
function Viewer({f,onClose}:{f:TFile;onClose:()=>void}){const box=useRef<HTMLDivElement>(null);const [err,setErr]=useState('');const [busy,setBusy]=useState(true);const img=/image/.test(f.type);
 useEffect(()=>{if(img){setBusy(false);return;}let off=false;(async()=>{try{
   const lib:any=await import(/* webpackIgnore: true */ 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs' as string);
   lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
   const data=await (await fetch(fileUrl(f))).arrayBuffer();const pdf=await lib.getDocument({data}).promise;
   for(let n=1;n<=Math.min(pdf.numPages,12)&&!off;n++){const page=await pdf.getPage(n);const w=(box.current?.clientWidth||360)*Math.min(3,devicePixelRatio||2);const vp=page.getViewport({scale:1});const v=page.getViewport({scale:w/vp.width});
    const c=document.createElement('canvas');c.width=v.width;c.height=v.height;c.className='pdfPage';await page.render({canvasContext:c.getContext('2d')!,viewport:v}).promise;box.current?.appendChild(c);}
  }catch{setErr('לא הצלחתי להציג את הכרטיס כאן.');}finally{setBusy(false);}})();return()=>{off=true;};},[f,img]);
 return <div className="viewer" role="dialog" aria-label="הכרטיס">
  <div className="viewerTop"><button className="ib" onClick={onClose} aria-label="סגירה"><X/></button><a className="ib" href={fileUrl(f)} download={f.name||'ticket'} aria-label="שמירה"><Share2/></a></div>
  <div className="viewerBody" ref={box}>{img&&<img src={fileUrl(f)} alt="ברקוד הכרטיס"/>}{busy&&!img&&<div className="loader"><Mark cls="lmark" anim="bob"/><p>פותח את הכרטיס…</p></div>}{err&&<p className="setNote" style={{textAlign:'center'}}>{err} <a href={fileUrl(f)} target="_blank" rel="noopener">פתיחה בדפדפן</a></p>}</div>
 </div>;}
