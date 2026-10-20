// A ticket file from a mail. Gmail can hand out a new attachment id each time a message is read,
// so a saved id may stop working: then the file is found again in the message by name or type.
import type {Gmail} from '@/lib/gmail';
export const SAFE=/^(application\/pdf|application\/vnd\.apple\.pkpass|image\/(png|jpe?g|gif|webp))$/;
type P={filename?:string;mimeType?:string;body?:{attachmentId?:string;data?:string};parts?:P[]};
export async function attachment(gmail:Gmail,m:string,a:string,name:string,type:string){
 let data='';try{data=String((await gmail('messages/'+encodeURIComponent(m)+'/attachments/'+encodeURIComponent(a))).data||'');}catch{}
 if(data)return data;
 const msg=await gmail('messages/'+encodeURIComponent(m)+'?format=full');const parts:P[]=[];const walk=(p?:P)=>{if(!p)return;parts.push(p);p.parts?.forEach(walk);};walk(msg.payload);
 const hit=parts.find(p=>p.filename&&p.filename===name)||parts.find(p=>p.body?.attachmentId&&(p.mimeType||'').toLowerCase()===type)||parts.find(p=>p.body?.attachmentId&&/pdf/i.test((p.mimeType||'')+(p.filename||'')));
 if(hit?.body?.data)return hit.body.data;
 if(hit?.body?.attachmentId)return String((await gmail('messages/'+encodeURIComponent(m)+'/attachments/'+encodeURIComponent(hit.body.attachmentId))).data||'');
 return '';}
