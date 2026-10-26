'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {signOut} from 'next-auth/react';
import {ChevronLeft,Ticket as TicketIcon,CalendarDays,History,Settings,RefreshCw,Search,MapPin,Clock,Navigation,Map as MapIcon,CalendarPlus,Mail,Copy,ChevronRight,FileText,QrCode,Wallet,ExternalLink,Music,Drama,Clapperboard,Trophy,PartyPopper,Mic,Presentation,Sparkles,Send,Share2,X,ChartColumn,Pencil,Volume2,Type,Bell,BellOff,Smartphone,CalendarSync,Check,Armchair,EyeOff,Bus,DoorOpen,LogOut,RotateCcw,Users,Martini,Plus,ImagePlus,ClipboardPaste,Trash2} from 'lucide-react';
import type {Ticket,Kind,TFile} from '@/lib/tickets';
import {mergeAll,status,cleanSeats,current,withSms} from '@/lib/combine';
import type {PresInfo} from '@/lib/pres';
import {localAnswer} from '@/lib/answer';
import {sellerCancel,contacts,LAW} from '@/lib/sellers';
import {navQuery,navLinks} from '@/lib/place';
import {offlinePlan,personalKeys} from '@/lib/offline';
import {fixKind} from '@/lib/kind';
import {matchSms,type SmsTicket} from '@/lib/sms';
import {applyManual,type ManualItem} from '@/lib/manual';
type User={id:string;name:string;email:string};
type Store={tickets:Ticket[];read:string[];updated:string};
const KIND:Record<Kind,{label:string;Icon:typeof Music}>={concert:{label:'הופעה',Icon:Music},show:{label:'הצגה',Icon:Drama},movie:{label:'סרט',Icon:Clapperboard},lecture:{label:'הרצאה',Icon:Presentation},sport:{label:'ספורט',Icon:Trophy},festival:{label:'פסטיבל',Icon:PartyPopper},standup:{label:'סטנדאפ',Icon:Mic},party:{label:'מסיבה',Icon:Martini},other:{label:'אירוע',Icon:TicketIcon}};
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
const where=(t:Ticket)=>navQuery(t);
// As in Unbox: Google Maps, Moovit, Waze.
function NavLinks({q}:{q:string}){const l=navLinks(q);return <div className="navLinks"><a className="ghost" href={l.google} target="_blank" rel="noopener noreferrer"><MapIcon size={18}/>Google Maps</a><a className="ghost" href={l.moovit} target="_blank" rel="noopener noreferrer"><Bus size={18}/>Moovit</a><a className="ghost" href={l.waze} target="_blank" rel="noopener noreferrer"><Navigation size={18}/>Waze</a></div>;}
const fileUrl=(f:TFile)=>'/api/file?'+new URLSearchParams({m:f.msg,a:f.id,n:f.name,t:f.type});
const fileIcon=(f:TFile)=>/pkpass/i.test(f.type+f.name)?Wallet:/image/.test(f.type)?QrCode:FileText;
// How many tickets the event has (one PDF may hold several), so the buttons say כרטיס or כרטיסים.
const nTickets=(t:Ticket)=>Math.max(t.count||0,t.seats.length,t.files.filter(f=>!/pkpass/i.test(f.type+f.name)).length,1);
const showLabel=(t:Ticket)=>nTickets(t)>1?'הצג '+nTickets(t)+' כרטיסים':'הצג כרטיס';
// What one ticket file holds: the tickets of the order it came with (its mail), so a PDF with two tickets says "2 כרטיסים".
function inFile(t:Ticket,f:TFile){const docs=t.files.filter(g=>!/pkpass|image/i.test(g.type+g.name));if(docs.length===1&&docs[0]===f)return {n:nTickets(t),seats:t.seats};
 const p=t.parts?.['m:'+f.msg];const same=docs.filter(g=>g.msg===f.msg).length;if(!p||same!==1)return {n:1,seats:[] as string[]};const seats=cleanSeats(p.seats||[]);return {n:Math.max(p.count||0,seats.length,1),seats};}
const seatShort=(s:string[])=>{if(!s.length)return '';const m=s.map(x=>x.match(/שורה (\S+), כיסא (\d+)/)).filter(Boolean) as RegExpMatchArray[];
 if(m.length===s.length&&m.every(x=>x[1]===m[0][1]))return 'שורה '+m[0][1]+', '+(m.length>1?'כיסאות '+m.map(x=>x[2]).join(', '):'כיסא '+m[0][2]);return s.join(' · ');};
// A venue that is only the hall ("אולם 15", "אולם - אולם 1") gets the place in front of it, from the seller ("סינמטק תל אביב - אולם 1").
function fullVenue(t:Ticket){const v=(t.venue||'').replace(/^\s*(?:אולם|hall)\s*[-–:]\s*(?=(?:אולם|hall)\b)/i,'').trim();
 if(!/^(?:אולם|hall|screen|סטודיו)\s*[\w\u0590-\u05FF]{1,4}$/i.test(v))return t.venue;const p=(t.provider||'').replace(/^(?:Planet Cinema)$/i,'פלאנט').trim();return p&&!/^[\w.+-]+@/.test(p)?p+' - '+v:v;}
const fileLabel=(f:TFile,i:number,n:number,k=1)=>/pkpass/i.test(f.type+f.name)?'הוספה ל-Wallet':/image/.test(f.type)?'ברקוד'+(n>1?' '+(i+1):''):k>1?k+' כרטיסים':'כרטיס'+(n>1&&k<1?' '+(i+1):'');
// Latin runs (with their dashes, commas and colons) are kept together left-to-right inside Hebrew text: "CHAINSAW MAN – THE MOVIE" stays in one piece.
const bidi=(s:string)=>s.replace(/[A-Za-z0-9][A-Za-z0-9 .\/()+&'":,!?–—-]*[A-Za-z0-9)!?]/g,m=>'\u2066'+m+'\u2069');
const NAM=(u:string)=>'gate:names:'+u;
// Events the user marked cancelled by hand (some sellers send no cancellation mail, e.g. a cancel by SMS or at the box office).
const MCX=(u:string)=>'gate:mycx:'+u;
const KEY=(u:string)=>'gate:v12:'+u;const HID=(u:string)=>'gate:hidden:'+u;
const load=<T,>(k:string,d:T):T=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}};
const save=(k:string,v:unknown)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
function addToCalendar(t:Ticket){const f=document.createElement('form');f.method='POST';f.action='/api/ics';
 const v:Record<string,string>={start:t.start,title:t.title,venue:t.venue||'',address:t.address||'',city:t.city||'',seats:t.seats.join('; '),doors:t.doors||'',order:t.order||'',provider:t.provider||'',hours:t.kind==='movie'?'2':'3'};
 for(const [k,val] of Object.entries(v)){const i=document.createElement('input');i.type='hidden';i.name=k;i.value=val;f.appendChild(i);}document.body.appendChild(f);f.submit();f.remove();}
// The U of "Unstage": the same U as Unbox, with a ticket as its lid.
// anim "draw": the U draws itself and the ticket drops on (opening screen); "bob": the ticket lifts and lands (loading).
function Mark({cls,anim}:{cls?:string;anim?:'draw'|'bob'}){const id=anim||'s';return <svg className={'mark'+(anim?' '+anim:'')+(cls?' '+cls:'')} viewBox="100 70 312 392" aria-hidden="true"><defs><linearGradient id={'lg'+id} gradientUnits="userSpaceOnUse" x1="0" y1="430" x2="0" y2="180"><stop offset="0" stopColor="#ff9f2e"/><stop offset="1" stopColor="#ffd27a"/></linearGradient><mask id={'lm'+id} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><rect x="0" y="0" width="512" height="512" fill="#fff"/><circle cx="156" cy="132" r="14.6" fill="#000"/><circle cx="356" cy="132" r="14.6" fill="#000"/></mask></defs><path className="ring" pathLength="100" strokeDasharray={anim==='draw'?'100':undefined} d="M150 214 V320 a106 106 0 0 0 212 0 V210" fill="none" stroke={'url(#lg'+id+')'} strokeWidth="58" strokeLinecap="round">{anim==='draw'&&<animate attributeName="stroke-dashoffset" values="100;0" dur=".85s" fill="freeze" calcMode="spline" keySplines=".6 0 .2 1"/>}</path><g className="tk">{anim==='draw'&&<><animateTransform attributeName="transform" type="translate" values="0 -80;0 6;0 0" keyTimes="0;.75;1" dur=".6s" begin=".6s" fill="freeze" calcMode="spline" keySplines=".2 .9 .3 1;.4 0 .6 1"/><animate attributeName="opacity" values="0;0;1" keyTimes="0;.01;1" dur=".25s" begin=".6s" fill="freeze"/></>}{anim==='bob'&&<animateTransform attributeName="transform" type="translate" values="0 0;0 -60;0 0" dur="1.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>}<g transform="rotate(-10 256 132)" opacity={anim==='draw'?0:1}>{anim==='draw'&&<set attributeName="opacity" to="1" begin=".6s" fill="freeze"/>}<rect x="156" y="89" width="200" height="86" rx="16" fill="#ffd27a" mask={'url(#lm'+id+')'}/><line x1="296" y1="101" x2="296" y2="163" stroke="var(--bg)" strokeWidth="7" strokeDasharray="3 11" strokeLinecap="round"/></g></g></svg>;}
// From Unbox: bottom-sheet chrome (a grab bar to pull down, and a close button), sliding a finger along a row to pick,
// and a full-screen zoom (pinch, drag, double-tap).
function swipeClose(close:()=>void){let y0=0,dy=0;return {
 onTouchStart:(e:React.TouchEvent<HTMLElement>)=>{const el=e.currentTarget;y0=el.scrollTop>0?-1:e.touches[0].clientY;dy=0;},
 onTouchMove:(e:React.TouchEvent<HTMLElement>)=>{if(y0<0)return;dy=Math.max(0,e.touches[0].clientY-y0);e.currentTarget.style.transform=dy?'translateY('+dy+'px)':'';},
 onTouchEnd:(e:React.TouchEvent<HTMLElement>)=>{const el=e.currentTarget;if(dy>90){close();}else{el.style.transition='transform .2s';el.style.transform='';setTimeout(()=>{el.style.transition='';},220);}y0=0;dy=0;}};}
function SheetTop({close}:{close:()=>void}){return <><div className="grab" aria-hidden="true"/><button type="button" className="sheetX" aria-label="סגירה" onClick={close}><X size={20}/></button></>;}
function useRowSlide(){const slideX=useRef<number|null>(null);
 return (count:number,pick:(i:number)=>void)=>({onTouchStart:(e:React.TouchEvent<HTMLElement>)=>{slideX.current=e.touches[0]?.clientX??null;},
  onTouchMove:(e:React.TouchEvent<HTMLElement>)=>{const x=e.touches[0]?.clientX;if(x===undefined)return;if(slideX.current!==null&&Math.abs(x-slideX.current)<12)return;slideX.current=null;
   const r=e.currentTarget.getBoundingClientRect();pick(Math.min(count-1,Math.max(0,Math.floor((r.right-x)/(r.width/count)))));}});}
function Zoom({src,alt,onClose}:{src:string;alt:string;onClose:()=>void}){const [t,setT]=useState({s:1,x:0,y:0});const pts=useRef(new Map<number,{x:number;y:number}>());const start=useRef<{d:number;s:number;mx:number;my:number;x:number;y:number}|null>(null);const last=useRef(0);
 const img=useRef<HTMLImageElement>(null);
 // The photo never slides past its own edge into the black: it can move only as far as its zoomed size overflows the screen.
 const clamp=(v:{s:number;x:number;y:number})=>{const s=Math.min(5,Math.max(1,v.s));if(s===1)return {s,x:0,y:0};const el=img.current;if(!el)return {s,x:v.x,y:v.y};
  const mx=Math.max(0,(el.offsetWidth*s-innerWidth)/2),my=Math.max(0,(el.offsetHeight*s-innerHeight)/2);return {s,x:Math.max(-mx,Math.min(mx,v.x)),y:Math.max(-my,Math.min(my,v.y))};};
 const begin=()=>{const a=[...pts.current.values()];if(a.length===2){start.current={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),s:t.s,mx:(a[0].x+a[1].x)/2,my:(a[0].y+a[1].y)/2,x:t.x,y:t.y};}else if(a.length===1){start.current={d:0,s:t.s,mx:a[0].x,my:a[0].y,x:t.x,y:t.y};}};
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};addEventListener('keydown',k);return()=>removeEventListener('keydown',k);},[onClose]);
 return <div className="zoom" role="dialog" aria-modal="true" aria-label={alt}>
  <button className="zoomX" aria-label="סגירה" onClick={onClose}><X size={26}/></button>
  <div className="zoomArea" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pts.current.set(e.pointerId,{x:e.clientX,y:e.clientY});begin();
    if(pts.current.size===1){const now=Date.now();if(now-last.current<300)setT(v=>{if(v.s>1)return {s:1,x:0,y:0};const el=img.current;const fill=el?Math.max(innerHeight/el.offsetHeight,innerWidth/el.offsetWidth):2.5;return clamp({s:Math.max(1.5,fill),x:0,y:0});});last.current=now;}}}
   onPointerMove={e=>{if(!pts.current.has(e.pointerId)||!start.current)return;pts.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const a=[...pts.current.values()];const st=start.current;
    if(a.length===2&&st.d){const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);const mx=(a[0].x+a[1].x)/2,my=(a[0].y+a[1].y)/2;setT(clamp({s:st.s*d/st.d,x:st.x+mx-st.mx,y:st.y+my-st.my}));}
    else if(a.length===1&&t.s>1)setT(clamp({s:t.s,x:st.x+a[0].x-st.mx,y:st.y+a[0].y-st.my}));}}
   onPointerUp={e=>{pts.current.delete(e.pointerId);begin();}} onPointerCancel={e=>{pts.current.delete(e.pointerId);begin();}}>
   <img ref={img} src={src} alt={alt} referrerPolicy="no-referrer" draggable={false} style={{transform:`translate(${t.x}px,${t.y}px) scale(${t.s})`}}/></div></div>;}

