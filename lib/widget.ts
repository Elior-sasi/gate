// What the home-screen widget shows, line by line (drawn by the Scriptable script below).
import type {Ticket} from '@/lib/tickets';
import {ilMoment} from '@/lib/notify';
export type Line={t:string;s:'big'|'mid'|'small';c:'white'|'gold'|'light'|'gray';n?:number};
const ilDay=(t:number)=>new Date(t).toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});
function when(t:Ticket,now:number){const at=ilMoment(t.start);const d=Math.round((new Date(ilDay(at)).getTime()-new Date(ilDay(now)).getTime())/864e5);const h=t.start.split('T')[1]||'';
 if(d<=0){const hrs=Math.round((at-now)/36e5);return h&&hrs>=1&&hrs<=6?'בעוד '+hrs+(hrs===1?' שעה':' שעות'):'היום'+(h?' '+h:'');}
 if(d===1)return 'מחר'+(h?' '+h:'');const wd=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','שבת'][['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Date(at).toLocaleDateString('en-US',{weekday:'short',timeZone:'Asia/Jerusalem'}))];if(d<7)return 'יום '+wd+(h?' '+h:'');return (wd==='שבת'?'שבת ':'יום '+wd+' ')+new Date(at).toLocaleDateString('he-IL',{day:'numeric',month:'numeric',timeZone:'Asia/Jerusalem'});}
export function upcoming(all:Ticket[],hidden:string[],now=Date.now()){return all.filter(t=>!t.cancelled&&!hidden.includes(t.key)&&ilMoment(t.start)>now-3*36e5).sort((a,b)=>ilMoment(a.start)-ilMoment(b.start));}
export function lines(all:Ticket[],hidden:string[],now=Date.now()):Line[]{const list=upcoming(all,hidden,now);const L:Line[]=[];
 if(!list.length)return [{t:'אין אירועים קרובים',s:'mid',c:'gray'}];
 const [a,...rest]=list;L.push({t:when(a,now),s:'big',c:'gold'});L.push({t:a.title.slice(0,60),s:'mid',c:'white',n:2});if(a.venue)L.push({t:a.venue.slice(0,40),s:'small',c:'light'});
 for(const t of rest.slice(0,3))L.push({t:when(t,now)+' · '+t.title.slice(0,40),s:'small',c:'gray'});
 return L;}
