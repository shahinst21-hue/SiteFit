import 'server-only';
/** EU-only transport. No mailbox password, browser session, SDK, automatic retry or billing API. */
export type ZohoAttachment={storeName:string;attachmentName:string;attachmentPath:string};
export class ZohoSendError extends Error { readonly outcome:'not_sent'|'uncertain'; readonly code:'configuration_missing'|'preparation_unavailable'|'send_unconfirmed'; constructor(outcome:'not_sent'|'uncertain',code:'configuration_missing'|'preparation_unavailable'|'send_unconfirmed'){super(code);this.outcome=outcome;this.code=code;} }
export function zohoMailConfig(env:Record<string,string|undefined>){
 const keys=['ZOHO_MAIL_CLIENT_ID','ZOHO_MAIL_CLIENT_SECRET','ZOHO_MAIL_REFRESH_TOKEN','ZOHO_MAIL_ACCOUNT_ID'] as const;
 if(keys.some(k=>!env[k]?.trim())||!/^\d{5,30}$/.test(env.ZOHO_MAIL_ACCOUNT_ID??''))throw new ZohoSendError('not_sent','configuration_missing');
 return {clientId:env.ZOHO_MAIL_CLIENT_ID!,clientSecret:env.ZOHO_MAIL_CLIENT_SECRET!,refreshToken:env.ZOHO_MAIL_REFRESH_TOKEN!,accountId:env.ZOHO_MAIL_ACCOUNT_ID!};
}
async function boundedJson(response:Response){
 if(!response.ok||!response.headers.get('content-type')?.includes('application/json')){await response.body?.cancel();throw Error('provider_response');}
 const reader=response.body?.getReader();if(!reader)throw Error('provider_response');const chunks:Uint8Array[]=[];let total=0;
 while(true){const p=await reader.read();if(p.done)break;total+=p.value.length;if(total>65536){await reader.cancel();throw Error('provider_response');}chunks.push(p.value);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string,unknown>;
}
export function zohoMailTransport(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 const config=zohoMailConfig(env),base=`https://mail.zoho.eu/api/accounts/${config.accountId}/messages`;
 return {async prepare(pdf:Uint8Array){
  if(pdf.length<5||pdf.length>2_000_000||new TextDecoder().decode(pdf.slice(0,5))!=='%PDF-')throw new ZohoSendError('not_sent','preparation_unavailable');
  try{
   const auth=await boundedJson(await fetcher('https://accounts.zoho.eu/oauth/v2/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:config.clientId,client_secret:config.clientSecret,refresh_token:config.refreshToken})}));
   if(typeof auth.access_token!=='string'||auth.access_token.length>4096||!/^[A-Za-z0-9._-]+$/.test(auth.access_token))throw Error('provider_auth');
   const authorization=`Zoho-oauthtoken ${auth.access_token}`;
   const form=new FormData();form.append('attach',new Blob([Buffer.from(pdf)],{type:'application/pdf'}),'sitefit-contract.pdf');
   const upload=await boundedJson(await fetcher(`${base}/attachments?uploadType=multipart&isInline=false`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:authorization},body:form}));
   const status=upload.status as {code?:number}|undefined;const attachment=(Array.isArray(upload.data)&&upload.data.length===1?upload.data[0]:undefined) as ZohoAttachment|undefined;
   if(status?.code!==200||!attachment||!['storeName','attachmentName','attachmentPath'].every(k=>typeof attachment[k as keyof ZohoAttachment]==='string'&&attachment[k as keyof ZohoAttachment].length>0&&attachment[k as keyof ZohoAttachment].length<=1000))throw Error('provider_attachment');
   return {async send(to:string,message:{subject:string;html:string}){
    // Caller MUST persist its single dispatch intent before calling this method.
    if(!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(to)||to.length>254||/[\r\n]/.test(message.subject)||message.subject.length>200||Buffer.byteLength(message.html)>64000)throw new ZohoSendError('not_sent','preparation_unavailable');
    try{
     const sent=await boundedJson(await fetcher(base,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({fromAddress:'info@sitefit.co.uk',toAddress:to,subject:message.subject,content:message.html,mailFormat:'html',encoding:'UTF-8',askReceipt:'no',attachments:[attachment]})}));
     const code=(sent.status as {code?:number}|undefined)?.code;const id=(sent.data as {messageId?:unknown}|undefined)?.messageId;
     if(code!==200||typeof id!=='string'||!/^\d{5,40}$/.test(id))throw Error('provider_send');
     return {provider:'zoho-mail-eu' as const,messageId:id,state:'accepted' as const};
    }catch{throw new ZohoSendError('uncertain','send_unconfirmed');}
   }};
  }catch(error){if(error instanceof ZohoSendError)throw error;throw new ZohoSendError('not_sent','preparation_unavailable');}
 }};
}
