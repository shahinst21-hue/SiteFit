import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutParameters,checkoutRedirect } from "../lib/payments/parameters.ts";
test("Checkout contact and full creation parameters remain identical across retries",()=>{
 const input={id:"70000000-0000-4000-8000-000000000001",analysis:"70000000-0000-4000-8000-000000000002",email:"verified@example.invalid",price:"price_example",origin:"http://localhost:3000",expires:1791309600};
 const first=checkoutParameters(input);assert.deepEqual(JSON.parse(JSON.stringify(first)),checkoutParameters(input));
 assert.equal(first.customer_email,input.email);assert.equal(first.mode,"payment");assert.deepEqual(first.line_items,[{price:input.price,quantity:1}]);
 assert.deepEqual(first.allowed_payment_method_types,["card"]);assert.equal(first.metadata?.purchase_id,input.id);
 assert.equal(first.metadata?.account_id,undefined);assert.equal(first.metadata?.email,undefined);
 assert.equal(first.allow_promotion_codes,false);assert.deepEqual(first.adaptive_pricing,{enabled:false});
 assert.throws(()=>checkoutParameters({...input,id:"foreign"}));
});
test("only official hosted Checkout redirect is accepted",()=>{
 assert.equal(checkoutRedirect("https://checkout.stripe.com/c/pay/cs_test_example"),"https://checkout.stripe.com/c/pay/cs_test_example");
 for(const url of [null,"https://evil.invalid/c/pay/example","http://checkout.stripe.com/c/pay/example","https://checkout.stripe.com.evil.invalid/c/pay/example","https://user@checkout.stripe.com/c/pay/example","https://checkout.stripe.com/other"])assert.throws(()=>checkoutRedirect(url));
});