const Logo=()=><Mark/>;
function GoogleButton({label,disabled}:{label:string;disabled?:boolean}){return <button className="gbtn" disabled={disabled}><svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg><span>{label}</span></button>;}
export default function App({user,gmail,configured,login}:{user:User|null;gmail:boolean;configured:boolean;login:()=>Promise<void>}){
 const [store,setStore]=useState<Store>({tickets:[],read:[],updated:''});const [hidden,setHidden]=useState<string[]>([]);const [ready,setReady]=useState(false);
 const [tab,setTab]=useState(0);const [filt,setFilt]=useState<'next'|'past'|'cx'>('next');const [menu,setMenu]=useState<Ticket|null>(null);const [menuView,setMenuView]=useState<TFile[]|null>(null);const press=useRef<{t?:ReturnType<typeof setTimeout>;fired:boolean}>({fired:false});const slide=useRowSlide();const [names,setNames]=useState<Record<string,string>>({});const [mycx,setMycx]=useState<string[]>([]);const [size,setSize]=useState(0);const [q,setQ]=useState('');const [open,setOpen]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);const [prog,setProg]=useState<{pct:number;label:string}|null>(null);const [err,setErr]=useState('');const [toast,setToast]=useState('');
 const running=useRef(false);
 useEffect(()=>{if(!user)return;if(user.id==='demo'){import('@/lib/demo').then(d=>{setStore(d.demo());setReady(true);});return;}setStore(load(KEY(user.id),{tickets:[],read:[],updated:''}));setHidden(load(HID(user.id),[]));setMycx(load(MCX(user.id),[]));setNames(load(NAM(user.id),{}));setSize(load('unstage:size',0));setReady(true);},[user]);
 const say=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),2200);};
 const scan=useCallback(async(fresh=false)=>{if(!user||running.current)return;running.current=true;setBusy(true);setErr('');setProg({pct:3,label:'מתחבר ל־Gmail…'});
  try{const base:Store=fresh?{tickets:[],read:[],updated:''}:load(KEY(user.id),{tickets:[],read:[],updated:''});
   const r=await fetch('/api/tickets',{cache:'no-store'});const j=await r.json().catch(()=>({error:'הסריקה לא הושלמה. נסה שוב.'}));if(!r.ok)throw new Error(j.error||'הסריקה נכשלה');
   const seen=new Set(base.read);const todo=(j.ids as string[]).filter(id=>!seen.has(id));
   // As in Unbox: "נקראו 12 מתוך 40 מיילים חדשים", then "משלים 5 מיילים שלא נקראו…".
   const step=(done:number)=>setProg({pct:todo.length?Math.min(90,Math.round(5+85*done/todo.length)):90,label:todo.length?'נקראו '+done+' מתוך '+todo.length+' מיילים חדשים':'אין מיילים חדשים'});step(0);
   const chunk=(l:string[])=>{const o:string[][]=[];for(let i=0;i<l.length;i+=4)o.push(l.slice(i,i+4));return o;};const batches=chunk(todo);let done=0;const retryIds:string[]=[];let second=false;
   const worker=async()=>{for(let b=batches.shift();b;b=batches.shift()){// A dropped connection (the phone locked, or the app went to the background: Safari says "Load failed") puts this batch back for the second round.
const res=await fetch('/api/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:b,last:second})}).catch(()=>null);const d=res?await res.json().catch(()=>null):null;
     // A batch that timed out (no JSON back) is read again in the second round instead of stopping the whole scan.
     if(!res||!res.ok||!d){if(res&&d&&(res.status===401||res.status===403))throw new Error(d.error);if(!second)retryIds.push(...b);done+=b.length;if(!second)step(done);continue;}
     // Merged into the latest state (not a copy from when the scan began), so a ticket added meanwhile (an SMS) is not lost.
     setStore(s=>{const n={tickets:mergeAll(s.tickets,d.tickets),read:[...s.read,...d.read],updated:s.updated};save(KEY(user.id),n);return n;});if(!second)retryIds.push(...(d.retry||[]));done+=b.length;if(!second)step(done);}second=true;};
   await worker();
   // Mail Gemini could not read yet (busy) is tried again once after a short pause.
   if(retryIds.length){setProg({pct:92,label:'משלים '+retryIds.length+' מיילים שלא נקראו…'});await new Promise(r=>setTimeout(r,25000));batches.push(...chunk(retryIds.splice(0)));await worker();}
   setStore(s=>{const n={...s,updated:new Date().toISOString()};save(KEY(user.id),n);return n;});setProg({pct:100,label:'הסריקה הושלמה'});
  }catch(e){const m=e instanceof Error?e.message:'';setErr(/load failed|failed to fetch|network/i.test(m)||!m?'החיבור נקטע באמצע הסריקה. נסה שוב.':m);}
  finally{running.current=false;setBusy(false);setTimeout(()=>setProg(null),700);}},[user]);
 // Offline: no scan (it would only fail); the tickets on the phone show as they are, and the scan runs when the connection is back.
 const [online,setOnline]=useState(true);
 useEffect(()=>{setOnline(navigator.onLine);const on=()=>{setOnline(true);if(gmail&&user?.id!=='demo')void scan();};const off=()=>setOnline(false);addEventListener('online',on);addEventListener('offline',off);return()=>{removeEventListener('online',on);removeEventListener('offline',off);};},[gmail,user,scan]);
 // The service worker keeps the app and the ticket files for offline use (public/sw.js); it is registered on every open, not only for notifications.
 useEffect(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js?v=2',{updateViaCache:'none'}).catch(()=>{});},[]);
 useEffect(()=>{if(ready&&gmail&&user?.id!=='demo'&&navigator.onLine)scan();},[ready,gmail,scan,user]);
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
 type Srv={enabled:boolean;publicKey?:string;devices?:number;calendar?:string;widget?:string;sms?:string};
 const [srv,setSrv]=useState<Srv|null>(null);const [push,setPush]=useState<'checking'|'install'|'unsupported'|'denied'|'off'|'on'|'busy'>('checking');const [pushMsg,setPushMsg]=useState('');
 useEffect(()=>{if(!user||user.id==='demo')return;void (async()=>{const s:Srv=await fetch('/api/push',{cache:'no-store'}).then(r=>r.json()).catch(()=>({enabled:false}));setSrv(s);
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent),standalone=matchMedia('(display-mode: standalone)').matches||(navigator as {standalone?:boolean}).standalone===true;
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){setPush(ios&&!standalone?'install':'unsupported');return;}
  try{const reg=await navigator.serviceWorker.register('/sw.js?v=2',{updateViaCache:'none'});if(Notification.permission==='denied'){setPush('denied');return;}const sub=await reg.pushManager.getSubscription();setPush(sub&&Notification.permission==='granted'?'on':'off');}catch{setPush('unsupported');}})();},[user]);
 const sendServer=useCallback(async(extra:Record<string,unknown>={})=>{if(!user)return null;const r=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tickets:(()=>{const nm=load(NAM(user.id),{} as Record<string,string>);const mc=load(MCX(user.id),[] as string[]);return load(KEY(user.id),{tickets:[] as Ticket[]}).tickets.map(t=>({...t,...(nm[t.key]?{title:nm[t.key]}:{}),...(mc.includes(t.key)?{cancelled:true}:{})}));})(),hidden:load(HID(user.id),[] as string[]),...extra})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'השמירה נכשלה');return d;},[user]);
 // After every scan, the server copy follows the phone.
 const synced=useRef('');useEffect(()=>{if(!srv?.enabled||!store.tickets.length)return;const sig=store.tickets.length+'|'+store.tickets.filter(t=>t.ai).length+'|'+hidden.length+'|'+JSON.stringify(names).length+'|'+(busy?'':store.updated);if(synced.current===sig)return;const id=setTimeout(()=>{synced.current=sig;sendServer().catch(()=>{});},busy?6000:500);return()=>clearTimeout(id);},[srv,busy,store,hidden.length,names,sendServer]);
 async function enablePush(){setPushMsg('');const perm=await Notification.requestPermission();if(perm!=='granted'){setPush(perm==='denied'?'denied':'off');return;}setPush('busy');
  try{const reg=await navigator.serviceWorker.ready;const key=Uint8Array.from(atob((srv?.publicKey||'').replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});await sendServer({subscription:sub.toJSON()});setPush('on');}
  catch(e){setPush('off');setPushMsg(e instanceof Error?e.message:'לא ניתן להפעיל התראות');}}
 async function disablePush(){setPush('busy');setPushMsg('');try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub){await sendServer({remove:sub.endpoint}).catch(()=>{});await sub.unsubscribe();}}finally{setPush('off');}}
 async function testPush(){setPushMsg('');try{await sendServer({test:true});setPushMsg('נשלחה התראת בדיקה');}catch(e){setPushMsg(e instanceof Error?e.message:'השליחה נכשלה');}}
 const want=useRef<string|null>(null);const [wantTick,setWantTick]=useState(0);
 useEffect(()=>{try{const k=new URLSearchParams(location.search).get('t');if(k){want.current=k;history.replaceState(null,'','/');setWantTick(x=>x+1);}}catch{}},[]);
 // A tapped notification while Unstage was already open or asleep: the worker's message, its cache entry, or the server (asked again a little later).
 useEffect(()=>{const take=(url?:string|null)=>{if(!url)return;try{const k=new URL(url,location.origin).searchParams.get('t');if(k){want.current=k;setWantTick(x=>x+1);}}catch{}};
  const onMsg=(e:MessageEvent)=>{const d=e.data as {type?:string;url?:string};if(d?.type==='open')take(d.url);};
  const fromCache=async()=>{try{if(typeof caches==='undefined')return;const c=await caches.open('unstage-open');const r=await c.match('/__open');if(!r)return;await c.delete('/__open');const d=await r.json() as {url?:string;at?:number};if(Date.now()-(d.at||0)<10*60000)take(d.url);}catch{}};
  const fromServer=async()=>{try{const d=await (await fetch('/api/push?step=want',{cache:'no-store'})).json() as {t?:string|null};if(d?.t){want.current=d.t;setWantTick(x=>x+1);}}catch{}};
  let timers:number[]=[];const look=()=>{void fromCache();timers.forEach(clearTimeout);timers=[0,1500,4000].map(ms=>window.setTimeout(()=>{void fromServer();},ms));};
  const onShow=()=>{if(document.visibilityState==='visible'){look();navigator.serviceWorker?.getRegistration().then(r=>r?.update()).catch(()=>{});}};look();
  navigator.serviceWorker?.addEventListener('message',onMsg);document.addEventListener('visibilitychange',onShow);window.addEventListener('pageshow',onShow);
  return()=>{timers.forEach(clearTimeout);navigator.serviceWorker?.removeEventListener('message',onMsg);document.removeEventListener('visibilitychange',onShow);window.removeEventListener('pageshow',onShow);};},[]);
 // A notification or the widget opens a ticket directly: /?t=<event>.
 useEffect(()=>{const k=want.current;if(!ready||!k)return;if(store.tickets.some(t=>t.key===k)){want.current=null;setOpen(k);}},[ready,store.tickets,wantTick]);
 // "שאל את Unstage": questions about your own events, answered by Gemini from the list on the phone.
 const [askOpen,setAskOpen]=useState(false);const [askDraft,setAskDraft]=useState('');const [chat,setChat]=useState<{role:'user'|'model';text:string}[]>([]);const [asking,setAsking]=useState(false);
 const [canListen,setCanListen]=useState(false);useEffect(()=>{const w=window as unknown as {webkitSpeechRecognition?:unknown;SpeechRecognition?:unknown};setCanListen(!!(w.webkitSpeechRecognition||w.SpeechRecognition));},[]);
 // Tickets that are only a link in the mail (no file): a copy is kept on the server while the link still opens,
 // so they still show after the seller's link expires and can be sent on to someone. A link that cannot be copied is tried again a day later.
 const keeping=useRef(false);
 useEffect(()=>{if(!user||user.id==='demo'||busy||keeping.current)return;
  const TRY='gate:kept-try4:'+user.id;let tried:Record<string,number>={};try{tried=JSON.parse(localStorage.getItem(TRY)||'{}');}catch{}
  // Past events too (once each): many sellers' links still open for a while, and then "הצג הכל" works for them as well.
  // Copies kept as a page before pages built by scripts were caught are checked once more (an empty one is made again).
  const V2='gate:kept-v6:'+user.id;let v2:string[]=[];try{v2=JSON.parse(localStorage.getItem(V2)||'[]');}catch{}
  const todo=store.tickets.filter(t=>!t.cancelled&&t.links.length>0&&!t.files.some(f=>!f.id.startsWith('k_')))
   .flatMap(t=>t.links.filter(l=>!t.files.some(f=>f.id.startsWith('k_')&&f.name.startsWith(l.label.replace(/[^\w\u0590-\u05FF .()-]/g,'').slice(0,40))&&(!/text\/html|svg/.test(f.type)||v2.includes(l.url)))).slice(0,2).map(l=>({msg:t.msgs[0],url:l.url,label:l.label,start:t.start,key:t.key,past:!upcoming(t)})))
   .filter(x=>x.past?!tried[x.url]:Date.now()-(tried[x.url]||0)>864e5).slice(0,8);
  if(!todo.length)return;keeping.current=true;
  void (async()=>{try{for(let i=0;i<todo.length;i+=4){const part=todo.slice(i,i+4);
    const r=await fetch('/api/keep',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:part.map(({msg,url,label,start})=>({msg,url,label,start}))})}).catch(()=>null);
    const d=r?await r.json().catch(()=>null):null;const got=(d?.kept||[]).filter((k:{file?:TFile})=>k.file) as {url:string;file:TFile}[];
    // A copy the server found empty and could not make again is taken away (the link itself stays).
    const drop=(d?.kept||[]).filter((k:{drop?:boolean})=>k.drop).map((k:{url:string})=>k.url) as string[];
    if(drop.length)setStore(s=>{const n={...s,tickets:s.tickets.map(t=>{const gone=part.filter(x=>x.key===t.key&&drop.includes(x.url)).map(x=>x.label.replace(/[^\w\u0590-\u05FF .()-]/g,'').slice(0,40));
      return gone.length&&t.files.some(f=>f.id.startsWith('k_')&&gone.some(l=>f.name.startsWith(l)))?{...t,files:t.files.filter(f=>!(f.id.startsWith('k_')&&gone.some(l=>f.name.startsWith(l))))}:t;})};save(KEY(user.id),n);return n;});
    // Only a link that could not be copied waits a day before the next try; one already kept comes back at once.
    for(const x of part){if(!v2.includes(x.url))v2.push(x.url);if(!got.some(k=>k.url===x.url))tried[x.url]=Date.now();}try{localStorage.setItem(V2,JSON.stringify(v2.slice(-300)));}catch{}try{localStorage.setItem(TRY,JSON.stringify(tried));}catch{}if(!got.length)continue;
    setStore(s=>{const n={...s,tickets:s.tickets.map(t=>{const add=got.filter(k=>part.some(x=>x.key===t.key&&x.url===k.url)).map(k=>k.file).filter(f=>!t.files.some(g=>g.id===f.id));const stem=(n:string)=>n.replace(/\.\w+$/,'');
     return add.length?{...t,files:[...t.files.filter(g=>!(g.id.startsWith('k_')&&add.some(a=>a.msg===g.msg&&stem(a.name)===stem(g.name)))),...add]}:t;})};save(KEY(user.id),n);return n;});}}
   finally{keeping.current=false;}})();},[user,busy,store.tickets]);
 // Tickets that came by SMS (forwarded by the iPhone Shortcut, or pasted): the kept copy is added to its event as the newest ticket of that order.
 // One that matches no event yet waits on the phone until a scan brings the event.
 const storeRef=useRef(store);storeRef.current=store;
 const SMS=(u:string)=>'gate:sms:'+u;const [smsLast,setSmsLast]=useState<{at:string;kind:string;shape?:string;raw?:number}|null>(null);
 const pullSms=useCallback(async()=>{if(!user||user.id==='demo'||!navigator.onLine)return;let got:(SmsTicket&{file?:TFile|null;at:string;info?:PresInfo})[]=[];
  try{const r=await fetch('/api/sms',{cache:'no-store'});if(r.ok){const d=await r.json();got=d.items||[];setSmsLast(d.last||null);}}catch{}
  const waiting=[...got,...load(SMS(user.id),[] as typeof got)].filter((x,i,a)=>x.url&&Date.now()-new Date(x.at).getTime()<60*864e5&&a.findIndex(y=>y.url===x.url&&y.at===x.at)===i);if(!waiting.length)return;
  // Kept on the phone (the server hands each message over once) and applied again on every pull: adding is idempotent,
  // so a ticket survives a scan that was running meanwhile, or a full rescan.
  save(SMS(user.id),waiting.slice(-30));const fix=(x:typeof got[number])=>x.info?.order&&!x.ref?{...x,ref:x.info.order}:x;
  const added=waiting.map(x=>{const m=matchSms(storeRef.current.tickets,fix(x));return m&&x.file&&!m.event.files.some(g=>g.id===x.file!.id)?m.event.title:'';}).find(Boolean)||'';
  setStore(s=>{let tickets=s.tickets;for(const x of waiting){const m=matchSms(tickets,fix(x));if(!m)continue;
    // The page could not be copied (built by scripts, or it asked to sign in): the SMS link itself is added to the event instead.
    if(!x.file){if(waiting.some(y=>y.url===x.url&&y.file))continue;tickets=tickets.map(t=>t.key!==m.event.key||t.links.some(l=>l.url===x.url)?t:{...t,links:[{label:'הכרטיס מ-SMS',url:x.url},...t.links].slice(0,5)});continue;}
    const at=new Date(x.at).getTime();const f:TFile={...x.file,msg:'sms'+at,at,...(m.order?{order:m.order}:{})};
    // Same order: the SMS ticket is the newer one, so the older file of that order steps aside (it stays known, not shown),
    // and its seats (read from the ticket itself) replace that order's seats. The bare SMS link, if added before, goes.
    tickets=tickets.map(t=>{if(t.key!==m.event.key||t.files.some(g=>g.id===f.id))return t;
     let n:Ticket={...t,links:t.links.filter(l=>l.url!==x.url),files:[...t.files.filter(g=>g.msg!==f.msg).map(g=>m.order&&g.order===m.order&&!/pkpass/i.test(g.type+g.name)?{...g,stale:true}:g),f]};
     if(x.info&&x.info.seats.length)n=withSms(n,'m:'+f.msg,at,{...x.info,order:m.order||x.info.order});return n;});}
   const n={...s,tickets};save(KEY(user.id),n);return n;});
  if(added)say('כרטיס מ-SMS נוסף ל'+added);},[user]);
 useEffect(()=>{if(ready&&!busy)void pullSms();},[ready,busy,pullSms]);
 // Tickets added by hand (lib/manual): kept on the server and on the phone, added again on every pull.
 const MAN=(u:string)=>'gate:man:'+u;const GONE=(u:string)=>'gate:man-gone:'+u;const [adding,setAdding]=useState(false);const [editing,setEditing]=useState<ManualItem|null>(null);
 const applyMan=useCallback((items:ManualItem[])=>{if(!user)return;const gone=load(GONE(user.id),[] as string[]);
  setStore(s=>{const tickets=applyManual(s.tickets,items.filter(x=>!gone.includes(x.id)),gone);if(tickets===s.tickets)return s;const n={...s,tickets};save(KEY(user.id),n);return n;});},[user]);
 const pullMan=useCallback(async()=>{if(!user||user.id==='demo')return;let items=load(MAN(user.id),[] as ManualItem[]);
  if(navigator.onLine)try{const r=await fetch('/api/manual',{cache:'no-store'});if(r.ok){const d=await r.json();items=d.items||[];save(MAN(user.id),items);}}catch{}
  if(items.length||load(GONE(user.id),[] as string[]).length)applyMan(items);},[user,applyMan]);
 useEffect(()=>{if(ready&&!busy)void pullMan();},[ready,busy,pullMan]);
 const removeMan=async(t:Ticket)=>{if(!user)return;const ids=t.files.filter(f=>f.msg.startsWith('man')).map(f=>f.msg.slice(3));if(!ids.length)return;
  for(const id of ids)await fetch('/api/manual?id='+encodeURIComponent(id),{method:'DELETE'}).catch(()=>null);
  save(GONE(user.id),[...load(GONE(user.id),[] as string[]),...ids].slice(-200));save(MAN(user.id),load(MAN(user.id),[] as ManualItem[]).filter(x=>!ids.includes(x.id)));
  applyMan([]);close();say('הכרטיס נמחק');};
 // Back in the app after the connection dropped mid-scan: carry on by itself (what was read is kept).
 useEffect(()=>{if(!err.startsWith('החיבור נקטע'))return;const on=()=>{if(document.visibilityState==='visible')void scan();};document.addEventListener('visibilitychange',on);return()=>document.removeEventListener('visibilitychange',on);},[err,scan]);
 // Voice, as in Unbox: the mic lights while listening, a second tap stops it, it stops by itself after 10 seconds (iOS sometimes never ends it).
 const recRef=useRef<any>(null);const [listening,setListening]=useState(false);const [heard,setHeard]=useState('');
 const listen=(done:(t:string)=>void)=>{const W=window as unknown as {webkitSpeechRecognition?:new()=>any;SpeechRecognition?:new()=>any};const R=W.SpeechRecognition||W.webkitSpeechRecognition;if(!R)return;
  if(listening){try{recRef.current?.abort();}catch{}recRef.current=null;setListening(false);return;}
  const r=new R();recRef.current=r;setTimeout(()=>{if(recRef.current===r){try{r.abort();}catch{}recRef.current=null;setListening(false);}},10000);r.lang='he-IL';r.interimResults=false;r.maxAlternatives=1;setListening(true);setHeard('');
  r.onresult=(ev:any)=>{const t=String(ev.results?.[0]?.[0]?.transcript||'');if(t)done(t);};
  r.onerror=(ev:any)=>{if(recRef.current!==r)return;recRef.current=null;setListening(false);if(ev?.error!=='aborted')setHeard('לא שמעתי. נסה שוב.');};r.onend=()=>{if(recRef.current===r)recRef.current=null;setListening(false);};try{r.start();}catch{setListening(false);}};
 // "מתי טארה סטרונג?" / "איפה ההופעה של שלמה ארצי": searches, and answers out loud on screen with the date, time and place.
 const voiceSearch=(said:string)=>{const term=said.replace(/[?؟.!]/g,' ').replace(/^\s*(?:מתי|איפה|מה עם|מה השעה של|באיזו שעה|תגיד(?: לי)? (?:מתי|איפה))\s+/,'').replace(/^(?:ה)?(?:הופעה|הצגה|סרט|הרצאה|אירוע|משחק)(?:\s+של)?\s+/,'').trim();
  if(term.replace(/\s/g,'').length<2||/^(?:נו|אה+|אמ+|כן|לא|אוקיי?|רגע|טוב|יאללה|שלום|היי)$/.test(term)){setHeard('לא הבנתי. נסה לומר שם של אירוע, למשל "מתי טארה סטרונג".');return;}
  setQ(term);const k=term.toLowerCase();const hits=named.filter(t=>!hidden.includes(t.key)&&[t.title,t.venue,t.city,t.provider].some(x=>x?.toLowerCase().includes(k))).sort((a,b)=>Math.abs(when(a).getTime()-Date.now())-Math.abs(when(b).getTime()-Date.now()));
  const say=(t:Ticket)=>t.title+(t.cancelled?' - בוטל':' - '+longDate(t)+(timed(t)?' בשעה '+time(t):'')+(place(t)?', ב'+place(t).replace(/^ב/,''):''));
  setHeard(!hits.length?'לא מצאתי אירוע בשם '+term:hits.length===1?say(hits[0]):'מצאתי '+hits.length+'. '+hits.slice(0,2).map(say).join('. '));};
 async function ask(text?:string){const q=(text??askDraft).trim();if(!q||asking)return;setAskDraft('');const hist=chat;setChat([...hist,{role:'user',text:q}]);setAsking(true);
  const data=named.filter(t=>!hidden.includes(t.key)).map(t=>[t.title,KIND[t.kind].label,t.start.replace('T',' '),[t.venue,t.city].filter(Boolean).join(', '),t.seats.length?'מקומות: '+t.seats.join('; '):'',t.doors?'דלתות '+t.doors:'',t.price?'שולם '+t.price:'',t.cancelled?'בוטל':''].filter(Boolean).join(' | ')).join('\n');
  try{const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q,data,history:hist})});const d=await r.json();
   // Gemini busy or unavailable: the usual questions (seats, time, place) are answered from the events on the phone.
   const local=()=>localAnswer(q,named.filter(t=>!hidden.includes(t.key)));
   setChat(c=>[...c,{role:'model',text:d.answer||local()||(d.error==='busy'?'אני עמוס כרגע, נסה שוב בעוד דקה.':'לא הצלחתי לענות כרגע. אפשר לשאול על מקומות, שעה או מקום של אירוע.')}]);}
  catch{setChat(c=>[...c,{role:'model',text:localAnswer(q,named.filter(t=>!hidden.includes(t.key)))||'לא הצלחתי לענות כרגע.'}]);}finally{setAsking(false);}}
 const splashEl=splash!=='off'&&<div className={'splash'+(splash==='out'?' out':'')} aria-hidden="true"><Mark cls="smark" anim="draw"/><div className="sname" dir="ltr">Unstage</div></div>;
 // Replaced tickets (a newer one came for the same order) are never shown.
 const named=useMemo(()=>store.tickets.filter(t=>t.start).map(t=>({...t,files:current(t),seats:cleanSeats(t.seats),venue:fullVenue(t),kind:fixKind(t.kind==='sport'&&/מדובב|מתורגם|כתוביות|\((?:עברית|אנגלית)\)/.test(t.title)?'movie':t.kind,t.seller,t.title),...(names[t.key]?{title:names[t.key]}:{}),...(mycx.includes(t.key)?{cancelled:true,mine:true}:{})})),[store.tickets,names,mycx]);
 const visible=useMemo(()=>{const s=q.trim().toLowerCase();return named.filter(t=>!hidden.includes(t.key)&&(!s||[t.title,t.venue,t.city,t.provider].some(x=>x?.toLowerCase().includes(s))));},[named,hidden,q]);
 const next=useMemo(()=>visible.filter(t=>upcoming(t)&&!t.cancelled).sort((a,b)=>when(a).getTime()-when(b).getTime()),[visible]);
 const past=useMemo(()=>visible.filter(t=>!upcoming(t)&&!t.cancelled).sort((a,b)=>when(b).getTime()-when(a).getTime()),[visible]);
 // Cancelled events are kept apart from the ones that took place.
 const cxl=useMemo(()=>visible.filter(t=>t.cancelled).sort((a,b)=>when(b).getTime()-when(a).getTime()),[visible]);
 const hero=next[0];
 useEffect(()=>{if(filt==='cx'&&!cxl.length)setFilt('next');},[filt,cxl.length]);
 const sel=named.find(t=>t.key===open);
 // Before the event: the tickets of the next two weeks are fetched onto the phone ahead (while signed in and online), so they open at the door
 // with no signal. Files of events more than two days past are removed from the phone. saved = events whose tickets are all on the phone.
 const [saved,setSaved]=useState<Set<string>>(()=>new Set());
 useEffect(()=>{if(!user||user.id==='demo'||!('caches' in window))return;let off=false;
  const plan=offlinePlan(store.tickets.filter(t=>!hidden.includes(t.key)));
  void (async()=>{try{const c=await caches.open(TICKET_CACHE);
   if(online&&!busy)for(const f of plan.fetch){const u=fileUrl(f);if(!(await c.match(u)))await bytes(u).catch(()=>{});}
   await new Promise(r=>setTimeout(r,400));
   const want=new Set(plan.keep.map(f=>new URL(fileUrl(f),location.origin).href));
   if(!busy)for(const req of await c.keys())if(!want.has(req.url))await c.delete(req);
   const ok=new Set<string>();for(const e of plan.events){let all=true;for(const f of e.files)if(!(await c.match(fileUrl(f)))){all=false;break;}if(all)ok.add(e.key);}
   if(!off)setSaved(ok);}catch{}})();return()=>{off=true;};},[user,store.tickets,hidden,online,busy]);
 useEffect(()=>{const back=()=>setOpen(null);if(open){history.pushState({sheet:1},'');addEventListener('popstate',back);return ()=>removeEventListener('popstate',back);}},[open]);
 const close=()=>{if(history.state?.sheet)history.back();else setOpen(null);};
 const rename=(k:string)=>{if(!user)return;const cur=names[k]||store.tickets.find(t=>t.key===k)?.title||'';const v=prompt('שם לאירוע',cur);if(v===null)return;const n={...names};if(v.trim()&&v.trim()!==store.tickets.find(t=>t.key===k)?.title)n[k]=v.trim().slice(0,120);else delete n[k];setNames(n);save(NAM(user.id),n);say('השם עודכן');};
 const markCx=(k:string)=>{if(!user)return;const on=!mycx.includes(k);const n=on?[...mycx,k]:mycx.filter(x=>x!==k);setMycx(n);save(MCX(user.id),n);say(on?'סומן כבוטל':'הסימון הוסר');void sendServer().catch(()=>{});};
 const hide=(k:string)=>{if(!user)return;const h=[...hidden,k];setHidden(h);save(HID(user.id),h);close();say('האירוע הוסתר');};
 // Long press on an event (as in Unbox): a short menu with what is needed at the door.
 const longPress=(t:Ticket)=>({onTouchStart:()=>{press.current.fired=false;press.current.t=setTimeout(()=>{press.current.fired=true;try{navigator.vibrate?.(15);}catch{}setMenu(t);},480);},
  onTouchMove:()=>{if(press.current.t)clearTimeout(press.current.t);},onTouchEnd:()=>{if(press.current.t)clearTimeout(press.current.t);},
  onContextMenu:(e:React.MouseEvent)=>{e.preventDefault();setMenu(t);},onClick:()=>{if(press.current.fired){press.current.fired=false;return;}setOpen(t.key);}});
 const ago=(iso:string)=>{const m=Math.round((Date.now()-new Date(iso).getTime())/6e4);return m<1?'עודכן עכשיו':m<60?'עודכן לפני '+m+' דק׳':m<1440?'עודכן לפני '+Math.round(m/60)+' שע׳':'עודכן '+new Date(iso).toLocaleDateString('he-IL',{day:'numeric',month:'numeric'});};
 const title=tab===3?'הגדרות':tab===2?'סיכום':tab===1?'השבוע':filt==='past'?'היו':filt==='cx'?'בוטלו':'האירועים שלי';
 const top=(acts:React.ReactNode)=><header className="top"><div className="row"><span className="brand" dir="ltr" aria-label="Unstage"><Logo/><span aria-hidden="true">nstage</span></span><div className="actions">{acts}</div></div><h1>{title}</h1>
  {user&&tab!==3&&prog&&busy&&<div className="progress"><div className="pbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={prog.pct} aria-label="התקדמות הסריקה"><i style={{width:prog.pct+'%'}}/></div><div className="plabel" aria-live="polite"><span>{prog.label}</span><b>{prog.pct}%</b></div></div>}
  {user&&tab!==3&&!(prog&&busy)&&<p className="sub" role="status">{!online?'מצב לא מקוון'+(store.updated?' · עודכן לאחרונה: '+ago(store.updated).replace(/^עודכן /,''):''):busy?'בודק את Gmail…':err?'הסריקה לא הושלמה':store.updated?ago(store.updated):'ממתין לסריקה'}</p>}</header>;
 if(!configured||!user)return <main className="app">{splashEl}{top(null)}
  <section className="panel empty"><TicketIcon size={44}/><h2>כל הכרטיסים שלך במקום אחד</h2><p>{configured?'התחבר עם Google כדי לאסוף את מיילי הכרטיסים מ-Gmail - הופעות, הצגות, סרטים והרצאות.':'חסרים מפתחות בשרת (AUTH_GOOGLE_SECRET, AUTH_SECRET).'}</p><form action={login}><GoogleButton label="התחבר עם Google" disabled={!configured}/></form></section>
  <p className="footnote">קריאה בלבד מ-Gmail. תוכן המיילים לא נשמר.</p></main>;
 const list=filt==='next'?next:filt==='cx'?cxl:past;const week=next.filter(t=>daysTo(t)<=7);
 return <main className={'app'+(sel?' detailOn':'')+(size===1?' large':size===2?' xlarge':'')}>
  {splashEl}
  {pull>0&&!sel&&<div className={'ptr'+(pull>=80?' ready':'')} style={{transform:'translate(-50%,'+Math.max(0,pull-46)+'px)',opacity:Math.min(1,pull/80)}} aria-hidden="true"><RefreshCw style={{transform:'rotate('+pull*3+'deg)'}}/></div>}
  {top(<><button className="ib" aria-label="הוספת כרטיס" onClick={()=>setAdding(true)}><Plus/></button><button className="ib" aria-label="הגדרות" aria-pressed={tab===3} onClick={()=>{setTab(tab===3?0:3);scrollTo({top:0});}}><Settings/></button></>)}
  {tab===0&&store.tickets.length>0&&<div className="tiles" role="tablist" aria-label="סינון אירועים" {...slide(cxl.length?3:2,i=>{const k=(['next','past','cx'] as const)[i];if(k!==filt)setFilt(k);})}>{([['next','קרובים',next.length],['past','היו',past.length],...(cxl.length?[['cx','בוטלו',cxl.length]]:[])] as ['next'|'past'|'cx',string,number][]).map(([k,l,n])=><button key={k} role="tab" aria-selected={filt===k} className={'tile'+(filt===k?' on':'')} onClick={()=>{setFilt(k);scrollTo({top:0});}}><b>{n}</b>{l}</button>)}</div>}
  {!gmail&&<div className="error"><span>נכנסת עם Google, אבל לא אישרת קריאת Gmail.</span><form action={login}><button className="primary">חידוש הרשאת Google</button></form></div>}
  {err&&<div className="error" role="alert"><span>{err}</span><button className="ghost" onClick={()=>scan()}>נסה שוב</button></div>}
  {(tab===0||tab===1)&&<>
   {busy&&!store.tickets.length?<div className="loader" role="status"><Mark cls="lmark" anim="bob"/><p>{prog&&prog.pct>4?'מביא את הכרטיסים שלך…':'בודק את Gmail…'}</p></div>:<>
   {tab===0&&<label className="search"><Search size={20}/><input aria-label="חיפוש אירועים" placeholder="חיפוש אירוע" value={q} onChange={e=>{setQ(e.target.value);setHeard('');}}/><button type="button" className="micBtn askBtn" aria-label="שאל את Unstage" onClick={()=>setAskOpen(true)}><Sparkles size={20}/></button>{canListen&&<button type="button" className={'micBtn'+(listening?' on':'')} aria-label={listening?'מקשיב, דבר עכשיו':'חיפוש בקול: שאל מתי אירוע'} onClick={()=>listen(voiceSearch)}><Mic size={20}/></button>}</label>}
   {tab===0&&heard&&<p className="voiceAnswer" role="status" aria-live="assertive">{heard}</p>}
   {(()=>{const rows=tab===1?week:list;const showHero=tab===0&&filt==='next'&&hero&&!q;const rest=showHero?rows.filter(t=>t.key!==hero.key):rows;
    return <>{showHero&&<Hero t={hero} press={longPress(hero)} onShow={fs=>setMenuView(fs)}/>}
     {showHero&&rest.length>0&&<h3 className="listH">בהמשך</h3>}
     <div className="list">{rest.map((t,i)=><Card key={t.key} t={t} i={i} press={longPress(t)}/>)}</div>
     {!rest.length&&!showHero&&<section className="panel empty">{tab===1?<CalendarDays size={40}/>:filt==='past'?<History size={40}/>:<TicketIcon size={40}/>}<h2>{q?'לא נמצאו אירועים':tab===1?'אין אירועים השבוע':filt==='past'?'עוד אין אירועים שהיו':filt==='cx'?'אין אירועים שבוטלו':'אין אירועים קרובים'}</h2><p>{q?'נסה מילה אחרת.':'כרטיסים חדשים יופיעו כאן לבד.'}</p></section>}</>;})()}</>}
  </>}
  {tab===2&&<Summary list={visible}/>}
  {tab===3&&<SettingsView smsLast={smsLast} onSmsPasted={()=>void pullSms()} size={size} onSize={(i:number)=>{setSize(i);save('unstage:size',i);}} user={user} srv={srv} push={push} pushMsg={pushMsg} onPush={push==='on'?disablePush:enablePush} onTest={testPush} onCopy={(t:string)=>{navigator.clipboard?.writeText(t).then(()=>say('הועתק'),()=>{});}} hiddenCount={hidden.length} onRestore={()=>{setHidden([]);save(HID(user.id),[]);say('כל האירועים חזרו');}} onRescan={()=>{save(KEY(user.id),{tickets:[],read:[],updated:''});setStore({tickets:[],read:[],updated:''});setTab(0);scan(true);}}/>}
  {editing&&user&&<AddTicket edit={editing} events={named.filter(t=>upcoming(t)&&!t.cancelled)} onClose={()=>setEditing(null)} onSaved={(x:ManualItem)=>{save(MAN(user.id),load(MAN(user.id),[] as ManualItem[]).map(y=>y.id===x.id?x:y));applyMan([x]);setEditing(null);say('השינויים נשמרו');}}/>}
  {adding&&user&&<AddTicket events={named.filter(t=>upcoming(t)&&!t.cancelled)} onClose={()=>setAdding(false)} onSaved={(x:ManualItem)=>{save(MAN(user.id),[...load(MAN(user.id),[] as ManualItem[]),x]);applyMan([x]);setAdding(false);say('הכרטיס נוסף');}}/>}
  {sel&&<Sheet t={sel} onRemoveManual={()=>void removeMan(sel)} onEditManual={()=>{const ids=sel.files.filter(f=>f.msg.startsWith('man')).map(f=>f.msg.slice(3));void (async()=>{let it=load(MAN(user!.id),[] as ManualItem[]).find(x=>ids.includes(x.id));
   if(!it)try{const d=await fetch('/api/manual',{cache:'no-store'}).then(r=>r.json());save(MAN(user!.id),d.items||[]);it=(d.items||[]).find((x:ManualItem)=>ids.includes(x.id));}catch{}
   if(it)setEditing(it);else say('לא מצאתי את הכרטיס. נסה שוב בעוד רגע.');})();}} saved={saved.has(sel.key)} me={user?.name?.split(' ')[0]||''} onClose={close} onRename={()=>rename(sel.key)} onHide={()=>hide(sel.key)} onMarkCx={()=>markCx(sel.key)} onCopy={()=>say('הועתק')}/>}
  {askOpen&&<div className="menuWrap" onClick={()=>setAskOpen(false)}><div className="menu askSheet" role="dialog" aria-modal="true" aria-label="שאל את Unstage" onClick={e=>e.stopPropagation()} {...swipeClose(()=>setAskOpen(false))}><div className="grab" aria-hidden="true"/>
   <div className="askHead"><h3><Sparkles size={19}/>שאל את Unstage</h3><button className="ib" aria-label="סגירה" onClick={()=>setAskOpen(false)}><X/></button></div>
   <div className="askList" aria-live="polite">{!chat.length&&<div className="askHints">{['מה האירוע הבא שלי?','כמה הוצאתי על כרטיסים השנה?','באיזה שורה אני יושב בהופעה הבאה?','מה יש לי החודש?'].map(h=><button key={h} onClick={()=>ask(h)}>{h}</button>)}</div>}
    {chat.map((m,i)=><p key={i} className={'askMsg '+m.role}>{m.text}</p>)}{asking&&<p className="askMsg model">…</p>}</div>
   <form className="askBar" onSubmit={e=>{e.preventDefault();void ask();}}><input aria-label="השאלה שלך" placeholder="שאל על האירועים שלך" value={askDraft} onChange={e=>setAskDraft(e.target.value)}/>{canListen&&<button type="button" className="ib" aria-label="לשאול בקול" onClick={()=>listen(t=>void ask(t))}><Mic/></button>}<button className="ib" aria-label="שליחה" disabled={!askDraft.trim()||asking}><Send/></button></form>
  </div></div>}
  {menu&&<div className="menuWrap" onClick={()=>setMenu(null)}><div className="menu" role="dialog" aria-modal="true" aria-label={'פעולות: '+menu.title} onClick={e=>e.stopPropagation()} {...swipeClose(()=>setMenu(null))}><SheetTop close={()=>setMenu(null)}/>
   <p className="menuTitle">{bidi(menu.title)}</p>
   {(()=>{const fs=menu.files.filter(f=>!/pkpass/i.test(f.type+f.name));return fs.length>0&&<button onClick={()=>{setMenuView(fs);}}><QrCode size={20}/> {showLabel(menu)}</button>;})()}
   {where(menu)&&<div className="menuNav"><NavLinks q={where(menu)}/></div>}
   {upcoming(menu)&&!menu.cancelled&&<button onClick={()=>{addToCalendar(menu);setMenu(null);}}><CalendarPlus size={20}/> הוספה ליומן</button>}
   {menu.order&&<button onClick={()=>{navigator.clipboard?.writeText(menu.order!).then(()=>say('הועתק'),()=>{});setMenu(null);}}><Copy size={20}/> העתק מספר הזמנה</button>}
   {'share' in navigator&&<button onClick={()=>{navigator.share({title:menu.title,text:[menu.title,longDate(menu)+(timed(menu)?' בשעה '+time(menu):''),place(menu)].filter(Boolean).join('\n')}).catch(()=>{});setMenu(null);}}><Share2 size={20}/> שיתוף</button>}
   <button onClick={()=>{const k=menu.key;setMenu(null);rename(k);}}><Pencil size={20}/> שינוי שם</button>
   <button onClick={()=>{const k=menu.key;setMenu(null);hide(k);}}><EyeOff size={20}/> הסתר, זה לא כרטיס</button>
  </div></div>}
  {menuView&&<Viewer fs={menuView} onClose={()=>{setMenuView(null);setMenu(null);}}/>}
  {toast&&<div className="toast" role="status">{toast}</div>}
  {!sel&&<nav className={(navDrag!==null?'dragging':'')+(tab===3&&navDrag===null?' none':'')} style={{['--tab' as string]:navDrag??tab}} aria-label="ניווט" onTouchStart={e=>navSlide(e,false)} onTouchMove={e=>navSlide(e,true)} onTouchEnd={()=>setNavDrag(null)} onTouchCancel={()=>setNavDrag(null)}>{[['אירועים',TicketIcon],['השבוע',CalendarDays],['סיכום',ChartColumn]].map(([l,I],i)=>{const Ic=I as typeof Music;return <button key={i} className={tab===i?'selected':''} aria-current={tab===i?'page':undefined} onClick={()=>{setTab(i);scrollTo({top:0});}}><Ic/><span>{l as string}</span></button>;})}</nav>}
 </main>;}
