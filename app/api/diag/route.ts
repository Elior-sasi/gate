import {renderPage,closeBrowser,renderWhy} from '@/lib/render';
import {presPage} from '@/lib/pres';
export const dynamic='force-dynamic';export const maxDuration=60;
// Temporary: can the server browser open a pres.global ticket page (sizes and reasons only).
export async function GET(){const t=Date.now();const out:Record<string,unknown>={};
 for(const [k,u] of [['jer','https://prestickets.com/jer-cin/3c603657-1dcb-4c2d-b007-e37c98a21729/?id=209803927955490'],['cc','https://tickets.cinema-city.co.il/edocument/d08b133e-e19e-4285-a390-14a3652c8e6f/?id=864134394615752']]){
  const r=await renderPage(presPage(u)||u);out[k]={size:r?.data.length||0,why:renderWhy};}
 await closeBrowser();return Response.json({ms:Date.now()-t,out},{headers:{'Cache-Control':'no-store'}});}
