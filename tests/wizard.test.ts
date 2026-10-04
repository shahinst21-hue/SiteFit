import assert from "node:assert/strict";
import test from "node:test";
import {
  businessTypes,
  emptyDraft,
  nextStep,
  normaliseInput,
  validateStep,
  snapshotErrors,
  visibleEconomics,
  steps,
} from "../lib/wizard.ts";
import { formatPrice, site } from "../lib/site-config.ts";
const valid = () => ({
  ...emptyDraft(),
  address: "10 Test Street, Belfast, BT1 1AA",
  businessType: "coffee-shop" as const,
});
test("required address blocks progression; the unresolved entered address is retained", () => {
  const draft = emptyDraft();
  assert.equal(nextStep(0, draft), 0);
  assert.match(validateStep(0, draft).address!, /Enter/);
  draft.address = "not an address";
  assert.ok(validateStep(0, draft).address);
  draft.address = valid().address;
  assert.equal(nextStep(0, draft), 1);
  assert.equal(normaliseInput(valid()).address.resolution, "unresolved");
});
test("all four choices progress, with the salon subtypes sharing one approved category", () => {
  assert.equal(nextStep(1, emptyDraft()), 1);
  for (const type of businessTypes) {
    const draft = { ...valid(), businessType: type.id };
    assert.equal(nextStep(1, draft), 2);
    assert.equal(normaliseInput(draft).businessType, type.id);
  }
  assert.equal(
    normaliseInput({ ...valid(), businessType: "hair-salon" }).businessCategory,
    "hair-beauty-salon",
  );
  assert.equal(
    normaliseInput({ ...valid(), businessType: "beauty-salon" })
      .businessCategory,
    "hair-beauty-salon",
  );
});
test("optional economics preserve unknowns, zero and explicit units without calculations", () => {
  const draft = valid();
  draft.economics.annualRent = " 24000.50 ";
  draft.economics.businessRates = "0";
  const input = normaliseInput(draft);
  assert.equal(input.economics.annualRent, 24000.5);
  assert.equal(input.economics.businessRates, 0);
  assert.equal(input.economics.staffCosts, null);
  assert.deepEqual(input.units, {
    costs: "annual",
    size: "square-metres",
    openingDays: "per-week",
    openingHours: "per-day",
    investment: "one-off",
  });
  assert.equal(nextStep(2, valid()), 2);
  assert.equal(nextStep(2, draft), 2);
});
test("economics reject negative, nonfinite, scientific, comma, precision and bounded values", () => {
  for (const raw of [
    "-1",
    "Infinity",
    "NaN",
    "1e3",
    "1,000",
    "12.345",
    "£20",
    "100000001",
  ]) {
    const draft = valid();
    draft.economics.annualRent = raw;
    assert.ok(validateStep(2, draft).annualRent, raw);
    assert.throws(() => normaliseInput(draft));
  }
  for (const [key, value] of [
    ["grossMargin", "101"],
    ["openingDays", "8"],
    ["openingDays", "2.5"],
    ["openingHours", "24.01"],
  ] as const) {
    const draft = valid();
    draft.economics[key] = value;
    assert.ok(validateStep(2, draft)[key]);
  }
});
test("review validation requires every prior step; modifying economics preserves other entries", () => {
  assert.throws(() => normaliseInput(emptyDraft()));
  const draft = valid();
  const changed = {
    ...draft,
    economics: { ...draft.economics, openingDays: "6" },
  };
  assert.equal(changed.address, draft.address);
  assert.equal(changed.businessType, draft.businessType);
  assert.deepEqual(validateStep(3, changed), {});
});
test("pricing is configured once in minor units with GBP presentation", () => {
  assert.equal(site.pricing.snapshot, 0);
  assert.equal(site.pricing.fullReport, 2900);
  assert.equal(formatPrice(site.pricing.fullReport), "£29");
  assert.equal(formatPrice(site.pricing.snapshot), "£0");
});
test("Snapshot requires only address/business and ignores absent or invalid optional economics", () => {
  const draft = valid();
  assert.deepEqual(steps, [
    "Property Address",
    "Business Type",
    "Free Snapshot",
  ]);
  assert.deepEqual(snapshotErrors(draft), {});
  draft.economics.grossMargin = "invalid-unsaved-entry";
  assert.deepEqual(snapshotErrors(draft), {});
  assert.equal(nextStep(1, draft), 2);
  assert.ok(validateStep(2, draft).grossMargin);
  assert.ok(snapshotErrors({ ...draft, address: "" }).address);
  assert.ok(snapshotErrors({ ...draft, businessType: "" }).businessType);
});
test("Economics disclosure starts with three highest-value fields and expands without duplicates", () => {
  assert.deepEqual(
    visibleEconomics(false).map((f) => f.id),
    ["annualRent", "averageTransactionValue", "businessRates"],
  );
  assert.equal(visibleEconomics(true).length, 10);
  assert.equal(new Set(visibleEconomics(true).map((f) => f.id)).size, 10);
  assert.deepEqual(validateStep(2, valid()), {});
});
test("Address entry accepts four-nation examples without a London restriction or resolution claim", () => {
  for (const address of [
    "10 Test Street, Manchester, M1 1AA",
    "10 Test Street, Edinburgh, EH1 1AA",
    "10 Test Street, Cardiff, CF10 1AA",
    "10 Test Street, Belfast, BT1 1AA",
  ]) {
    const draft = { ...valid(), address };
    assert.deepEqual(snapshotErrors(draft), {});
    assert.equal(normaliseInput(draft).address.resolution, "unresolved");
  }
});
