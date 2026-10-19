import {getToken} from 'next-auth/jwt';
import type {NextRequest} from 'next/server';
import {GOOGLE_CLIENT_ID} from '@/lib/google';
// A fresh Google access token for the signed-in user (refreshed from the long-lived token when it is about to expire).
async function fresh(token:Record<string,unknown>){
 let accessToken=String(token.accessToken);
 if(Number(token.expiresAt||0)*1000<Date.now()+30000){
  if(!token.refreshToken)throw new Error('RECONNECT');
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:GOOGLE_CLIENT_ID,client_secret:process.env.AUTH_GOOGLE_SECRET!,grant_type:'refresh_token',refresh_token:String(token.refreshToken)}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error('RECONNECT');accessToken=(await r.json()).access_token;
 }
 return accessToken;
}
export async function identity(req:NextRequest){
 const token=await getToken({req,secret:process.env.AUTH_SECRET,secureCookie:req.nextUrl.protocol==='https:'});
 if(!token?.googleId||!token.accessToken)throw new Error('UNAUTHORIZED');
 if(token.scope!==undefined&&!String(token.scope).includes('gmail.readonly'))throw new Error('NO_GMAIL');
 return {id:String(token.googleId),accessToken:await fresh(token)};
}
