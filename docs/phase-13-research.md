# Phase 13 research → implementation

Reviewed 11 October 2026. Primary product documentation/changelogs, not claims from screenshots or speculative 2027 articles. Undated docs are marked as such; their availability was verified on the review date. No product account, subscription or paid service was activated.

| Product / verified source | Date / status | Useful finding → SiteFit decision | Implementation / verification |
| --- | --- | --- | --- |
| [Linear agent-assisted editing](https://linear.app/changelog/2026-07-23-agent-assisted-editing) | 23 July 2026, shipped changelog | Context and attribution close to work → findings open their evidence in place | Evidence panel, retained source identity; keyboard/return-focus QA |
| [Vercel navigation redesign](https://vercel.com/changelog/dashboard-navigation-redesign-rollout) | 2026 rollout, shipped | Consistent navigation across contexts → compact stable section navigation | Eight named views, URL/back state; do not copy an admin sidebar |
| [Notion charts](https://www.notion.com/help/charts) / [dashboards](https://www.notion.com/en-gb/help/dashboards) | Undated current production docs | Views of the same underlying data → selectors display frozen series | Native dataset/contour selectors; no new analysis or editable source data |
| [Claude Artifacts](https://www.anthropic.com/news/artifacts) | 27 August 2024, shipped; current product docs reviewed | Independent interactive workspace rather than chat transcript → report is the main experience | Cards/maps/inspection; no live embedded AI or mutable report content |
| [Perplexity source transparency](https://www.perplexity.ai/help-center/en/articles/10352903-what-is-pro-search) | Current production help, publication timing not used as a release claim | Direct source links support verification → contextual source inspector | Safe public links, date/scope/type/limitations; no unsupported search automation |
| [Felt layer design](https://felt.com/blog/data-layering-in-gis) | 16 July 2026 | Layer hierarchy helps geographic understanding → explicit walking/point toggles | Stored SVG polygons, layer controls, map/list; no invented street background |
| [CARTO spatial semantics](https://carto.com/blog/ai-agents-spatial-semantics/) / [Q2 changelog](https://carto.com/blog/whats-new-in-carto-q2-2026/) | July 2026, documented production direction | Geometry meaning and tool traceability matter → period/unit/precision remain attached | Separate station register point/modelled route, source inspection; no agent/backend expansion |
| [ArcGIS selection](https://support.esri.com/en-us/knowledge-base/how-to-enable-the-selection-tool-in-arcgis-dashboards-000023962) | Existing production documentation, older pattern still current | Map/list selection connects views → same named marker identity in both | Keyboard marker selection and equivalent list; not a heavyweight GIS UI |
| [Power BI drillthrough](https://learn.microsoft.com/en-us/power-bi/guidance/report-drillthrough) | Updated 30 December 2024, current production docs | Summary → detail → return preserves context | Evidence drawer and contextual page actions; no blank fake chart |
| [Tableau dashboard actions](https://help.tableau.com/current/pro/desktop/en-gb/actions_dashboards.htm) | Undated current production docs | Actions must have explicit targets → no dead/circular links | Section and source controls mapped to actual content; no new cross-filtered inference |
| [Observable Framework](https://observablehq.github.io/framework/) | Current project documentation | Frozen snapshots can power responsive interactive pages → presentation-only exploration | No providers on read, native category chart + full accessible table |

## Direction and forward-looking limits

SiteFit's original decision canvas combines the owner's light/forest-green/lime composition with a Consultant Verdict, business-specific operating gates and in-context evidence inspection. Eight icon tabs orient the user; mobile keeps a compact horizontal section navigator and collapses to focused content rather than administrative chrome. Not a clone of any benchmark.

Credible emerging direction: governed contextual AI workspaces and semantic geographic tools (CARTO/Felt). SiteFit adopts evidence-linked context and deterministic exploration, not autonomous decisions or generative content on read. Any prediction that 2027 requires ambient agents, automatic layout synthesis or autonomous property verification is speculative and does not determine architecture.

## Module research and skills log

Emil repository [fixed revision](https://github.com/emilkowalski/skills/tree/6465079742eb019bc419caf2c352ecda03f5dfd8), MIT. README documents `npx skills@latest add`; reviewed npm metadata and executable mechanism. Native Codex's inspected `skill-installer` safely downloaded/copy-validated that exact revision into the local skills directory instead of executing uncontrolled `latest`. All 11 selected SKILL files were read and manually applied during this turn; automatic catalog discovery becomes available next turn.

| Skill / source | Concrete application | Validation target |
| --- | --- | --- |
| emil-design-eng | Result hierarchy, restrained cards, responsive type, wrap/min-width, visible press/focus | Rendered eight-page review against supplied references |
| prototype | Three isolated Overview axes: decision canvas, consultant brief, action-first. Owner explicitly delegates minor choice; reference-led canvas selected without another approval cycle | `/dev/report-prototypes`, instantaneous variant switch and actual links |
| pick-ui-library / [Base UI dialog docs](https://base-ui.com/react/components/dialog) | Existing dependency audit; accessible focus/dismissal for evidence, Recharts static profiles; no motion dependency for CSS transitions | Escape/focus restore, actual chart/table parity |
| mobile-native | Capability-gated hover, 44px controls, 16px inputs, safe-area/dynamic viewport evidence panel, zoom allowed | Responsive emulation now; hardware verification separately recorded |
| find-animation-opportunities + animate | Panel 220ms transform/opacity for spatial continuity; 130ms press feedback. Reject animated figures, chart drawing and tab-content delays | Rapid open/close, reduced-motion, reading stability |
| review-animations + improve-animations + animation-vocabulary | Exact cubic-bezier(.23,1,.32,1), no `transition: all`, no layout/number animation, no scale(0) | Code audit plus actual browser interactions |
| animation-performance | CSS transitions, no per-frame React state and no broad will-change | Source audit; do not claim physical-phone frame-rate proof |
| break-ui | Development worst/empty fixtures, long address/operator/non-Latin text, missing rent/competition and large number | Rendered narrow widths, overflow and reachable controls |
| [PDF-LIB](https://pdf-lib.js.org/) / [DejaVu licence](https://dejavu-fonts.github.io/License.html) | Local immutable standalone exports; redistributable font with licence | Render/extract PDF; no remote resources or document mutation |

Skill instructions requiring another minor prototype-selection stop are superseded by the owner's explicit instruction to decide and implement independently. None grants spending, evidence, security or phase authority.

## Applied redesign follow-up — 11 October

[Linear's 12 March 2026 UI refresh](https://linear.app/changelog/2026-03-12-ui-refresh) and [design rationale](https://linear.app/now/behind-the-latest-design-refresh) informed receding navigation, compact persistent context and a focused working surface. Current [Notion dashboard patterns](https://www.notion.com/en-gb/help/dashboards) informed direct data exploration; SiteFit keeps the operands immutable. These replace the earlier text-card canvas in the actual implementation.

Emil **emil-design-eng**, **prototype** and **mobile-native** skills were actively read and applied to two distinct Overview prototypes, then a shared eight-view implementation: result/action hierarchy, bounded type and spacing, press/focus feedback, static charts, accessible inspection panels, 44px map controls, 16px inputs, safe-area/dynamic viewport and reduced-motion support. Owner delegated selection; Decision Workspace selected over Spatial Brief, and the temporary prototype surface removed. No additional conceptual approval requested.

The public [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) was reviewed before replacing the schematic background with normal browser-loaded street context. Scope, attribution, privacy, caching, fallback and pre-launch service limitations are recorded in phase-13-status.md. No new analytical provider or paid service was added.
