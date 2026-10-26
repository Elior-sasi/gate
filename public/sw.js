// Unstage service worker v2: phone notifications, and the tickets offline.
// What is kept on the phone, and nothing else:
//  - the app itself (the page and its scripts, styles, fonts, pdf.js), so Unstage opens with no signal;
//  - ticket files (/api/file) of events that were opened or are coming up, so they show at the door.
// Never kept: sign-in and session (/api/auth), Gmail data, tokens, or any other API answer.
const SHELL='unstage-shell-v1',TICKETS='unstage-tickets-v1';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(SHELL).then(c=>c.addAll(['/logo.svg','/icon-192.png','/manifest.webmanifest']).catch(()=>{})));});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('unstage-')&&k!==SHELL&&k!==TICKETS&&k!=='unstage-open')await caches.delete(k);await self.clients.claim();})()));
const stat=u=>u.origin===self.location.origin&&(/^\/_next\/static\//.test(u.pathname)||/^\/(?:pdfjs|fonts)\//.test(u.pathname)||/\.(?:png|svg|webmanifest|woff2?)$/.test(u.pathname));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==self.location.origin)return;
 // The page: always fresh when online (updates load at once); the last copy when offline.
 if(r.mode==='navigate'&&(u.pathname==='/'||u.pathname==='')){e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(SHELL).then(s=>s.put('/',c));}return res;}).catch(async()=>(await caches.match('/'))||Response.error()));return;}
 // Scripts, styles, fonts, icons: their names change with every version, so a kept copy is always the right one.
 if(stat(u)){e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(SHELL).then(s=>s.put(r,c));}return res;})));return;}
 // Ticket files: fresh when online (and the copy refreshed), the kept copy when there is no connection.
 if(u.pathname==='/api/file'){e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(TICKETS).then(s=>s.put(r,c));}return res;}).catch(async()=>(await caches.match(r))||new Response('offline',{status:503,headers:{'X-Offline':'1'}})));return;}});
// Signing out clears the phone (the app asks; see lib clear in app/ui.tsx).
self.addEventListener('message',e=>{if(e.data==='clear')e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('unstage-'))await caches.delete(k);})());});
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{};}catch{d={body:e.data&&e.data.text()};}
 e.waitUntil(self.registration.showNotification(d.title||'Unstage',{body:d.body||'',tag:d.tag,renotify:true,icon:'/icon-192.png',badge:'/icon-192.png',lang:'he',dir:'rtl',data:{url:d.url||'/'}}));});
// Tapping a notification: the event goes to the server (the app asks for it when it wakes), to a small cache entry, and as a message.
self.addEventListener('notificationclick',e=>{e.notification.close();const url=new URL((e.notification.data&&e.notification.data.url)||'/',self.location.origin).href;
 let k=null;try{k=new URL(url).searchParams.get('t');}catch{}
 const told=k?fetch('/api/push?step=want&t='+encodeURIComponent(k),{credentials:'include'}).catch(()=>{}):Promise.resolve();
 const keep=caches.open('unstage-open').then(c=>c.put('/__open',new Response(JSON.stringify({url,at:Date.now()})))).catch(()=>{});
 e.waitUntil(Promise.all([told,keep]).then(()=>self.clients.matchAll({type:'window',includeUncontrolled:true})).then(list=>{const c=list[0];if(c){try{c.postMessage({type:'open',url});}catch{}return c.focus().catch(()=>{});}return self.clients.openWindow(url);}));});
