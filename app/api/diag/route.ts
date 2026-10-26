import {closeBrowser,browserForDiag} from '@/lib/render';
export const dynamic='force-dynamic';export const maxDuration=60;
// Temporary: the structure of a pres.global ticket page (tags and classes only).
export async function GET(){const b=await browserForDiag();const p=await b.newPage();await p.setViewport({width:430,height:860,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await p.goto('https://tickets.cinema-city.co.il/edocument/d08b133e-e19e-4285-a390-14a3652c8e6f/?id=864134394615752',{waitUntil:'networkidle2',timeout:25000});await new Promise(x=>setTimeout(x,1500));
 const tree=await p.evaluate(()=>{const out:string[]=[];const walk=(e:Element,d:number)=>{if(d>9||out.length>260)return;const r=e.getBoundingClientRect();
   out.push(' '.repeat(d)+e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,4).join('.'):'')+' '+Math.round(r.x)+','+Math.round(r.y)+' '+Math.round(r.width)+'x'+Math.round(r.height)+(e.children.length?'':' "'+(e.textContent||'').trim().slice(0,12).replace(/\d/g,'#')+'"'));
   for(const c of e.children)walk(c,d+1);};walk(document.body,0);return out.join('\n');});
 await closeBrowser();return new Response(tree,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}
