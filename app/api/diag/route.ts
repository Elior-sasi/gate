import {renderPage,closeBrowser,renderWhy} from '@/lib/render';
export const dynamic='force-dynamic';export const maxDuration=60;
// Temporary: a pres.global ticket page as the app keeps it.
export async function GET(){const r=await renderPage('https://tickets.cinema-city.co.il/edocument/d08b133e-e19e-4285-a390-14a3652c8e6f/?id=864134394615752');await closeBrowser();
 return r?new Response(new Uint8Array(r.data),{headers:{'Content-Type':r.type,'Cache-Control':'no-store'}}):new Response('fail '+renderWhy,{status:500});}
