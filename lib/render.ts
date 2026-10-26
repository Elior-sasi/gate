// Pages built by scripts (pres.global and others): opened in a real browser on the server and kept as a picture,
// so the ticket looks exactly as the seller shows it. One browser per request, closed at the end.
import {mkdir,copyFile,access,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {Browser} from 'puppeteer-core';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
let open:Promise<Browser>|null=null;
// The server's browser has no Hebrew fonts: Liberation Sans (Arial's shapes, with Hebrew) goes where it looks for fonts.
async function fonts(){const dir='/tmp/fonts';await mkdir(dir,{recursive:true});
 // fontconfig needs its own settings file there, or no font is found at all (text then has no size and pages come out empty).
 try{await access(join(dir,'fonts.conf'));}catch{await writeFile(join(dir,'fonts.conf'),'<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>/tmp/fonts</dir><cachedir>/tmp/fonts-cache/</cachedir><config></config></fontconfig>');}
 for(const f of ['LiberationSans-Regular.ttf','LiberationSans-Bold.ttf']){const to=join(dir,f);try{await access(to);}catch{await copyFile(join(process.cwd(),'lib','fonts',f),to);}}}
async function browser(){if(!open)open=(async()=>{const puppeteer=(await import('puppeteer-core')).default;
  if(process.env.CHROME_PATH)return puppeteer.launch({executablePath:process.env.CHROME_PATH,args:['--no-sandbox'],headless:true});
  await fonts();const chromium=(await import('@sparticuz/chromium')).default;
  return puppeteer.launch({executablePath:await chromium.executablePath(),args:chromium.args,headless:'shell'});})();
 return open;}
export const browserForDiag=()=>browser();
export async function closeBrowser(){const b=open;open=null;if(b)await (await b).close().catch(()=>{});}
export let renderWhy='';
export async function renderPage(url:string,timeout=22000):Promise<{data:Buffer;type:string}|null>{renderWhy='';let page;
 try{const b=await browser();page=await b.newPage();await page.setUserAgent(UA);await page.setViewport({width:430,height:860,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.setExtraHTTPHeaders({'Accept-Language':'he-IL,he;q=0.9'});
  await page.goto(url,{waitUntil:'networkidle2',timeout});
  // Wait for the ticket itself: text on the page and its pictures (the barcode) loaded.
  await page.waitForFunction(()=>document.body&&(document.body.textContent||'').trim().length>40&&[...document.images].every(i=>i.complete),{timeout:10000}).catch(()=>{});
  await new Promise(r=>setTimeout(r,700));
  const text=await page.evaluate(()=>(document.body?.textContent||'').replace(/\s+/g,' ').trim().length);
  // A bot check or block page (Cloudflare and the like) is not the ticket.
  const blocked=await page.evaluate(()=>/you have been blocked|attention required|just a moment|checking your browser|verify you are human|access denied|cf-error|ray id/i.test((document.title||'')+' '+(document.body?.textContent||'').slice(0,3000)));
  if(blocked){renderWhy='blocked '+new URL(page.url()).hostname;return null;}if(text<40){renderWhy='empty '+text+' '+(await page.title()).slice(0,40)+' '+(await page.evaluate(()=>document.documentElement.outerHTML.length));return null;}
  // A page that shows its tickets one at a time (a slider, as pres.global does): the tickets are laid out one under the other
  // and only they are kept, on a transparent background, so the app shows them like the tickets that came as files.
  const box=await page.evaluate(()=>{const cards=[...document.querySelectorAll('.swiper-slide .card, .swiper-slide .ticket')];if(!cards.length)return null;
   const st=document.createElement('style');st.textContent=`html,body,#__nuxt,#__layout,#app,.v-application,.v-application--wrap,.v-main,.v-main__wrap,.content-container,.edocument-root,.edocument-content-root,.swiper-container,.swiper-wrapper,.swiper-slide,.ticket-slide{background:transparent!important;background-image:none!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important}
    .swiper-wrapper{transform:none!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:28px!important}
    .swiper-slide{width:430px!important;margin:0!important;transform:none!important;opacity:1!important;visibility:visible!important}
    .swiper-pagination,.swiper-button-prev,.swiper-button-next,#footer-logos-container,.safe-area-top-strip,.swiper-notification{display:none!important}
    .__keepbg,.__keepbg::before,.__keepbg::after{background:transparent!important;background-image:none!important;box-shadow:none!important}.__keepbg::before,.__keepbg::after{display:none!important}`;
   // Every element around the tickets loses its own background too (themes paint it on wrappers and their ::before).
   for(const c of cards){let e=c.parentElement;while(e){e.classList.add('__keepbg');e=e.parentElement;}}
   document.head.appendChild(st);window.scrollTo(0,0);
   const rs=cards.map(c=>c.getBoundingClientRect()).filter(r=>r.width>50&&r.height>50);if(!rs.length)return null;
   const x=Math.max(0,Math.min(...rs.map(r=>r.left))-14),y=Math.max(0,Math.min(...rs.map(r=>r.top))-14);
   return {x,y,width:Math.max(...rs.map(r=>r.right))+14-x,height:Math.max(...rs.map(r=>r.bottom))+14-y,n:rs.length};});
  if(box){await new Promise(r=>setTimeout(r,400));const shot=Buffer.from(await page.screenshot({type:'png',omitBackground:true,captureBeyondViewport:true,clip:{x:box.x,y:box.y,width:box.width,height:box.height}}));
   if(shot.length<2_400_000)return {data:shot,type:'image/png'};}
  let data=Buffer.from(await page.screenshot({fullPage:true,type:'png'}));let type='image/png';
  if(data.length>1_800_000){data=Buffer.from(await page.screenshot({fullPage:true,type:'jpeg',quality:88}));type='image/jpeg';}
  return data.length>2_400_000?null:{data,type};}
 catch(e){renderWhy=(e instanceof Error?e.message:'error').slice(0,80);return null;}finally{await page?.close().catch(()=>{});}}
