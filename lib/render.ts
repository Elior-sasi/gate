// Pages built by scripts (pres.global and others): opened in a real browser on the server and kept as a picture,
// so the ticket looks exactly as the seller shows it. One browser per request, closed at the end.
import {mkdir,copyFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import type {Browser} from 'puppeteer-core';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
let open:Promise<Browser>|null=null;
// The server's browser has no Hebrew fonts: Liberation Sans (Arial's shapes, with Hebrew) goes where it looks for fonts.
async function fonts(){const dir='/tmp/fonts';await mkdir(dir,{recursive:true});
 for(const f of ['LiberationSans-Regular.ttf','LiberationSans-Bold.ttf']){const to=join(dir,f);try{await access(to);}catch{await copyFile(join(process.cwd(),'lib','fonts',f),to);}}}
async function browser(){if(!open)open=(async()=>{const puppeteer=(await import('puppeteer-core')).default;
  if(process.env.CHROME_PATH)return puppeteer.launch({executablePath:process.env.CHROME_PATH,args:['--no-sandbox'],headless:true});
  await fonts();const chromium=(await import('@sparticuz/chromium')).default;
  return puppeteer.launch({executablePath:await chromium.executablePath(),args:chromium.args,headless:true});})();
 return open;}
export async function closeBrowser(){const b=open;open=null;if(b)await (await b).close().catch(()=>{});}
export let renderWhy='';
export async function renderPage(url:string,timeout=22000):Promise<{data:Buffer;type:string}|null>{renderWhy='';let page;
 try{const b=await browser();page=await b.newPage();await page.setUserAgent(UA);await page.setViewport({width:430,height:860,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.setExtraHTTPHeaders({'Accept-Language':'he-IL,he;q=0.9'});
  await page.goto(url,{waitUntil:'networkidle2',timeout});
  // Wait for the ticket itself: text on the page and its pictures (the barcode) loaded.
  await page.waitForFunction(()=>document.body&&document.body.innerText.trim().length>40&&[...document.images].every(i=>i.complete),{timeout:10000}).catch(()=>{});
  await new Promise(r=>setTimeout(r,700));
  const text=await page.evaluate(()=>(document.body?.innerText||'').trim().length);if(text<40){renderWhy='empty '+text+' '+(await page.title()).slice(0,40)+' '+(await page.evaluate(()=>document.documentElement.outerHTML.length));return null;}
  let data=Buffer.from(await page.screenshot({fullPage:true,type:'png'}));let type='image/png';
  if(data.length>1_800_000){data=Buffer.from(await page.screenshot({fullPage:true,type:'jpeg',quality:88}));type='image/jpeg';}
  return data.length>2_400_000?null:{data,type};}
 catch(e){renderWhy=(e instanceof Error?e.message:'error').slice(0,80);return null;}finally{await page?.close().catch(()=>{});}}
