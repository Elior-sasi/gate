import type {NextConfig} from 'next';
// One canonical address keeps the Google login cookie and redirect URI on the same host.
const config:NextConfig={poweredByHeader:false,
 // The server's browser (lib/render) and its Hebrew fonts go with the functions.
 serverExternalPackages:['@sparticuz/chromium','puppeteer-core'],
 outputFileTracingIncludes:{'/api/**':['./node_modules/@sparticuz/chromium/bin/**','./lib/fonts/**']},env:{NEXT_PUBLIC_BUILD:process.env.VERCEL_GIT_COMMIT_SHA||''},
 async headers(){return [{source:'/sw.js',headers:[{key:'Cache-Control',value:'no-cache, no-store, must-revalidate'}]}];},
 async redirects(){return [{source:'/:path*',has:[{type:'host',value:'gate-virid.vercel.app'}],destination:'https://gatetickets.vercel.app/:path*',permanent:false}];}};
export default config;