// Hero card like Unbox's: a ring that fills up from the purchase to the event, the date tile, and the event's details.
function DateTile({t}:{t:Ticket}){const d=when(t);const n=daysTo(t);return <div className={'date'+(n===0?' today':'')} aria-hidden="true"><small>{n===0?'היום':DAY_SHORT[d.getDay()]}</small><b>{d.getDate()}</b><span>{MON_SHORT[d.getMonth()]}{d.getFullYear()!==new Date().getFullYear()?' '+String(d.getFullYear()).slice(2):''}</span></div>;}
function Hero({t,press,onShow}:{t:Ticket;press:Press;onShow:(fs:TFile[])=>void}){useEffect(()=>{const pdfs=t.files.filter(f=>/pdf/i.test(f.type+f.name));if(pdfs.length){void pdfLib().catch(()=>{});pdfs.slice(0,4).forEach(f=>void bytes(fileUrl(f)).catch(()=>{}));}},[t]);const [big,unit]=countdown(t);const K=KIND[t.kind];const C=2*Math.PI*40;
 const at=when(t).getTime();const T=Math.max(.06,Math.min(1,(Date.now()-t.mailed)/Math.max(1,at-t.mailed)));
 return <button className="nextCard nc-ring" {...press} aria-label={'האירוע הבא: '+t.title+', '+big+' '+unit}>
  <div className="nc-k nc-top">האירוע הבא · {K.label}</div>
  <div className="nc-row"><svg className="ring" viewBox="0 0 92 92" aria-hidden="true"><defs><linearGradient id="ncg"><stop offset="0" stopColor="#ffd27a"/><stop offset="1" stopColor="#ff9f2e"/></linearGradient></defs>
   <circle cx="46" cy="46" r="40" fill="none" stroke="#ffffff18" strokeWidth="8"/><circle cx="46" cy="46" r="40" fill="none" stroke="url(#ncg)" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-T)} transform="rotate(-90 46 46)"/>
   <text x="46" y={unit?50:55} fill="#fff" fontSize={big.length>3?20:big.length>2?26:34} fontWeight="700" textAnchor="middle">{big}</text>{unit&&<text x="46" y="68" fill="#ffd79a" fontSize="11" textAnchor="middle">{unit.split(' ')[0]}</text>}</svg>
   <div className="nc-info"/><DateTile t={t}/></div>
  <div className="nc-nm nc-full">{bidi(t.title)}</div>
  <div className="nc-chips" aria-hidden="true">{timed(t)&&<span>{time(t)}</span>}{place(t)&&<span>{bidi(place(t))}</span>}{t.seats.length>0&&<span>{t.seats.length===1?t.seats[0]:t.seats.length+' מקומות'}</span>}</div>
  {/* "הצג כרטיס" opens the tickets themselves, all of them, straight away (the rest of the card opens the event). */}
  {t.files.length>0&&!t.cancelled&&<div className="nc-go" role="button" tabIndex={0} onClick={e=>{e.stopPropagation();onShow(t.files.filter(f=>!/pkpass/i.test(f.type+f.name)));}} onTouchStart={e=>e.stopPropagation()}><QrCode size={20}/>{showLabel(t)}</div>}
 </button>;}
