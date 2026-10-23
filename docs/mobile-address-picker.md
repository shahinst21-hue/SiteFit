# Mobile address picker correction — 23 October 2026

The property wizard constrained its result list with `clamp(68px, calc(100svh - 430px), 280px)` inside a height-constrained flex layout. On short/mobile viewports this exposed only one address and concealed the remaining choices behind nested scrolling.

For widths up to 767px, property selection now uses normal page scrolling, presents the first four matching addresses, and provides an explicit Show all N addresses action. Expanding focuses the fifth result so keyboard users retain their place. Search resets expansion; filtering remains local and announces matching counts. A shorter filter placeholder fits mobile inputs. Desktop retains its existing scrollable result list. No address provider, persistence, payment, analytics or security behaviour changes.

Verified locally against the existing synthetic journey rehearsal (no provider/AI/payment requests): 390x844 collapsed four rows, reveal all 12 and focus fifth, filter/no-match/clear, select the twelfth result with Enter and advance to the business step; 320x640 expanded list without horizontal overflow; 1280x900 desktop list. Browser console contained no warnings/errors during these checks. Physical handset and software keyboard behaviour are not verified. Screenshots retained in the task artifact directory.

Validation: npm ci; lint and typecheck passed; all 486 existing tests passed. Production build and protected CI status recorded in the PR. Not deployed by this implementation record.
