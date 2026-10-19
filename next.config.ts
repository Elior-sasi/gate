import type {NextConfig} from 'next';
const config:NextConfig={poweredByHeader:false,env:{NEXT_PUBLIC_BUILD:process.env.VERCEL_GIT_COMMIT_SHA||''}};
export default config;