// Cancelling: the terms as the mail states them (or the seller's, or the law's), the deadline, and a way to do it.
function CancelBox({t}:{t:Ticket}){const s=sellerCancel(t);const text=t.cancel?.text||s?.note||LAW.note;const url=t.cancel?.url||s?.url||(!t.cancel?.text&&!s?LAW.url:undefined);
 const label=t.cancel?.url?(t.cancel.label&&t.cancel.label.length<24?t.cancel.label:'לביטול ההזמנה'):s?.label||LAW.label;const c=contacts(t.cancel?.text||'');const tel=s?.tel||c.tel;const mail=s?.mail||c.mail;
 const end=s?.hours&&t.start.includes('T')?new Date(when(t).getTime()-s.hours*36e5):null;const late=!!end&&end.getTime()<Date.now();
 return <div className="box cancelBox"><h3><RotateCcw/>ביטול</h3>
  {end&&<p className={'cxWhen'+(late?' late':'')}>{late?'עבר המועד לביטול':'אפשר לבטל עד '+end.toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'numeric'})+' בשעה '+end.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</p>}
  <p className="setNote">{text}</p>
  <div className="cxBtns">{url&&<a className="ghost" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={18}/>{label}</a>}
   {tel&&<a className="ghost" href={'tel:'+tel.replace(/-/g,'').replace('*','%2A')}><Smartphone size={18}/><span dir="ltr">{tel}</span></a>}
   {s?.wa&&<a className="ghost" href={'https://wa.me/'+s.wa} target="_blank" rel="noopener noreferrer"><Send size={18}/>וואטסאפ</a>}
   {mail&&<a className="ghost" href={'mailto:'+mail+'?subject='+encodeURIComponent('ביטול הזמנה'+(t.order?' '+t.order.split(', ')[0]:''))}><Mail size={18}/>מייל</a>}</div></div>;}
