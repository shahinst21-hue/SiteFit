# Phase 12 synthesis contract audit — 11 October 2026

Local, no-spend contract review requested by the owner. No AI call, provider retrieval, database write, budget change or historical report rewrite. This is a narrow correction, not an editorial redesign or Phase 12 completion.

## Root cause established locally

1. **Definite validator false positive:** with no admitted leading format, the previous recommendation regex rejected “We cannot recommend a takeaway format without verified layout evidence.” It matched `recommend … takeaway … format` inside an explicit withholding statement. Reproduced using the previous committed validator and a local eight-section fixture: `unsupported_narrative_claim`. This conflicts with the approved requirement to explain why a format cannot be selected.
2. **Request/runtime mismatches:** schema allowed short text while runtime required 12–800 characters. Schema allowed any eight section keys while runtime required every section once in exact order. Prompt requested operator IDs but did not explicitly require the source fact ID alongside each operator ID, including unknown claims. Runtime also required distinct IDs and a 24,000-byte total JSON bound without the prompt stating those rules. These rejection cases are reproduced locally; the restrictions themselves remain justified.
3. **The failed live run's exact cause is still unknown:** its rejected synthesis was not stored. These are demonstrated defects/rejection paths, not proof that one caused that particular failure. Its receipt records a completed provider response with 4,734 output tokens, below the 6,000-token cap; this does not establish its JSON byte size or a valid narrative.

## Small fix

- Keep the positive recommendation gate. Exempt only narrowly explicit `cannot / can't / do not / must not / should not recommend or choose [a/the] takeaway/dine-in/sit-in/hybrid format/model` clauses from the format-regex scan. Any separate positive recommendation still fails. All other safety and evidence checks examine the original text.
- Add schema `minLength: 12`, matching the unchanged runtime minimum.
- State the existing exact section order, per-text and aggregate bounds, distinct admitted IDs and operator source-fact lineage in the prompt. No evidence admission, schema cardinality, response limit or storage limit is relaxed.
- Continue persisting only allowlisted validation error codes in future failure receipts. Do not store arbitrary exception details or rejected provider prose.

## Limits and evidence audit

Eight ordered sections remain Overview, Customer Context, Competition, Access, Premises, Rental Context, Actions and Appendix. Three verdict lines, one priority action, one to four strengths/risks, exactly four action/consequence pairs, and one to three analysis claims per section are unchanged. This yields 38–60 commentary objects; the aggregate byte ceiling is stricter than the per-field schema maximum, intentionally.

Runtime still rejects absent/duplicate/foreign fact, operator and supplement IDs; an operator slot requires both its operator ID and its admitted source fact ID. Rental slots require a rental observation ID also bound in referenceIds. History reference IDs match admitted timeline/supplement references. Missing/rejected data are not substituted. Literal numerical prose, malformed slots/text, unsupported figures, capacity and ungated recommendations remain rejected.

Actual local preflight after this fix: instructions **3,669 bytes** (limit 4,000), schema **1,712 bytes** (limit 4,000). Synthesis still allows at most **6,000 output tokens**, 24,000 narrative JSON bytes, 131,072 final projection bytes, 120-second provider timeout and a 200-second route configuration. Tokens, UTF-8 bytes and final projection size are separate checks; fitting one does not prove the others. No cap was raised.

## Regression and remaining risk

Fixtures cover the previous false rejection, readable withholding output, positive recommendation rejection even following a negative clause, reversed/duplicate/missing sections, too-short/too-long text, aggregate overflow, duplicate/foreign IDs, missing operator lineage and unbound rent slots. Existing evidence, scenario and output tests remain in place.

The regex is a bounded guard, not semantic entailment; nuanced phrasing and truthful interpretation still need proportionate real verification. An instruction cannot guarantee the model obeys every cross-field rule. No new successful paid report or ready persistence/replay is proven by these local tests. Phase 12 remains blocked on its mandatory new V1 technical completion gate; no new paid call or Phase 13 start is authorised by this audit.

Validation: npm run check passed lint, strict types, all 299 tests and production build. After adding the explicit withholding case to the actual eight-section generation/export/replay fixture, all twelve focused generation/narrative tests passed; lint and strict types were repeated. No live request was made. The local prior-validator reproduction confirmed the rejection before the fix.