export function lock(L:Line[]){return {inline:'🎟 '+(L[0]?.t||'Unstage')+(L[1]?' · '+L[1].t:'').slice(0,38),rect:L.slice(0,3).map(x=>x.t.slice(0,30))};}
// Runs inside Scriptable (fetched by the small script on the phone). `r` is the widget route's JSON.
export const RENDER=`
const fam=config.widgetFamily||''
if(fam.startsWith('accessory')){const w=new ListWidget();w.url='https://gatetickets.vercel.app';const lk=(r&&r.lock)||{inline:'Unstage',rect:['Unstage']}
 if(fam==='accessoryInline'){const t=w.addText(lk.inline);t.font=Font.mediumSystemFont(13)}
 else if(fam==='accessoryCircular'){const n=w.addText(String((r&&r.count)||0));n.font=Font.boldSystemFont(22);n.centerAlignText();const s=w.addText('אירועים');s.font=Font.systemFont(9);s.centerAlignText()}
 else{lk.rect.forEach((x,i)=>{const t=w.addText(x);t.font=i?Font.systemFont(12):Font.boldSystemFont(14);t.lineLimit=1;t.minimumScaleFactor=0.8})}
 w.refreshAfterDate=new Date(Date.now()+15*60000);Script.setWidget(w);Script.complete();return}
const fam2=config.widgetFamily||'small'
const w=new ListWidget();w.url=(r&&r.url)||'https://gatetickets.vercel.app';w.setPadding(8,14,10,14)
// Unstage colours: warm amber fading into near-black.
const g=new LinearGradient();g.colors=[new Color('#3b2a12'),new Color('#21180c'),new Color('#0f0c08')];g.locations=[0,0.55,1];g.startPoint=new Point(0,0);g.endPoint=new Point(1,1);w.backgroundGradient=g
const img=await new Request('https://gatetickets.vercel.app/wordmark.png').loadImage().catch(()=>null)
if(img){const i=w.addImage(img);i.imageSize=new Size(img.size.width*22/img.size.height,22);i.rightAlignImage()}else{const t=w.addText('Unstage');t.font=Font.boldSystemFont(16);t.textColor=new Color('#ffd27a')}
w.addSpacer(8)
const F={big:22,mid:17,small:13},C={white:'#ffffff',gold:'#ffb547',light:'#ffd79a',gray:'#a89c8a'}
function put(st,x,i){if(i&&x.s!=='small')st.addSpacer(2);else if(i)st.addSpacer(2);const t=st.addText(x.t);t.font=x.s==='small'?Font.mediumSystemFont(F.small):Font.boldSystemFont(F[x.s]||15);t.textColor=new Color(C[x.c]||'#ffffff');t.lineLimit=x.n||1;t.minimumScaleFactor=0.75;t.rightAlignText()}
// Countdown bar: the 7 days before the event, filled from the right as it gets closer.
function bar(width,done){const n=7,gap=4,h=6,sc=3;const ctx=new DrawContext();ctx.opaque=false;ctx.respectScreenScale=false;ctx.size=new Size(width*sc,h*sc);const sw=(width-gap*(n-1))/n
 for(let k=0;k<n;k++){const x=(width-(k+1)*sw-k*gap)*sc;const p=new Path();p.addRoundedRect(new Rect(x,0,sw*sc,h*sc),h*sc/2,h*sc/2);ctx.addPath(p);ctx.setFillColor(k<done?new Color('#ffb547'):new Color('#ffffff',0.13));ctx.fillPath()}
 const im=w.addImage(ctx.getImage());im.imageSize=new Size(width,h)}
// A ticket stub with the date, for the medium widget.
function stub(day,mon){const S=84,sc=3,ctx=new DrawContext();ctx.opaque=false;ctx.respectScreenScale=false;ctx.size=new Size(S*sc,S*sc)
 const p=new Path();p.addRoundedRect(new Rect(0,0,S*sc,S*sc),14*sc,14*sc);ctx.addPath(p);ctx.setFillColor(new Color('#ffb547'));ctx.fillPath()
 for(const cy of [0,S*sc]){const c=new Path();c.addEllipse(new Rect(S*sc*0.72-6*sc,cy-6*sc,12*sc,12*sc));ctx.addPath(c);ctx.setFillColor(new Color('#21180c'));ctx.fillPath()}
 ctx.setFillColor(new Color('#5a3a0a',0.5));for(let y=10;y<S-8;y+=8)ctx.fillRect(new Rect(S*sc*0.72-1*sc,y*sc,2*sc,4*sc))
 ctx.setTextAlignedCenter();ctx.setTextColor(new Color('#1a1206'));ctx.setFont(Font.boldSystemFont(34*sc));ctx.drawTextInRect(String(day),new Rect(0,12*sc,S*sc*0.72,40*sc))
 ctx.setFont(Font.semiboldSystemFont(14*sc));ctx.drawTextInRect(String(mon),new Rect(0,52*sc,S*sc*0.72,20*sc));return ctx.getImage()}
if(!r||!r.ok||!r.lines){const e=w.addText('אין נתונים כרגע');e.textColor=Color.gray();e.font=Font.mediumSystemFont(14)}else{
 const max=fam2==='large'?10:3
 if(fam2==='medium'&&r.top&&r.top.day){const row=w.addStack();row.layoutHorizontally();row.centerAlignContent();const col=row.addStack();col.layoutVertically();r.lines.slice(0,3).forEach((x,i)=>put(col,x,i));row.addSpacer();const pi=row.addImage(stub(r.top.day,r.top.mon));pi.imageSize=new Size(84,84)}
 else r.lines.slice(0,max).forEach((x,i)=>put(w,x,i))}
w.addSpacer()
if(r&&r.top&&r.top.done)bar(fam2==='small'?124:290,r.top.done)
w.refreshAfterDate=new Date(Date.now()+15*60000)
if(config.runsInWidget)Script.setWidget(w);else await w.presentMedium()
Script.complete()
`;
