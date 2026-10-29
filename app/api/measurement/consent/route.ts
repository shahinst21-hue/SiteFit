import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {sameOrigin} from '@/lib/analysis/http';
import {boundedJson} from '@/lib/payments/http';
import {measurementConfig} from '@/lib/measurement/config';
import {consentChoice,parseConsent,consentMaxAge,CONSENT_COOKIE,ACQUISITION_COOKIE,optionalGoogleCookie} from '@/lib/measurement/consent';
import {acquisition,parseAcquisition} from '@/lib/measurement/attribution';
import {CLARITY_CONSENT_COOKIE,clarityConfig,clarityChoice,parseClarityConsent,optionalClarityCookie} from '@/lib/measurement/clarity';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
export async function GET(){const jar=await cookies(),consent=parseConsent(jar.get(CONSENT_COOKIE)?.value);return NextResponse.json({config:measurementConfig(process.env),clarity:clarityConfig(process.env),clarityConsent:parseClarityConsent(jar.get(CLARITY_CONSENT_COOKIE)?.value),consent,acquisition:parseAcquisition(jar.get(ACQUISITION_COOKIE)?.value,consent)},{headers});}
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Unavailable.'},{status:403,headers});
 try{const body=await boundedJson(request,2048);if(Object.keys(body).some(k=>!['preferences','acquisition','clarity'].includes(k)))throw Error();
 const replay=clarityChoice(Object.hasOwn(body,'clarity')?body.clarity:false);
 const consent=consentChoice(body.preferences),values=acquisition(body.acquisition,consent),jar=await cookies();
 const previous=parseAcquisition(jar.get(ACQUISITION_COOKIE)?.value,consent),chosen=Object.keys(previous).length?previous:values;
 const response=NextResponse.json({consent,clarityConsent:replay,acquisition:chosen},{headers});
 const options={httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax' as const,path:'/'};
 response.cookies.set(CONSENT_COOKIE,JSON.stringify(consent),{...options,maxAge:consentMaxAge});
 response.cookies.set(CLARITY_CONSENT_COOKIE,JSON.stringify(replay),{...options,maxAge:consentMaxAge});
 response.cookies.set(ACQUISITION_COOKIE,JSON.stringify({at:Date.now(),values:chosen}),{...options,maxAge:consent.analytics&&Object.keys(chosen).length?90*86400:0});
 if(!consent.analytics||!consent.advertising){response.cookies.set('sitefit_campaign','',{...options,maxAge:0});const host=new URL(request.url).hostname,domain=host.endsWith('sitefit.co.uk')?'.sitefit.co.uk':host.endsWith('.vercel.app')?'.'+host:null;for(const c of jar.getAll())if(optionalGoogleCookie(c.name)){response.cookies.set(c.name,'',{...options,httpOnly:false,maxAge:0});if(domain)response.headers.append('Set-Cookie',`${c.name}=; Domain=${domain}; Path=/; Max-Age=0; SameSite=Lax; Secure`);}}
 if(!replay.allowed||!consent.analytics||!consent.advertising){const host=new URL(request.url).hostname;for(const c of jar.getAll())if(optionalClarityCookie(c.name)){response.cookies.set(c.name,'',{...options,httpOnly:false,maxAge:0});if(host==='sitefit.co.uk'||host.endsWith('.sitefit.co.uk'))response.headers.append('Set-Cookie',`${c.name}=; Domain=.sitefit.co.uk; Path=/; Max-Age=0; SameSite=Lax; Secure`);}}
 return response;
 }catch{return NextResponse.json({error:'Choose valid cookie preferences.'},{status:400,headers});}
}
