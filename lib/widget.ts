// What the home-screen widget shows, line by line (drawn by the Scriptable script below).
import type {Ticket} from '@/lib/tickets';
import {ilMoment} from '@/lib/notify';
export type Line={t:string;s:'big'|'mid'|'small';c:'white'|'gold'|'light'|'gray';n?:number};
const ilDay=(t:number)=>new Date(t).toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});
function when(t:Ticket,now:number){const at=ilMoment(t.start);const d=Math.round((new Date(ilDay(at)).getTime()-new Date(ilDay(now)).getTime())/864e5);const h=t.start.split('T')[1]||'';
 if(d<=0){const hrs=Math.round((at-now)/36e5);return h&&hrs>=1&&hrs<=6?'בעוד '+hrs+(hrs===1?' שעה':' שעות'):'היום'+(h?' '+h:'');}
 if(d===1)return 'מחר'+(h?' '+h:'');if(d<7)return 'בעוד '+d+' ימים';return new Date(at).toLocaleDateString('he-IL',{day:'numeric',month:'numeric',timeZone:'Asia/Jerusalem'});}
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
const w=new ListWidget();w.backgroundColor=new Color('#0a0f14');w.url=(r&&r.url)||'https://gatetickets.vercel.app';w.setPadding(8,14,12,14)
const img=await new Request('https://gatetickets.vercel.app/wordmark.png').loadImage().catch(()=>null)
if(img){const i=w.addImage(img);i.imageSize=new Size(img.size.width*22/img.size.height,22);i.rightAlignImage()}else{const t=w.addText('Unstage');t.font=Font.boldSystemFont(16);t.textColor=new Color('#ffd27a')}
w.addSpacer(8)
if(!r||!r.ok||!r.lines){const e=w.addText('אין נתונים כרגע');e.textColor=Color.gray();e.font=Font.mediumSystemFont(14)}else{
 const F={big:22,mid:15,small:12},C={white:'#ffffff',gold:'#ffb547',light:'#ffd79a',gray:'#8a96a3'}
 const max=config.widgetFamily==='large'?10:(config.widgetFamily==='small'?3:4)
 r.lines.slice(0,max).forEach((x,i)=>{if(i&&x.s!=='small')w.addSpacer(2);const t=w.addText(x.t);t.font=x.s==='small'?Font.mediumSystemFont(F.small):Font.boldSystemFont(F[x.s]||15);t.textColor=new Color(C[x.c]||'#ffffff');t.lineLimit=x.n||1;t.minimumScaleFactor=0.75;t.rightAlignText()})}
w.addSpacer()
w.refreshAfterDate=new Date(Date.now()+15*60000)
if(config.runsInWidget)Script.setWidget(w);else await w.presentMedium()
Script.complete()
`;
