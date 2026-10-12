# D100 — one D99 technical proof

12 October 2026. Owner separately approved US$0.30 additional reservation, raising the conservative Phase 12 ceiling to US$2.14. Prior US$1.84 reservations remain held. This is not an operating or search budget.

## Actual result: FAILED, no retry

New edition `bdf1e316-bcad-4449-8b55-cc5383e7771d` uses the D99 deterministic Appendix policy and the existing frozen real-source coffee-shop case. No provider retrieval or web search. Preflight produced bounded requests of 14,109 / 6,130 / 24,015 bytes and output caps 3,000 / 3,000 / 6,000. Conservative maximum estimate US$0.29125, below the US$0.30 reservation.

Exactly three standard GPT 6.1 Sol requests:

| Group | Result | Input/output tokens | Latency | Estimated cost |
| --- | --- | --- | --- | --- |
| Context | accepted | 3,484 / 289 | 7,078 ms | US$0.009858 |
| Premises | accepted | 1,260 / 190 | 6,075 ms | US$0.004420 |
| Synthesis | invalid | 5,330 / 5,165 | 96,391 ms | US$0.062310 |

Totals: 10,074 input / 5,644 output tokens, US$0.076588 usage-derived estimate (not an invoice), 106,515 ms end-to-end. No retries. US$0.30 stays reserved; no unknown prior reservation is released. Total held US$2.14.

Safe diagnostic: `unsupported_narrative_claim`, `sections[1].analysis[0]`, `literal_number`. Edition remains Draft at revision 6, null Full projection and no published sections. New Ready/replay/full PDF cannot be verified and remains BLOCKED. Draft PDF is not substituted for this proof.

## Root cause / fix / remaining risk

**Observed cause of rejection:** the validator's literal-number gate. The rejected sentence was discarded by the existing privacy policy, so its precise contents and factual validity are unknown. Neither this receipt nor the previous unretained failure proves a hallucination or false positive. D99's reproduced scope-regex mismatch is not claimed as the cause of an earlier live failure.

**Offline verification:** a customer-context sentence with raw digits reproducibly rejects at that exact field/rule; a sentence referencing the same admitted population fact validates and renders the approved rounded value. The prompt expressly requires numerical references and prohibits raw digits. No demonstrated incompatibility warrants weakening that gate. No prompt/engine redesign or paid rerun has been performed.

**Remaining risk:** a live model may violate the numeric-reference contract. Phase 12 stays incomplete; further execution requires a separate exact budget approval. Any proposal to retain a narrowly redacted rejection diagnostic must preserve private-text/source controls and be evaluated before another proof, not silently enabled.

Hosted post-proof verification: historical Ready fingerprint `d1b7ad7acdac8d86cde7fbbb89bba27c`, retained rent fingerprint `bf9f402054b6b946540ab92d2ac2f8ec` and question-function fingerprint `8894bac6ab7930be80718eb9f41a9ed5` unchanged. Anonymous Full read and authenticated raw-material execution remain denied.