// "שלח כרטיס למישהו": pick which tickets, get a personal link that opens only them (no sign-in) and stops after the event.
function Gift({t,me,onClose}:{t:Ticket;me:string;onClose:()=>void}){const docs=t.files.filter(f=>!/pkpass/i.test(f.type+f.name));const opts=docs.length?docs:[];
 const [pick,setPick]=useState<Set<number>>(()=>new Set(opts.map((_,i)=>i)));const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');const [url,setUrl]=useState('');
 const chosen=opts.filter((_,i)=>pick.has(i));const info=chosen.map(f=>inFile(t,f));const all=chosen.length===opts.length;
 const seats=all?t.seats:cleanSeats(info.flatMap(x=>x.seats));const count=all?nTickets(t):Math.max(1,info.reduce((a,x)=>a+x.n,0));
 const make=async()=>{setBusy(true);setMsg('');try{const files=[...chosen,...(all?t.files.filter(f=>/pkpass/i.test(f.type+f.name)):[])].map(f=>({msg:f.msg,id:f.id,name:f.name,type:f.type}));
   const r=await fetch('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t.title,kind:t.kind,start:t.start,venue:t.venue,city:t.city,address:t.address,doors:t.doors,seats,count,files,links:opts.length?[]:t.links.slice(0,4),from:me||undefined})});
   const d=await r.json().catch(()=>({}));if(!r.ok||!d.url)throw new Error(d.error||'לא הצלחתי ליצור קישור');setUrl(d.url);
   const text=(count>1?count+' כרטיסים ל':'כרטיס ל')+t.title+' - '+longDate(t)+(timed(t)?' בשעה '+time(t):'');
   if(navigator.share)await navigator.share({title:t.title,text,url:d.url}).catch(()=>{});else{await navigator.clipboard?.writeText(d.url).catch(()=>{});setMsg('הקישור הועתק');}}
  catch(e){setMsg(e instanceof Error?e.message:'לא הצלחתי ליצור קישור');}finally{setBusy(false);}};
 return <div className="menuWrap" onClick={onClose}><div className="menu" role="dialog" aria-modal="true" aria-label={nTickets(t)>1?'שליחת כרטיסים':'שליחת כרטיס'} onClick={e=>e.stopPropagation()} {...swipeClose(onClose)}><SheetTop close={onClose}/>
  <h2 style={{margin:'4px 0 6px',fontSize:'calc(20px*var(--fs))'}}>{nTickets(t)>1?'שליחת כרטיסים':'שליחת כרטיס'}</h2>
  <p className="setNote" style={{marginTop:0}}>מי שיקבל את הקישור יראה רק את האירוע הזה ואת הכרטיסים שתבחר, בלי להתחבר. הקישור יפסיק לעבוד אחרי האירוע.</p>
  {opts.length>1&&<div className="giftPick">{opts.map((f,i)=>{const x=inFile(t,f);const on=pick.has(i);return <button key={f.msg+f.id} className={'giftOpt'+(on?' on':'')} aria-pressed={on} onClick={()=>{const n=new Set(pick);on?n.delete(i):n.add(i);setPick(n);setUrl('');}}>
   <span className="chk">{on&&<Check size={16}/>}</span><span>{x.n>1?x.n+' כרטיסים':'כרטיס'}</span><small>{seatShort(x.seats)}</small></button>;})}</div>}
  <button className="primary" disabled={busy||(opts.length>0&&!chosen.length)} onClick={make}><Send size={19}/>{busy?'יוצר קישור…':url?'שלח שוב':'שלח '+(count>1?count+' כרטיסים':'כרטיס')}</button>
  {url&&<button className="ghost" style={{marginTop:8}} onClick={()=>{void navigator.clipboard?.writeText(url);setMsg('הקישור הועתק');}}><Copy size={18}/>העתקת הקישור</button>}
  {msg&&<p className="setNote" role="status" style={{textAlign:'center'}}>{msg}</p>}
 </div></div>;}
// Tickets by SMS, as Unbox does it: an iPhone Shortcut forwards every message with "כרטיס" to the personal link. A message can also be pasted here.
function SmsSet({link,last,onCopy,onPasted,android}:{android?:boolean;link:string;last:{at:string;kind:string;shape?:string;raw?:number}|null;onCopy:(t:string)=>void;onPasted:()=>void}){const [text,setText]=useState('');const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);
 const paste=async()=>{if(!text.trim())return;setBusy(true);setMsg('');try{const r=await fetch(link,{method:'POST',headers:{'Content-Type':'text/plain'},body:text});const d=await r.json().catch(()=>({}));
   setMsg(!d.ticket?'לא מצאתי בהודעה קישור לכרטיס.':d.kept?'הכרטיס נשמר ✓':'קיבלתי את ההודעה, אבל לא הצלחתי לפתוח את הקישור לכרטיס.');if(d.ticket){setText('');onPasted();}}catch{setMsg('לא הצלחתי לשלוח. נסה שוב.');}finally{setBusy(false);}};
 return <details className="set setFold"><summary><h3><Smartphone size={18}/>כרטיסים מ-SMS</h3>{last?.kind==='ticket'&&<span className="bstate on">מוגדר ✓</span>}<ChevronLeft className="foldIc" size={20} aria-hidden="true"/></summary>
  {!android&&<><p className="setNote">יש מקומות ששולחים את הכרטיס ב-SMS ולא במייל, כמו הסינמטק. הכרטיס נשמר ומצטרף לאירוע שלו. מגדירים פעם אחת באפליקציית קיצורי הדרך:</p>
  <ol className="steps2"><li>קיצורים ← אוטומציה ← אוטומציה חדשה ← <b>הודעה</b>.</li><li>"ההודעה מכילה": <b>כרטיס</b>. בחר <b>הרץ מיד</b>.</li><li>פעולה: <b>קבל תוכן של URL</b>. בכתובת הדבק את הקישור האישי, שיטה <b>POST</b>, גוף בקשה <b>טקסט</b> = תוכן ההודעה.</li></ol>
  <button className="ghost" onClick={()=>onCopy(link)}><Copy size={18}/>העתקת הקישור האישי</button></>}
  <p className="setNote" role="status">{last?'הודעה אחרונה הגיעה ב־'+new Date(last.at).toLocaleString('he-IL',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})+(last.kind==='ticket'?' וזוהתה ככרטיס ✓':last.kind==='empty'?', אבל בלי טקסט (הקיצור שלח '+(last.raw??0)+' תווים'+(last.shape?', '+last.shape:'')+')':', אבל לא נמצא בה קישור לכרטיס'):'עדיין לא הגיעה אף הודעה מהקיצור.'}</p>
  <label className="setNote" htmlFor="smsPaste" style={{display:'block',marginTop:10}}>{android?'יש מקומות ששולחים את הכרטיס ב-SMS ולא במייל. הדבק כאן הודעה כזו:':'או הדבק כאן הודעה עם כרטיס:'}</label>
  <textarea id="smsPaste" className="smsBox" rows={3} value={text} onChange={e=>setText(e.target.value)} placeholder="מצורפים הכרטיסים שהזמנת…"/>
  <button className="ghost" disabled={busy||!text.trim()} onClick={paste}><Send size={18}/>{busy?'שומר…':'הוספת הכרטיס'}</button>
  {msg&&<p className="setNote" role="status">{msg}</p>}
  {!android&&<p className="setNote">הקישור אישי. אל תשתף אותו.</p>}</details>;}
