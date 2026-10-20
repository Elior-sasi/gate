// What to search for in Waze, Moovit and Google Maps. Mails add the hall to the venue ("סינמטק ירושלים - סינמטק 2",
// "סינמה סיטי ירושלים - אולם 6"), which sends navigation apps to some random street; the venue itself is what finds the place.
export function navQuery(p:{venue?:string;address?:string;city?:string}){let v=(p.venue||'').trim();
 const paren=v.match(/\(([^)]{3,60})\)/)?.[1]||'';
 // "FRIENDS ירושלים (תיאטרון הירש)": the building in brackets is the place to drive to.
 if(paren&&/תיאטרון|היכל|אולם|מרכז|בית|קולנוע|סינמטק|מועדון|גני|פארק|אמפי|האנגר|מוזיאון|theat|hall|center|club/i.test(paren)){const rest=v.replace(/\([^)]*\)/,'').trim();const city=rest.match(/ירושלים|תל אביב|חיפה|באר שבע|ראשון לציון|רמת גן|הרצליה|נתניה|פתח תקווה|רעננה|כפר סבא|אשדוד|מודיעין/)?.[0]||'';v=paren+(city?' '+city:'');}
 else v=v.replace(/\([^)]*\)/g,'');
 v=v.replace(/\s*[-–,|]\s*(?:אולם|סינמטק|hall|screen|אודיטוריום|סטודיו|במה)\s*[\w֐-׿]{0,12}\s*$/i,'').replace(/\s*[-–]\s*\d+\s*$/,'').trim();
 const extra=[p.address,p.city].filter(x=>x&&!v.includes(x));return [v,...extra].filter(Boolean).join(', ');}
export const navLinks=(q:string)=>({google:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q),moovit:'https://moovit.com/?to='+encodeURIComponent(q)+'&lang=he',waze:'https://waze.com/ul?navigate=yes&q='+encodeURIComponent(q)});
