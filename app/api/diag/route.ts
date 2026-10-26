import {renderPage,closeBrowser,renderWhy} from '@/lib/render';
export const dynamic='force-dynamic';export const maxDuration=60;
// Checks that the server's browser (lib/render) starts and draws a page: a fixed public page only, nothing else.
export async function GET(){const t=Date.now();let size=0,type='';
 try{const r=await renderPage('https://example.com/');size=r?.data.length||0;type=r?.type||'';}catch(e){return Response.json({ok:false,ms:Date.now()-t,err:String(e).slice(0,300)});}
 const why=renderWhy;await closeBrowser();return Response.json({ok:size>0,ms:Date.now()-t,size,type,why},{headers:{'Cache-Control':'no-store'}});}