type Press=Record<string,unknown>;
function Card({t,i=0,press}:{t:Ticket;i?:number;press:Press}){const n=daysTo(t);const K=KIND[t.kind];
 return <button className={'card'+(n===0?' focus':'')+(n<0?' past':'')+(t.cancelled?' cx':'')} style={{['--i' as string]:Math.min(i,8)}} {...press} aria-label={t.title+', '+longDate(t)}><div className="c">
  <DateTile t={t}/>
  <div className="info"><div className="nm">{bidi(t.title)}</div>{place(t)&&<div className="meta"><span>{bidi(place(t))}</span></div>}
   <div className="st">{t.cancelled?<span className="pill bad">בוטל</span>:<span className={'pill'+(n===0?' warn':n<0?' ok':'')}><K.Icon/>{K.label}</span>}{timed(t)&&<span className="eta"><b>{time(t)}</b></span>}
    {n>0&&n<=14&&!t.cancelled&&<span className="eta">{n===1?<b>מחר</b>:<>בעוד <b>{n} ימים</b></>}</span>}{t.files.length>0&&!t.cancelled&&<span className="eta">🎟 {nTickets(t)>1?nTickets(t)+' כרטיסים':'כרטיס'}</span>}</div></div></div></button>;}
function Sheet({t,saved,me,onClose,onRename,onHide,onMarkCx,onCopy,onRemoveManual,onEditManual}:{onRemoveManual:()=>void;onEditManual:()=>void;t:Ticket&{mine?:boolean};saved:boolean;me:string;onClose:()=>void;onRename:()=>void;onHide:()=>void;onMarkCx:()=>void;onCopy:()=>void}){const [view,setView]=useState<TFile[]|null>(null);const [gift,setGift]=useState(false);useEffect(()=>{if(t.files.some(f=>/pdf/i.test(f.type+f.name)))pdfLib().catch(()=>{});},[t]);const K=KIND[t.kind];const [n,u]=countdown(t);const w=where(t);
 useEffect(()=>{scrollTo({top:0});},[]);
 const copy=(s:string)=>{navigator.clipboard?.writeText(s).then(onCopy,()=>{});};
 return <div className="sheet" role="dialog" aria-label={t.title}>
  {view&&<Viewer fs={view} onClose={()=>setView(null)}/>}
  {gift&&<Gift t={t} me={me} onClose={()=>setGift(false)}/>}
  <div className="sheetTop"><button className="ib" onClick={onClose} aria-label="חזרה"><ChevronRight/></button><div className="actions">{typeof navigator!=='undefined'&&'share' in navigator&&<button className="ib" aria-label="שיתוף" onClick={()=>navigator.share({title:t.title,text:[t.title,longDate(t)+(timed(t)?' בשעה '+time(t):''),place(t)].filter(Boolean).join('\n')}).catch(()=>{})}><Share2/></button>}<button className="ib" onClick={onRename} aria-label="שינוי שם"><Pencil/></button></div></div>
  <div className="stub"><div className="k"><K.Icon size={17}/>{K.label}{t.provider&&' · '+t.provider}</div><h2>{bidi(t.title)}</h2>
   <div className="when"><div><span>תאריך</span><b>{longDate(t)}</b></div>{timed(t)&&<div><span>שעה</span><b>{time(t)}</b></div>}{t.doors&&<div><span>דלתות</span><b>{t.doors}</b></div>}</div>
   <div className="perf"/>{t.cancelled?<div className="cd"><b style={{color:'var(--bad)'}}>בוטל</b></div>:<div className="cd"><b>{n}</b><span>{u}</span></div>}</div>
  {!t.cancelled&&t.parts&&status(t.parts).some&&<p className="setNote" style={{color:'var(--bad)',textAlign:'center'}}>חלק מההזמנות בוטלו. הכרטיסים והמחיר כאן הם רק של מה שבתוקף.</p>}
  {t.cancelled&&<div className="box"><p className="setNote" style={{margin:0,color:'var(--bad)'}}>ההזמנה בוטלה, והכרטיסים שלה כבר לא בתוקף.</p></div>}
  {!t.cancelled&&t.files.length>0&&<div className="box"><h3><QrCode/>{nTickets(t)>1?'הכרטיסים':'הכרטיס'}</h3><div className="files">{(()=>{const docs=t.files.filter(f=>!/pkpass/i.test(f.type+f.name));return docs.length>1&&<button className="file all" onClick={()=>setView(docs)}><QrCode size={22}/><span>{'הצג הכל ('+nTickets(t)+' כרטיסים)'}</span></button>;})()}{t.files.map((f,i)=>{const I=fileIcon(f);return /pkpass/i.test(f.type+f.name)?<a key={f.msg+f.id} className="file" href={fileUrl(f)}><I size={22}/><span>{fileLabel(f,i,t.files.length)}</span></a>:(()=>{const x=inFile(t,f);return <button key={f.msg+f.id} className="file" onClick={()=>setView([f])}><I size={22}/><span>{fileLabel(f,i,t.files.length,x.n)}</span><small>{seatShort(x.seats)||(f.name.length<28?f.name:'')}</small></button>;})();})}{t.links.filter(l=>l.label==='הכרטיס מ-SMS').map(l=><a key={l.url} className="file" href={l.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={22}/><span>הכרטיס מ-SMS</span></a>)}</div></div>}
  {!t.cancelled&&t.files.length===0&&t.links.length>0&&<div className="box"><h3><TicketIcon/>{nTickets(t)>1?'הכרטיסים':'הכרטיס'}</h3><div className="files">{t.links.map((l,i,a)=>{// Several orders' links all say "לחצו כאן לקבלת הכרטיסים": each says how many tickets it opens and which seats.
   const same=a.filter(x=>x.label===l.label).length>1;const p=l.msg?t.parts?.['m:'+l.msg]:undefined;const seats=p?cleanSeats(p.seats||[]):[];const n=p?Math.max(p.count||0,seats.length,1):0;
   return <a key={l.url} className="file" href={l.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={22}/><span>{same?(n?(n>1?n+' כרטיסים':'כרטיס'):'הכרטיסים '+(i+1)):l.label}</span>{same&&seats.length>0&&<small>{seatShort(seats)}</small>}</a>;})}</div></div>}
  {w&&<div className="box"><h3><MapPin/>מקום</h3>{t.venue&&<p className="place">{bidi(t.venue)}</p>}{(t.address||t.city)&&<p className="addr">{bidi([t.address,t.city].filter(Boolean).join(', '))}</p>}
   <NavLinks q={w}/></div>}
  {t.seats.length>0&&<div className="box"><h3><Armchair/>{t.seats.length===1?'המקום שלך':t.seats.length+' מקומות'}</h3><ul className="seats">{t.seats.map((s,i)=><li key={i}><i>{i+1}</i>{s}</li>)}</ul></div>}
  {(t.order||t.count||t.price)&&<div className="box"><h3><TicketIcon/>פרטי ההזמנה</h3>
   {t.order&&t.order.split(', ').map((o,i,a)=><div className="kv" key={o}><span>{a.length>1?'הזמנה '+(i+1):'מספר הזמנה'}</span><button className="copy" onClick={()=>copy(o)}><b dir="ltr">{o}</b><Copy size={17}/></button></div>)}
   {t.count&&<div className="kv"><span>{t.count===1?'כרטיס':'כרטיסים'}</span><b style={{color:'var(--ink)'}}><Users size={16} style={{verticalAlign:-3,marginLeft:5}}/>{t.count}</b></div>}
   {t.price&&<div className="kv"><span>שולם</span><b style={{color:'var(--ink)'}} dir="ltr">{t.price}</b></div>}
   {t.doors&&<div className="kv"><span>פתיחת דלתות</span><b style={{color:'var(--ink)'}}><DoorOpen size={16} style={{verticalAlign:-3,marginLeft:5}}/>{t.doors}</b></div>}</div>}
  {upcoming(t)&&!t.cancelled&&t.files.some(f=>!/pkpass/i.test(f.type+f.name))&&<p className={'offNote'+(saved?' ok':'')} role="status">{saved?'✓ הכרטיס שמור במכשיר, וזמין גם בלי אינטרנט.':'כדאי לפתוח את הכרטיס עכשיו כדי שיהיה זמין גם בלי אינטרנט.'}</p>}
  {upcoming(t)&&!t.cancelled&&<CancelBox t={t}/>}
  <div className="sheetActions">
   {upcoming(t)&&!t.cancelled&&(t.files.length>0||t.links.length>0)&&<button className="ghost" onClick={()=>setGift(true)}><Send size={19}/>שלח כרטיס למישהו</button>}
   {upcoming(t)&&!t.cancelled&&<button className="primary" onClick={()=>addToCalendar(t)}><CalendarPlus size={20}/>הוספה ליומן עם תזכורת</button>}
   {t.thread&&<a className="ghost" href={'https://mail.google.com/mail/u/0/#all/'+t.thread} target="_blank" rel="noopener"><Mail size={19}/>פתיחת המייל</a>}</div>
  {t.files.some(f=>f.msg.startsWith('man'))&&<button className="textBtn" onClick={onEditManual}><Pencil size={16} style={{verticalAlign:-3,marginLeft:6}}/>עריכת הכרטיס שהוספתי</button>}
  {t.files.some(f=>f.msg.startsWith('man'))&&<button className="textBtn" onClick={()=>{if(confirm('למחוק את הכרטיס שהוספת?'))onRemoveManual();}}><Trash2 size={16} style={{verticalAlign:-3,marginLeft:6}}/>מחיקת הכרטיס שהוספתי</button>}
  {(!t.cancelled||t.mine)&&<button className="textBtn" onClick={onMarkCx}><RotateCcw size={16} style={{verticalAlign:-3,marginLeft:6}}/>{t.mine?'לא ביטלתי - הסר את הסימון':'ביטלתי את ההזמנה - סמן כבוטל'}</button>}
  <button className="textBtn" onClick={onHide}><EyeOff size={16} style={{verticalAlign:-3,marginLeft:6}}/>זה לא כרטיס - הסתר</button>
 </div>;}
// "הוספת כרטיס": a ticket that came as a picture or PDF (WhatsApp, PayBox), uploaded or pasted. Gemini fills in the details
// from the picture when it can; the user checks them, and can add the ticket to an event already in the list.
const KIND_KEYS:Kind[]=['concert','show','movie','lecture','sport','standup','festival','party','other'];
// Smart crop: a screenshot of a picture (WhatsApp shows it on black) loses the plain margins around the ticket.
// The margin colour is taken from the corners; rows and columns with almost nothing else in them are cut away.
function trimBox(img:CanvasImageSource,w:number,h:number){const k=Math.min(1,400/Math.max(w,h));const cw=Math.max(1,Math.round(w*k)),ch=Math.max(1,Math.round(h*k));
 const c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d',{willReadFrequently:true})!;x.drawImage(img,0,0,cw,ch);const d=x.getImageData(0,0,cw,ch).data;
 const px=(i:number,j:number)=>(j*cw+i)*4;const corners=[px(0,0),px(cw-1,0),px(0,ch-1),px(cw-1,ch-1)];const bg=[0,1,2].map(n=>corners.reduce((a,i)=>a+d[i+n],0)/4);
 if(corners.some(i=>Math.abs(d[i]-bg[0])+Math.abs(d[i+1]-bg[1])+Math.abs(d[i+2]-bg[2])>60))return null;// corners differ: no plain margin
 const off=(i:number,j:number)=>{const p=px(i,j);return Math.abs(d[p]-bg[0])+Math.abs(d[p+1]-bg[1])+Math.abs(d[p+2]-bg[2])>60;};
 const row=(j:number)=>{let n=0;for(let i=0;i<cw;i++)if(off(i,j))n++;return n>Math.max(2,cw*0.02);};const col=(i:number)=>{let n=0;for(let j=0;j<ch;j++)if(off(i,j))n++;return n>Math.max(2,ch*0.02);};
 let t=0,b=ch-1,l=0,r=cw-1;while(t<b&&!row(t))t++;while(b>t&&!row(b))b--;while(l<r&&!col(l))l++;while(r>l&&!col(r))r--;
 if(b-t<ch*0.08||r-l<cw*0.08)return null;const box={x:Math.max(0,(l-1)/k),y:Math.max(0,(t-1)/k),w:Math.min(w,(r-l+3)/k),h:Math.min(h,(b-t+3)/k)};
 return box.w*box.h<w*h*0.92?box:null;}
type Prep={data:string;type:string;url:string;cropped:boolean};
async function prepare(file:Blob,crop=true):Promise<Prep>{const b64=(b:Blob)=>new Promise<string>((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]||'');r.onerror=no;r.readAsDataURL(b);});
 if(file.type==='application/pdf'||file.type==='image/gif')return {data:await b64(file),type:file.type,url:URL.createObjectURL(file),cropped:false};
 // Pictures (screenshots, HEIC photos) as JPEG at most 2000px: small enough to keep, sharp enough for the barcode.
 const bmp=await createImageBitmap(file);const box=crop?trimBox(bmp,bmp.width,bmp.height):null;const src=box||{x:0,y:0,w:bmp.width,h:bmp.height};
 const k=Math.min(1,2000/Math.max(src.w,src.h));const c=document.createElement('canvas');c.width=Math.round(src.w*k);c.height=Math.round(src.h*k);
 c.getContext('2d')!.drawImage(bmp,src.x,src.y,src.w,src.h,0,0,c.width,c.height);const out=await new Promise<Blob>((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('img')),'image/jpeg',0.9));
 return {data:await b64(out),type:'image/jpeg',url:URL.createObjectURL(out),cropped:!!box};}
