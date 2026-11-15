import {filmPoster,pagePicture} from '@/lib/poster';
export const dynamic='force-dynamic';export const maxDuration=30;
// Temporary: do pictures come back (public film names and a public event page only).
export async function GET(){const t=['שרק-חגיגות 25 שנה!-מדובב (עברית)','יער פרא','לשבור | Break','האי הנעלם-מדובב','קופה ראשית: הסרט'];
 const films=await Promise.all(t.map(async x=>[x,await filmPoster(x,2026)]));const page=await pagePicture('https://www.go-out.co/event/animefest');
 return Response.json({films,page},{headers:{'Cache-Control':'no-store'}});}
