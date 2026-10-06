import {test} from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import {verifiedPrice,verifiedSession} from '../lib/payments/stripe.ts';
import {PRODUCT} from '../lib/payments/config.ts';

test('provider Price admission rejects live, inactive, recurring, flexible and wrong product/money',async()=>{
 const product={id:'prod_fixture',active:true,livemode:false,metadata:{sitefit_product:PRODUCT}};
 const price={id:'price_fixture',active:true,livemode:false,type:'one_time',currency:'gbp',unit_amount:2900,billing_scheme:'per_unit',product};
 const check=(value:unknown)=>verifiedPrice({prices:{retrieve:async()=>value}} as unknown as Stripe,'price_fixture');
 await check(price);
 for(const change of [{livemode:true},{active:false},{type:'recurring'},{currency:'usd'},{unit_amount:2901},{billing_scheme:'tiered'},{custom_unit_amount:{}},{recurring:{}},{product:'prod_fixture'},{product:{deleted:true}},{product:{...product,active:false}},{product:{...product,livemode:true}},{product:{...product,metadata:{sitefit_product:'other'}}}])await assert.rejects(()=>check({...price,...change}));
});

test('provider Session admission rejects foreign/live/mismatched money, metadata, quantity and incomplete lines',async()=>{
 const binding={id:'purchase_fixture',analysis:'analysis_fixture',price:'price_fixture'};
 const metadata={purchase_id:binding.id,analysis_id:binding.analysis,product_type:PRODUCT,version:'1'};
 const session={id:'cs_test_fixture',livemode:false,mode:'payment',amount_total:2900,currency:'gbp',metadata};
 const line={quantity:1,price:{id:binding.price,livemode:false},amount_total:2900};
 const check=(value:unknown,lines:unknown={data:[line],has_more:false})=>verifiedSession({checkout:{sessions:{retrieve:async()=>value,listLineItems:async()=>lines}}} as unknown as Stripe,'cs_test_fixture',binding);
 await check(session);
 for(const change of [{id:'cs_live_fixture'},{livemode:true},{mode:'subscription'},{amount_total:2800},{currency:'usd'},{metadata:{...metadata,purchase_id:'foreign'}},{metadata:{...metadata,analysis_id:'foreign'}},{metadata:{...metadata,product_type:'other'}},{metadata:{...metadata,version:'2'}}])await assert.rejects(()=>check({...session,...change}));
 for(const lines of [{data:[line],has_more:true},{data:[],has_more:false},{data:[line,line],has_more:false},{data:[{...line,quantity:2}],has_more:false},{data:[{...line,amount_total:2800}],has_more:false},{data:[{...line,price:{id:'price_other',livemode:false}}],has_more:false},{data:[{...line,price:{id:binding.price,livemode:true}}],has_more:false}])await assert.rejects(()=>check(session,lines));
});