function AddTicket({events,onClose,onSaved,edit}:{events:Ticket[];onClose:()=>void;onSaved:(x:ManualItem)=>void;edit?:ManualItem}){
 const [file,setFile]=useState<Prep|null>(null);const [orig,setOrig]=useState<Blob|null>(null);
 const oldUrl=edit?fileUrl({msg:'man'+edit.id,id:edit.file.id,name:edit.file.name,type:edit.file.type,size:edit.file.size}):'';const [msg,setMsg]=useState('');const [reading,setReading]=useState(false);const [busy,setBusy]=useState(false);
 const [title,setTitle]=useState(edit?.title||'');const [date,setDate]=useState(edit?.start.slice(0,10)||'');const [hour,setHour]=useState(edit?.start.slice(11,16)||'');const [venue,setVenue]=useState(edit?.venue||'');const [kind,setKind]=useState<Kind>(edit?.kind||'concert');
 const [count,setCount]=useState(edit?.count||1);const [seats,setSeats]=useState(edit?.seats.join('\n')||'');const [attach,setAttach]=useState(edit?.attach||'');const pasteBox=useRef<HTMLDivElement>(null);
 const take=async(b:Blob|null|undefined)=>{if(!b)return;if(!/^image\/|application\/pdf/.test(b.type)){setMsg('אפשר להוסיף תמונה או PDF.');return;}setMsg('');
  try{const f=await prepare(b);setOrig(b);setFile(f);if(edit){setMsg(f.cropped?'חתכתי את השוליים.':'');return;}setReading(true);
   const r=await fetch('/api/manual/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)}).catch(()=>null);const d=r?await r.json().catch(()=>({})):{};
   if(d.title)setTitle(t=>t||d.title);if(d.date)setDate(x=>x||d.date);if(d.time)setHour(x=>x||d.time);if(d.venue)setVenue(x=>x||d.venue);if(d.kind)setKind(d.kind);if(d.count)setCount(d.count);if(d.seats?.length)setSeats(x=>x||d.seats.join('\n'));
   const hit=d.title&&d.date&&events.find(t=>t.start.slice(0,10)===d.date&&(t.title.includes(d.title)||d.title.includes(t.title)));if(hit)setAttach(hit.key);
   setMsg((f.cropped?'חתכתי את השוליים. ':'')+(d.title?'מילאתי את הפרטים מהתמונה. כדאי לבדוק.':'לא הצלחתי לקרוא את הפרטים מהתמונה. מלא אותם כאן.'));}catch{setMsg('לא הצלחתי לפתוח את הקובץ.');}finally{setReading(false);}};
 const paste=async()=>{try{const items=await navigator.clipboard.read();for(const it of items){const t=it.types.find(x=>/^image\//.test(x));if(t){await take(await it.getType(t));return;}}setMsg('אין תמונה בהעתקה. העתק את התמונה בוואטסאפ ונסה שוב.');}
  catch{setMsg('לחץ לחיצה ארוכה בתיבה למטה ובחר "הדבק".');pasteBox.current?.focus();}};
 const target=events.find(t=>t.key===attach);
 const ok=(!!file||!!edit)&&(target||(title.trim()&&date));
 const recrop=async(on:boolean)=>{const b=orig||(edit?await fetch(oldUrl).then(r=>r.blob()).catch(()=>null):null);if(!b)return;if(!orig)setOrig(b);const f=await prepare(b,on);setFile(f);setMsg(on?(f.cropped?'חתכתי את השוליים.':'לא מצאתי שוליים לחתוך.'):'');};
 const saveIt=async()=>{if(!ok)return;setBusy(true);setMsg('');try{
   const details=target?{title:target.title,start:target.start,venue:target.venue,kind:target.kind,attach:target.key}:{title:title.trim(),start:date+(hour?'T'+hour:''),venue:venue.trim()||undefined,kind};
   const body={...(edit?{id:edit.id}:{}),...(file?{file:{data:file.data,type:file.type,name:'כרטיס.'+(file.type==='application/pdf'?'pdf':'jpg')}}:{}),details:{...details,count,seats:seats.split(/\n+/).map(x=>x.trim()).filter(Boolean)}};
   const r=await fetch('/api/manual',{method:edit?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));
   if(!r.ok||!d.item)throw new Error(d.error==='big'?'הקובץ גדול מדי.':'לא הצלחתי לשמור. נסה שוב.');onSaved(d.item);}catch(e){setMsg(e instanceof Error?e.message:'לא הצלחתי לשמור.');}finally{setBusy(false);}};
 useEffect(()=>()=>{if(file)URL.revokeObjectURL(file.url);},[file]);
 return <div className="sheet addTicket" role="dialog" aria-modal="true" aria-label={edit?'עריכת כרטיס':'הוספת כרטיס'}>
  <div className="sheetTop"><button className="ib" onClick={onClose} aria-label="סגירה"><X/></button></div>
  <h2>{edit?'עריכת כרטיס':'הוספת כרטיס'}</h2>
  {!edit&&<p className="setNote">כרטיס שקיבלת כתמונה או כ-PDF, למשל בוואטסאפ אחרי תשלום בפייבוקס.</p>}
  <div className="addPick">
   <label className="ghost"><ImagePlus size={20}/>{edit?'החלפת התמונה':'העלאת תמונה או PDF'}<input type="file" accept="image/*,application/pdf" className="sr" onChange={e=>void take(e.target.files?.[0])}/></label>
   <button type="button" className="ghost" onClick={()=>void paste()}><ClipboardPaste size={20}/>הדבקת תמונה</button></div>
  <div ref={pasteBox} className="pasteBox" contentEditable suppressContentEditableWarning role="textbox" aria-label="תיבת הדבקה: לחיצה ארוכה ואז הדבק"
   onPaste={e=>{e.preventDefault();const f=[...e.clipboardData.files][0];if(f)void take(f);else setMsg('אין תמונה בהעתקה.');}} onInput={e=>{(e.target as HTMLDivElement).textContent='';}}>{file?'':'או לחיצה ארוכה כאן ← הדבק'}</div>
  {(file||edit)&&<div className="addPreview">{(file?file.type:edit!.file.type)==='application/pdf'?<p><FileText size={20}/> קובץ PDF</p>:<img src={file?file.url:oldUrl} alt="הכרטיס"/>}</div>}
  {(file?file.type!=='application/pdf':edit&&/image/.test(edit.file.type))&&<button type="button" className="textBtn" onClick={()=>void recrop(!file?.cropped)}>{file?.cropped?'בלי חיתוך - התמונה המקורית':'חיתוך חכם של השוליים'}</button>}
  {reading&&<p className="setNote" role="status">קורא את הפרטים מהתמונה…</p>}
  {msg&&<p className="setNote" role="status">{msg}</p>}
  {(file||edit)&&<div className="addForm">
   {events.length>0&&<><label htmlFor="mAttach">לאיזה אירוע?</label>
    <select id="mAttach" value={attach} onChange={e=>setAttach(e.target.value)}><option value="">אירוע חדש</option>{events.map(t=><option key={t.key} value={t.key}>{t.title+' - '+t.start.slice(0,10).split('-').reverse().join('.')}</option>)}</select></>}
   {!target&&<>
    <label htmlFor="mTitle">שם האירוע</label><input id="mTitle" value={title} onChange={e=>setTitle(e.target.value)} placeholder="למשל: מסיבת סוף שנה"/>
    <label htmlFor="mDate">תאריך</label><input id="mDate" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
    <label htmlFor="mTime">שעה (לא חובה)</label><input id="mTime" type="time" value={hour} onChange={e=>setHour(e.target.value)}/>
    <label htmlFor="mVenue">מקום (לא חובה)</label><input id="mVenue" value={venue} onChange={e=>setVenue(e.target.value)} placeholder="למשל: זאפה תל אביב"/>
    <fieldset className="kindPick"><legend>סוג</legend>{KIND_KEYS.map(k=><button type="button" key={k} aria-pressed={kind===k} className={kind===k?'on':''} onClick={()=>setKind(k)}>{KIND[k].label}</button>)}</fieldset></>}
   <label htmlFor="mCount">כמה כרטיסים בקובץ</label><input id="mCount" type="number" inputMode="numeric" min={1} max={40} value={count} onChange={e=>setCount(Math.max(1,Math.min(40,Number(e.target.value)||1)))}/>
   <label htmlFor="mSeats">מקומות (לא חובה, אחד בכל שורה)</label><textarea id="mSeats" rows={2} value={seats} onChange={e=>setSeats(e.target.value)} placeholder="שורה 5, כיסא 12"/>
   <button className="primary" disabled={!ok||busy} onClick={()=>void saveIt()}>{busy?'שומר…':edit?'שמירת השינויים':'שמירת הכרטיס'}</button>
  </div>}
 </div>;}
// Scriptable widget source with the personal link inside; the drawing code itself comes from Unstage, so updates arrive by themselves.
const widgetScript=(url:string)=>`// Unstage widget: loads its drawing code from Unstage, so updates arrive by themselves.
const u=${JSON.stringify(url)}
const r=await new Request(u).loadJSON().catch(()=>null)
const code=await new Request(u+'&js=1').loadString().catch(()=>'')
const AF=Object.getPrototypeOf(async function(){}).constructor
if(code&&code.includes('ListWidget')){await new AF('r',code)(r)}else{const w=new ListWidget();w.backgroundColor=new Color('#0a0f14');const t=w.addText(r&&r.lines?r.lines.map(x=>x.t).join('\\n'):'אין נתונים כרגע');t.textColor=Color.white();t.font=Font.boldSystemFont(15);if(config.runsInWidget)Script.setWidget(w);else await w.presentSmall();Script.complete()}`;
type SrvProps={srv:{enabled:boolean;devices?:number;calendar?:string;widget?:string;sms?:string}|null;push:string;pushMsg:string;onPush:()=>void;onTest:()=>void;onCopy:(t:string)=>void};
function SettingsView({user,srv,push,pushMsg,onPush,onTest,onCopy,hiddenCount,onRestore,onRescan,size,onSize,smsLast,onSmsPasted}:{smsLast:{at:string;kind:string;shape?:string;raw?:number}|null;onSmsPasted:()=>void;user:User;hiddenCount:number;onRestore:()=>void;onRescan:()=>void;size:number;onSize:(i:number)=>void}&SrvProps){
 const noDb=srv&&!srv.enabled;
 // Android (the installed app): iPhone-only setups (Shortcuts, Scriptable, Siri) are not shown.
 const [android,setAndroid]=useState(false);useEffect(()=>{setAndroid(/Android/i.test(navigator.userAgent));},[]);
 const slideSize=useRowSlide();const speakUrl=srv?.widget?.replace('/api/widget','/api/speak');
 return <><div className="settings">
  <div className="set"><h3><Bell size={18}/>התראות</h3>
   <p className="setNote">ערב לפני כל אירוע, שלוש שעות לפני עם הכרטיס מוכן, וכשמגיע כרטיס חדש למייל.</p>
   {noDb?<p className="setNote">השרת עוד לא חובר למסד נתונים.</p>
    :push==='install'?<p className="setNote">באייפון התראות עובדות רק מהאפליקציה שבמסך הבית: שיתוף ← <b>הוסף למסך הבית</b>, ואז לפתוח משם.</p>
    :push==='unsupported'?<p className="setNote">הדפדפן הזה לא תומך בהתראות.</p>
    :push==='denied'?<p className="setNote">ההתראות חסומות בהגדרות הטלפון עבור Unstage.</p>
    :<><button className={push==='on'?'ghost':'primary'} disabled={push==='busy'||push==='checking'||!srv} onClick={onPush}>{push==='on'?<><BellOff size={18}/>כיבוי התראות</>:<><Bell size={18}/>הפעלת התראות</>}</button>
     {push==='on'&&<button className="ghost" onClick={onTest}><Check size={18}/>התראת בדיקה</button>}</>}
   {pushMsg&&<p className="setNote">{pushMsg}</p>}</div>
  <div className="set"><h3><Type size={18}/>גודל טקסט</h3><div className="seg" role="radiogroup" aria-label="גודל טקסט" {...slideSize(3,onSize)}>{['רגיל','גדול','גדול מאוד'].map((l,i)=><button key={i} role="radio" aria-checked={size===i} className={size===i?'on':''} onClick={()=>onSize(i)}>{l}</button>)}</div></div>
  {(srv?.calendar||srv?.sms||srv?.widget)&&<h2 className="setGroup">הגדרות חד־פעמיות</h2>}
  {srv?.calendar&&<details className="set setFold"><summary><h3><CalendarSync size={18}/>יומן שמתעדכן לבד</h3><ChevronLeft className="foldIc" size={20} aria-hidden="true"/></summary>
   <p className="setNote">כל האירועים מופיעים ביומן של הטלפון, עם תזכורת שעתיים לפני. כרטיס חדש נכנס ליומן בעצמו.</p>
   {!android&&<a className="primary" href={srv.calendar}><CalendarPlus size={18}/>הוספה ליומן של האייפון</a>}
   <button className="ghost" onClick={()=>onCopy(srv.calendar!.replace(/^webcal/,'https'))}><Copy size={18}/>העתקת הקישור (ל-Google Calendar)</button></details>}
  {srv?.sms&&<SmsSet android={android} link={srv.sms} last={smsLast} onCopy={onCopy} onPasted={onSmsPasted}/>}
  {srv?.widget&&!android&&<details className="set setFold"><summary><h3><Smartphone size={18}/>ווידג'ט למסך הבית ולמסך הנעילה</h3><ChevronLeft className="foldIc" size={20} aria-hidden="true"/></summary>
   <p className="setNote">מראה את האירוע הבא ומה אחריו. עובד דרך אפליקציית <b>Scriptable</b> (חינם ב-App Store).</p>
   <ol className="steps2"><li>העתק את הסקריפט.</li><li>ב-Scriptable: <b>+</b>, הדבק ושמור בשם <b>Unstage</b>.</li><li>במסך הבית: לחיצה ארוכה ← <b>+</b> ← Scriptable ← גודל בינוני. בהגדרות הווידג'ט בחר את הסקריפט <b>Unstage</b>.</li><li>גם למסך הנעילה: התאמה אישית ← מסך נעילה ← Scriptable, ובחר <b>Unstage</b>.</li></ol>
   <button className="ghost" onClick={()=>onCopy(widgetScript(srv.widget!))}><Copy size={18}/>העתקת הסקריפט</button></details>}
  {speakUrl&&!android&&<details className="set setFold"><summary><h3><Mic size={18}/>לשאול את Siri</h3><ChevronLeft className="foldIc" size={20} aria-hidden="true"/></summary>
   <p className="setNote">אומרים "היי Siri, מה האירוע הבא שלי" ושומעים מה, מתי ואיפה.</p>
   <ol className="steps2"><li>העתק את הקישור האישי.</li><li>באפליקציית קיצורים: <b>+</b> ← הוסף פעולה <b>קבל תוכן של URL</b> והדבק את הקישור.</li><li>הוסף פעולה <b>דבר טקסט</b>.</li><li>שמור את הקיצור בשם <b>מה האירוע הבא שלי</b>.</li></ol>
   <button className="ghost" onClick={()=>onCopy(speakUrl)}><Copy size={18}/>העתקת הקישור האישי</button>
   <button className="ghost" onClick={async()=>{try{const t=await (await fetch(speakUrl,{cache:'no-store'})).text();const u=new SpeechSynthesisUtterance(t);u.lang='he-IL';speechSynthesis.cancel();speechSynthesis.speak(u);}catch{}}}><Volume2 size={18}/>השמע עכשיו</button></details>}
  <details className="set setFold setAdv"><summary><h3><RefreshCw size={18}/>מתקדם</h3><ChevronLeft className="foldIc" size={20} aria-hidden="true"/></summary><p className="setNote">Unstage קורא מיילים של כרטיסים מהשנתיים האחרונות. סריקה מלאה קוראת הכל מחדש.</p><button className="ghost" onClick={onRescan}><RotateCcw size={18}/>סריקה מלאה מחדש</button>
   {hiddenCount>0&&<button className="ghost" onClick={onRestore}><EyeOff size={18}/>החזרת {hiddenCount} אירועים מוסתרים</button>}</details>
  <div className="set"><h3><Mail size={18}/>חשבון</h3><p className="setNote"><b>{user.name}</b><br/><span dir="ltr">{user.email}</span></p><button className="ghost" onClick={()=>void clearDevice().finally(()=>signOut({redirectTo:'/'}))}><LogOut size={18}/>יציאה</button></div>
  <p className="footnote">הגישה ל-Gmail היא לקריאה בלבד. רשימת האירועים נשמרת בטלפון, ועותק שלה בשרת בשביל התזכורות, היומן והווידג'ט. קובצי הכרטיס נפתחים ישירות מהמייל שלך. <a href="/privacy">פרטיות</a></p></div></>;}

// Summary tab: how many events, what kind, where, and what they cost.
function Summary({list}:{list:Ticket[]}){const slide=useRowSlide();const y=new Date().getFullYear();const real=list.filter(t=>!t.cancelled);
 const years=[...new Set(real.map(t=>+t.start.slice(0,4)))].sort((a,b)=>b-a);const [yr,setYr]=useState(years.includes(y)?y:years[0]||y);
 const inYear=real.filter(t=>+t.start.slice(0,4)===yr);const past=inYear.filter(t=>!upcoming(t)).length;
 const money=(p?:string)=>{const m=(p||'').replace(/,/g,'').match(/\d+(?:\.\d+)?/);return p&&/₪/.test(p)&&m?+m[0]:0;};const spent=inYear.reduce((a,t)=>a+money(t.price),0);
 const kinds=Object.entries(inYear.reduce((a,t)=>({...a,[t.kind]:(a[t.kind]||0)+1}),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]);
 const venues=Object.entries(inYear.reduce((a,t)=>{const v=(t.venue||'').split(' - ')[0].trim();return v?{...a,[v]:(a[v]||0)+1}:a;},{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const max=Math.max(1,...kinds.map(k=>k[1]));
 return <><div className="statsWrap">
  {years.length>1&&<div className="seg" role="radiogroup" aria-label="שנה" {...slide(years.length,i=>setYr(years[i]))}>{years.map(v=><button key={v} role="radio" aria-checked={v===yr} className={v===yr?'on':''} onClick={()=>setYr(v)}>{v}</button>)}</div>}
  <div className="statGrid"><div className="stat"><b>{inYear.length}</b><span>אירועים</span></div><div className="stat"><b>{past}</b><span>היו</span></div><div className="stat"><b>{inYear.length-past}</b><span>בדרך</span></div></div>
  {spent>0&&<div className="box"><h3><Wallet/>הוצאות על כרטיסים</h3><div className="moneyBig"><b dir="ltr">₪{Math.round(spent).toLocaleString('he-IL')}</b></div></div>}
  {kinds.length>0&&<div className="box"><h3><TicketIcon/>לפי סוג</h3>{kinds.map(([k,n])=>{const K=KIND[k as Kind];return <div className="kindRow" key={k}><span><K.Icon size={16}/>{K.label}</span><i style={{width:(n/max*100)+'%'}}/><b>{n}</b></div>;})}</div>}
  {venues.length>0&&<div className="box"><h3><MapPin/>המקומות שלך</h3>{venues.map(([v,n])=><div className="kv" key={v}><span style={{whiteSpace:'normal'}}>{bidi(v)}</span><b style={{color:'var(--ink)'}}>{n}</b></div>)}</div>}
  {!inYear.length&&<div className="panel"><ChartColumn size={40}/><h2>עוד אין נתונים</h2><p>אחרי שיהיו כרטיסים, יופיע כאן סיכום.</p></div>}</div></>;}

// pdf.js is served from this site (public/pdfjs, the legacy build for older Safari) and loaded ahead when an event opens.
// Ticket files fetched once per session, and ahead of time for the next event, so "הצג כרטיס" opens at once.
const BYTES=new Map<string,Promise<ArrayBuffer>>();
function bytes(u:string){let p=BYTES.get(u);if(!p){p=fetch(u,{cache:'no-store'}).catch(()=>{throw new Error('offline');}).then(r=>{if(!r.ok)throw new Error(r.headers.get('X-Offline')?'offline':r.status===401||r.status===403?'auth':'file');return r.arrayBuffer();});p.catch(()=>BYTES.delete(u));BYTES.set(u,p);}return p;}
// Signing out leaves nothing of this account on the phone: the tickets list, names, kept ticket files and the saved app page.
async function clearDevice(){try{for(const k of personalKeys(Object.keys(localStorage)))localStorage.removeItem(k);}catch{}
 BYTES.clear();try{for(const k of await caches.keys())if(k.startsWith('unstage-'))await caches.delete(k);}catch{}
 try{(await navigator.serviceWorker?.getRegistration())?.active?.postMessage('clear');}catch{}}
// Ticket files kept for offline use, by URL.
const TICKET_CACHE='unstage-tickets-v1';
let pdfjs:Promise<any>|null=null;
function pdfLib(){pdfjs??=import(/* webpackIgnore: true */ '/pdfjs/pdf.min.mjs' as string).then((lib:any)=>{lib.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.min.mjs';return lib;}).catch(e=>{pdfjs=null;throw e;});return pdfjs;}
// Save or send the ticket file through the phone's share sheet (a link would leave the home-screen app with no way back).
// Save or send the ticket files through the phone's share sheet (a link would leave the home-screen app with no way back).
async function shareFiles(fs:TFile[]){try{const files=await Promise.all(fs.map(async f=>{const blob=await (await fetch(fileUrl(f))).blob();return new File([blob],f.name||'ticket.pdf',{type:blob.type||f.type});}));
 if(navigator.canShare?.({files})){await navigator.share({files});return;}for(const file of files){const u=URL.createObjectURL(file);const a=document.createElement('a');a.href=u;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),4000);}}catch{}}
// One ticket file inside the viewer: PDFs drawn page by page (pdf.js from this site), images as they are.
function Doc({f,onZoom,first=true}:{f:TFile;onZoom:(src:string)=>void;first?:boolean}){const box=useRef<HTMLDivElement>(null);const [err,setErr]=useState('');const [busy,setBusy]=useState(true);const img=/image/.test(f.type);const page=/html/.test(f.type);const blob=useRef<Blob|null>(null);const [frame,setFrame]=useState('');
 useEffect(()=>{if(img||page){setBusy(false);return;}let off=false;(async()=>{try{
   const data=await bytes(fileUrl(f));blob.current=new Blob([data],{type:'application/pdf'});const lib=await pdfLib().catch(()=>null);if(!lib)throw new Error('lib');
   // The worker sometimes fails to start on a phone's first try; one more try, then without a worker.
   const open=(opts:object)=>lib.getDocument({data:data.slice(0),...opts}).promise;let pdf:any;try{pdf=await open({});}catch{try{pdf=await open({});}catch{pdf=await open({disableWorker:true});}}
   for(let n=1;n<=Math.min(pdf.numPages,12)&&!off;n++){const page=await pdf.getPage(n);const w=(box.current?.clientWidth||360)*Math.min(3,devicePixelRatio||2);const vp=page.getViewport({scale:1});const v=page.getViewport({scale:w/vp.width});
    const c=document.createElement('canvas');c.width=v.width;c.height=v.height;c.className='pdfPage';c.onclick=()=>onZoom(c.toDataURL('image/png'));await page.render({canvasContext:c.getContext('2d')!,viewport:v}).promise;box.current?.appendChild(c);}
  }catch(e){const why=e instanceof Error?e.message:'';
   // pdf.js could not draw it: Safari's own PDF view inside the app still shows the ticket.
   if(blob.current&&!off){setFrame(URL.createObjectURL(blob.current));return;}
   setErr(why==='offline'?'אין חיבור לאינטרנט והכרטיס הזה עדיין לא נשמר במכשיר.':why==='auth'?'צריך להתחבר מחדש ל-Google כדי לפתוח את הכרטיס.':why==='file'?'הכרטיס לא נמצא במייל.':'לא הצלחתי להציג את הכרטיס כאן.');}finally{setBusy(false);}})();return()=>{off=true;};},[f,img,page]);
 useEffect(()=>()=>{if(frame)URL.revokeObjectURL(frame);},[frame]);
 return <div className="doc" ref={box}>{page&&<iframe className="pdfFrame keptPage" src={fileUrl(f)} title="הכרטיס" sandbox=""/>}{img&&<img className={/svg/.test(f.type)?'cards':undefined} src={fileUrl(f)} alt="ברקוד הכרטיס" onClick={()=>onZoom(fileUrl(f))}/>}{frame&&<iframe className="pdfFrame" src={frame} title="הכרטיס"/>}{busy&&!img&&(first?<div className="loader"><Mark cls="lmark" anim="bob"/><p>{'פותח את הכרטיס…'}</p></div>:<div className="docWait" aria-hidden="true"/>)}{err&&<p className="setNote" style={{textAlign:'center'}}>{err} <a href={fileUrl(f)} target="_blank" rel="noopener">פתיחה בדפדפן</a></p>}</div>;}
// Full-screen ticket viewer with a close button (a home-screen app has no browser back button): one file, or all of an event's tickets one under the other.
function Viewer({fs,onClose}:{fs:TFile[];onClose:()=>void}){const [zoom,setZoom]=useState('');
 return <div className="viewer" role="dialog" aria-label={fs.length>1?'כל הכרטיסים':'הכרטיס'}>{zoom&&<Zoom src={zoom} alt="הכרטיס" onClose={()=>setZoom('')}/>}
  <div className="viewerTop"><button className="ib" onClick={onClose} aria-label="סגירה"><X/></button><button className="ib" aria-label="שמירה או שיתוף" onClick={()=>void shareFiles(fs)}><Share2/></button></div>
  <div className="viewerBody">{fs.map((f,i)=><Doc key={f.msg+f.id} f={f} onZoom={setZoom} first={i===0}/>)}</div>
 </div>;}
