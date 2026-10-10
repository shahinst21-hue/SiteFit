import test from "node:test";
import assert from "node:assert/strict";
import { buildAssessment } from "../lib/analysis/assessment.ts";
import { context, date } from "./fixtures/data/framework.ts";
import { buildCatalog } from "../lib/report-intelligence/catalog.ts";
import { validateSelection, renderSelection } from "../lib/report-intelligence/selection.ts";

test("a favourable selected lead cannot remove mandatory opposition or substitute another section's evidence",()=>{
 const c=buildCatalog(buildAssessment(context(),[],[],[],null,null,false,[],new Date(date)),[],new Date(date));
 c.atoms.push({id:"support",section:"access",role:"reason",text:"Stored modelled approach.",factIds:[],rule:"synthetic"},
  {id:"lead",section:"access",role:"conclusion",text:"Conditional approach.",factIds:[],rule:"synthetic"},
  {id:"risk",section:"access",role:"caution",text:"Entrance and restrictions unverified.",factIds:[],rule:"synthetic"},
  {id:"foreign",section:"competition",role:"reason",text:"Inventory context.",factIds:[],rule:"synthetic"});
 const selection={sections:[{key:"access",lead:"lead",reasons:["support"],implications:[],actions:[]}]};
 const s=validateSelection(selection,c,["access"]), rendered=renderSelection(s,c)[0];
 assert.equal(rendered.cautions[0].id,"risk");assert.equal(rendered.direction,"conditional");
 assert.throws(()=>validateSelection({sections:[{...selection.sections[0],reasons:["foreign"]}]},c,["access"]),/unsupported_selection/);
 assert.throws(()=>validateSelection({sections:[{...selection.sections[0],lead:"Invented success probability"}]},c,["access"]),/unsupported_lead/);
});
