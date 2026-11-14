import {renderPage,closeBrowser,renderWhy} from '@/lib/render';
import {presApi,presPage,presTicket} from '@/lib/pres';
export const dynamic='force-dynamic';export const maxDuration=60;
// Temporary: where a Lev Cinema ticket link leads, and whether it can be kept (addresses masked, sizes only).
const mask=(u:string)=>{try{const x=new URL(u);return x.hostname+x.pathname.replace(/[0-9a-f-]{16,}/gi,'<id>').replace(/\d{5,}/g,'<n>');}catch{return 'bad';}};
export async function GET(){const t=Date.now();const out:Record<string,unknown>={};
 const link='https://u8691343.ct.sendgrid.net/ls/click?upn=u001.SvH5QVMi3ywViKaV9nSV9ZKVnx9SMxs8NAPzx6OwIV4US24WuLPYqEroV1lDULlg07SJ5kMYVspBPF9gWXnovj2nWJfcj8rI-2FfGkprcPUeOGWILuoDKFk-2BkqFa-2BHQiFPTqlebeA2rCLL89wa5disWg-3D-3Da2n8_PKtD7cYhVuyEZBsXOwIdBE0-2BLtByrjSIrHIyTmVbaY4MU9AFU-2Fv8p-2BQQPZnbs-2Fw5rVMfP-2BAF0Xkqaii2XNAsgx8PEiuEInnCCm9AscEByNW2ycDXlkK9T07s6bcUFFSMk7NdOKOi7CYdunBoZskOwgHAFqHLPLnTb7JKCHqAnOydMsyNG1JZvmV7Sc5rt9otyeQCE1uCmSWsIKQZQDMfIw-3D-3D';
 try{const r=await fetch(link,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'}});
  out.final=mask(r.url);out.status=r.status;out.api=presApi(r.url)?mask(presApi(r.url)!):null;out.page=presPage(r.url)?mask(presPage(r.url)!):null;
  if(presApi(r.url)){const p=await presTicket(r.url).catch(e=>String(e));out.data=typeof p==='string'?p:p?{seats:p.info.seats.length,count:p.info.count}:null;
   const g=await renderPage(presPage(r.url)!);out.render=g?g.data.length:renderWhy;}}catch(e){out.err=String(e).slice(0,200);}
 await closeBrowser();return Response.json({ms:Date.now()-t,...out},{headers:{'Cache-Control':'no-store'}});}
