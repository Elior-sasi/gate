import {closeBrowser} from '@/lib/render';
export const dynamic='force-dynamic';export const maxDuration=60;
// Checks that the server's browser (lib/render) starts and lays out text: a fixed test page only, nothing else.
export async function GET(){const t=Date.now();
 try{const {browserForDiag}=await import('@/lib/render');const b=await browserForDiag();const p=await b.newPage();
  await p.setContent('<html dir="rtl"><body><p id="a" style="font:20px Arial">שלום עולם hello world 123</p></body></html>');
  const r=await p.evaluate(()=>{const a=document.getElementById('a')!;const s=document.createElement('span');s.textContent='שלום hello';document.body.appendChild(s);
   return {inner:document.body.innerText.length,w:s.getBoundingClientRect().width,h:a.getBoundingClientRect().height,disp:getComputedStyle(document.body).display};});
  const fs=await import('node:fs');let fonts:string[]=[];try{fonts=fs.readdirSync('/tmp/fonts');}catch{}
  await closeBrowser();return Response.json({ok:true,ms:Date.now()-t,r,fonts,fc:process.env.FONTCONFIG_PATH||''},{headers:{'Cache-Control':'no-store'}});}
 catch(e){await closeBrowser();return Response.json({ok:false,ms:Date.now()-t,err:String(e).slice(0,300)});}}
