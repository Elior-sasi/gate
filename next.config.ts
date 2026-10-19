import type {NextConfig} from 'next';
// One canonical address keeps the Google login cookie and redirect URI on the same host.
const config:NextConfig={poweredByHeader:false,env:{NEXT_PUBLIC_BUILD:process.env.VERCEL_GIT_COMMIT_SHA||''},
 async redirects(){return [{source:'/:path*',has:[{type:'host',value:'gate-virid.vercel.app'}],destination:'https://gatetickets.vercel.app/:path*',permanent:false}];}};
export default config;
