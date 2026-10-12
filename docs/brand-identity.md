# SiteFit brand identity V1

**Owner-approved requirements, 11 October 2026 (D93).** The supplied sheets define SiteFit's colours, typography, spacing, shape and icon system. They supersede conflicting older visual tokens. Evidence truth, accessibility and phase boundaries remain authoritative.

## Colours

| Token | Value | Role |
| --- | --- | --- |
| Primary / brand lime | `#b2f34c` | Primary CTA and active selection, with Midnight Ink text |
| Midnight Ink | `#0d1400` | Primary text, ghost/outline borders, dark fills |
| Graphite Ink | `#1b1b1b` | Supporting secondary UI, dividers and labels; never the primary CTA substitute |
| Steel | `#60646c` | Secondary body text, supporting descriptions and helper copy |
| Ash | `#7c7c7c` | Receding metadata/decoration; use a darker approved neutral where contrast requires it |
| Hairline | `#e0e1e6` | 1 px borders, outlines and divider rules |
| Drafting Gray | `#eaeaea` | Page canvas and secondary section surfaces |
| Marble | `#ffffff` | Cards, elevated panels, navigation, text on dark fills |
| Peach Wash | `#ffe4c3` | Warm category surface |
| Sky Wash | `#cbedff` | Cool category surface |
| Mint Wash | `#caf3aa` | Fresh category surface |

Category washes organise content; they do not certify evidence or suitability. Lime denotes an action or active state. Outcome (supportive, caution/trade-off, conditional/contextual, unavailable) and evidence strength stay distinct. Important states also require text or an icon; colour alone is insufficient. Never recolour missing evidence into a favourable finding.

## Typography

The sheet specifies **Minor Third (1.2), from a 14 px base**. Preserve its explicit values rather than recomputing another scale.

| Role | Size | Weight | Line height |
| --- | --- | --- | --- |
| Display | 68 px | 600 | 1 |
| Section heading | 56 px | 600 | 1.05 |
| Statistic | 54 px | 400 | 1 |
| Heading | 36 px | 600 | 1.15 |
| Large body | 18 px | 400 | 1.6 |
| Body | 16 px | 400 | 1.5 |
| Card heading | 16 px | 400 | 1.5 |
| Extended-reading body | 16 px | 400 | 1.63 |

Apply the appropriate role to the hierarchy. Display does not require oversized property addresses. Reduce large headings/statistics responsively on narrow screens; preserve readable conclusions, wrapping and usable controls. Secondary metadata may be smaller. Keep exact numeric operands internally and use the approved customer rounding contract.

No typeface name was supplied. Retain the existing system fonts rather than inventing a font identity or purchasing a font.

## Spacing and shape

| Purpose | Requirement |
| --- | --- |
| Density | Comfortable |
| Base unit | 4 px |
| Major section gap | 48 px |
| Card padding | 24 px |
| Element gap | 8 px |

Use multiples of the base unit. Major-section gaps and within-component gaps are different hierarchy levels; do not insert 48 px between every control. Stack cards when needed rather than compressing their content.

| Element | Radius |
| --- | --- |
| Links/navigation shapes | 6 px |
| Buttons | 12 px |
| Cards | 16 px |
| Images | 32 px |
| Large feature cards | 32 px |

Whole-card interactive controls keep card radius. Map tiles remain square inside the rounded image frame to avoid seams.

## Icons

Use [Astra Icons](https://github.com/uiastra/astraicons), currently pinned **`@astraicons/react@1.7.0`**, MIT, selected linear SVG components. Keep consistent scale/stroke and meaningful roles; avoid mixed arbitrary icon families or decorative 3D analytical navigation. Decorative icons are hidden from assistive technology beside visible labels. Icon-only controls need accessible names and usable touch targets. No remote runtime icon request is needed.

## Application and acceptance

Phase 13 applies this identity to all eight report views. The owner's subsequent site-wide authorisation (D94) extends the shared identity to all public, account, authentication, purchase, Snapshot, editorial and error surfaces, including mobile/tablet navigation. Preserve their existing product behaviour and security boundaries. Use the owner's re-supplied vector logo at `public/brand/sitefit-wordmark.svg`, including the dashboard; never approximate the wordmark with live text. Snapshot changes remain presentation only.

Verify actual desktop/mobile composition, contrast, keyboard/focus, readable real 200% zoom, long/missing data and interactions. Compilation and screenshots are not customer acceptance. Technical sources belong in Appendix; material limitations and map attribution remain in context. Reference figures are never report evidence.

## Retained owner sheets

Design references only; their dark display canvas does not mandate a dark theme.

- [Typography](brand-references/typography.png)
- [Spacing and shape](brand-references/spacing-shape.png)
- [Accent washes](brand-references/accent.png)
- [Neutral palette](brand-references/neutrals.png)
- [Midnight Ink](brand-references/midnight-ink.png)

Implementation: [site-wide stylesheet](../app/brand.css), [dashboard stylesheet](../app/report-dashboard.css), [shared icon adapter](../components/icon.tsx). Selected package has no dedicated dining, rail or scissors glyph; explicit labels accompany neutral role icons instead of misleading pictograms. Delivery and open gates: [Phase 13 status](phase-13-status.md).
