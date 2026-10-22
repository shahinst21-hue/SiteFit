import type {MeasurementConfig} from './config.ts';
import {canMeasure,deniedConsent,googleConsent,type Consent} from './consent.ts';
import {safeJourney,safePage,admittedEcommerce,type JourneyEvent,type Ecommerce} from './events.ts';
import type {Acquisition} from './attribution.ts';
export type TagSink={command:(...args:unknown[])=>void;load:(id:string,ready:()=>void)=>void;get:(key:string)=>string|null;set:(key:string,value:string)=>void;disable:(value:boolean)=>void};
export class GoogleMeasurement {
 private consent:Consent|null=null;private injected=false;private ready=false;private seen=new Set<string>();private page='/';private campaign:Acquisition={};
 private config:MeasurementConfig;private sink:TagSink;
 constructor(config:MeasurementConfig,sink:TagSink){this.config=config;this.sink=sink;sink.command('consent','default',googleConsent(deniedConsent()));}
 eligible(at?:string){return this.config.environment==='test'||!!at&&Date.parse(at)>=Date.parse(this.config.since);}
 allowed(){return this.config.enabled&&canMeasure(this.consent)&&this.ready;}
 update(c:Consent|null,campaign:Acquisition={}){
  this.consent=c;this.campaign=campaign;this.sink.disable(!this.config.enabled||!canMeasure(c));
  if(!this.config.enabled)return;
  // Defaults precede all config/event commands. A shared destination is never partially unblocked.
  this.sink.command('consent','update',googleConsent(c??deniedConsent()));
  if(!canMeasure(c)||this.injected)return;
  this.injected=true;
  const page=safePage(this.page);
  this.sink.command('js',new Date());
  this.sink.command('set',{send_page_view:false,page_location:this.location(page.path),page_title:page.title,page_referrer:'',allow_google_signals:false,allow_ad_personalization_signals:c!.personalization,ads_data_redaction:!c!.advertising,url_passthrough:false});
  this.sink.command('config',this.config.installation,{send_page_view:false,allow_enhanced_conversions:false,cookie_expires:15552000,...(this.config.environment==='test'?{debug_mode:true}:{})});
  this.sink.load(this.config.installation,()=>{this.ready=true;if(this.allowed())this.navigate(this.page);});
 }
 private location(path:string){const url=new URL(path,this.config.origin);for(const [k,v] of Object.entries(this.campaign))url.searchParams.set(k,v);return url.href;}
 private once(key:string){if(this.seen.has(key)||this.seen.size>=1000)return false;try{if(this.sink.get('sf-ga:'+key))return false;this.sink.set('sf-ga:'+key,'1');}catch{/* Storage denial still prevents duplicates in this document. */}this.seen.add(key);return true;}
 navigate(path:string){this.page=path;if(!this.allowed())return;const p=safePage(path);this.sink.command('set',{page_location:this.location(p.path),page_title:p.title,page_referrer:''});if(this.once('page:'+p.path))this.send('page_view',{page_location:this.location(p.path),page_title:p.title,page_referrer:''});this.track('landing_view','landing');if(path==='/check-location')this.track('check_started','check');}
 private send(name:string,params:object){if(this.allowed())this.sink.command('event',name,{...params,deployment_environment:this.config.environment,...(this.config.environment==='test'?{debug_mode:true}:{}),transport_type:'beacon',send_to:this.config.analytics});}
 track(name:JourneyEvent,key:string,business?:string,reason?:string){if(!this.allowed()||!/^[a-zA-Z0-9:_-]{1,180}$/.test(key))return;const event=safeJourney(name,business,reason);if(this.once(name+':'+key))this.send(event.event,event.params);}
 ecommerce(name:'purchase'|'begin_checkout'|'refund',payload:Ecommerce){if(this.allowed())this.send(name,admittedEcommerce(payload,name));}
}
