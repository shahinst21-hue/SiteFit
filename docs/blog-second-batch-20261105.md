# Blog articles 6–10 — 5 November 2026

The owner explicitly requests publication without another confirmation, using the latest Production version, the original five remaining topics, existing article presentation, numbered supplied photographs and approximately 1,400–1,500 words per article. The instruction authorises this editorial release; it does not authorise unrelated report, payment, schema or configuration changes.

## Baseline and content

Authenticated Vercel read-back and GitHub main both identify `a5f0ac62cf0a8ed287cebfecf7cdb4eb905aa46c` (PR167) as the current baseline. The owner's approximate reference to PR170 is not treated as an existing version. Work uses an isolated branch from that actual baseline. Recheck main and Production before release.

The original proposal was recovered from this chat's saved history. Articles 6–10 retain those subjects. The five existing published articles are unchanged. Only serialisable post data, local image assets and editorial documentation are added; the existing repository, renderer, scroll CTA and publication filter remain the read path.

| No. | Article title | Stable slug | Supplied photograph |
| --- | --- | --- | --- |
| 6 | How to Choose a Salon Location in London | `how-to-choose-a-salon-location-in-london` | `6.webp` |
| 7 | Taking Over a Café or Restaurant: Premises Checklist | `taking-over-cafe-restaurant-premises-checklist` | `7.webp` |
| 8 | Class E Planning Use: Can You Open a Café or Restaurant? | `class-e-planning-use-cafe-restaurant` | `8.webp` |
| 9 | Commercial Property Catchment Area: How to Research a Location | `commercial-property-catchment-area-research` | `9.webp` |
| 10 | Business Rates and Service Charges: What to Check in 2026 | `business-rates-and-service-charges-commercial-property-2026` | `10.webp` |

Each article begins with an introduction, develops the practical problem and ends with a conclusion and the existing `/check-location` CTA. British English follows `copy-guidelines.md`. SiteFit is the organisation author; no invented expert, customer story, visit, quote or measured demand is presented. The photographs are owner-supplied illustrations of the editorial setting, not evidence about the suitability or performance of those businesses. In particular, image 6 depicts coffee and a pastry, not a salon: its alt text says so.

Word counts from the actual structured content, including the H1 and in-article CTA but excluding page navigation, excerpt, footer and related cards: 6 = 1,450; 7 = 1,449; 8 = 1,467; 9 = 1,460; 10 = 1,458. Mean: 1,457 words.

Images retain their supplied composition and branding, resampled without enlargement to 1200×1200 WebP at quality 78 with metadata removed. Output sizes: 78,462; 96,070; 128,920; 77,688; and 137,716 bytes respectively. The existing Next Image component supplies responsive delivery and reserves intrinsic dimensions.

## Search research and limits

The requested [ScrapeCreators repository](https://github.com/ScrapeCreators/social-media-research-skills) and its `trend-discovery` and `social-listening-brief` skills were read. Applied principles: define the London independent-premises audience, preserve public source URLs and dates, cluster real questions and distinguish evidence from trend claims. No ScrapeCreators key is configured; no platform metrics, exhaustive social monitoring or API extraction is claimed. The Semrush connector returned `no_api_units`; no volume, difficulty, competition or traffic estimate is reported and no purchase is made.

Public search on 5 November found [Protectivity's salon-location guide](https://www.protectivity.com/knowledge-centre/choosing-the-right-location-for-your-salon/) (displayed as published three months earlier), [YourSalon’s premises guide](https://www.yoursalon.eu/en/academy/how-to-choose-a-salon-location) (four months earlier), [a UK business-location discussion](https://www.reddit.com/r/smallbusinessuk/comments/1i6hg1y) (historical, not evidence of current growth), Planning Portal's shop-to-café question, and current official 2026 rates guidance. These establish relevant questions and language; they do not measure rising search interest. No article is labelled a popular trend or a high-volume keyword on this basis. The original business problem supplies the relevance; keyword phrases make the titles descriptive.

The substantive current angle is the April 2026 business rates revaluation. Other articles use evergreen questions instead of adding an unsupported year or popularity claim. Each title addresses a distinct intent to avoid duplicating the existing coffee-shop, competition, comparison, restaurant-location and footfall articles.

## Google, Microsoft and OpenAI requirements reviewed before writing

- [Google helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): answer a real reader need, add useful original analysis, use accurate descriptive titles, clear authorship and reliable sources. Google has no preferred word count; the requested length is an editorial requirement. Each post uses the existing server-rendered H1/H2 hierarchy, title/description, canonical and truthful BlogPosting metadata. No fabricated expertise, ratings or unsupported ranking guarantee.
- [Bing's sitemap guidance](https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/): make content crawlable and expose a complete sitemap with accurate modification times. The existing sitemap reads published posts automatically. IndexNow is optional; no new key, service or account setting is needed for these five articles.
- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots): OAI-SearchBot controls eligibility for ChatGPT search crawling, separately from GPTBot training controls. The observed Production `User-Agent: *` rule allows public pages including `/blog`; the five posts inherit that permission. Search inclusion, ranking and citations are not guaranteed by crawler access. Firewall/IP behaviour is not proved merely by reading robots.txt.

Observed baseline Production robots.txt and sitemap both returned HTTP200. Private account/report/purchase/API routes remain excluded. Preview remains protected/noindex; no robots, WAF, indexing or training policy setting changes are introduced.

## Article evidence

Sources were checked on 5 November 2026. Specific-property conclusions remain for the relevant council and qualified advisers.

- Salon: [GOV.UK hairdresser registration](https://www.gov.uk/find-licences/register-a-hairdressing-business), [Westminster special-treatment premises licensing](https://www.westminster.gov.uk/licensing/other-licence-and-business-permit-types/licensing/other-licence-and-business-permit-types/special-treatment-premises-licences). Requirements vary by treatment and borough; no universal permission is claimed.
- Takeover: [FSA registration](https://register.food.gov.uk/new), [Home Office premises licence forms](https://www.gov.uk/government/publications/premises-licence-application-forms). Operator registration, licensing, planning and equipment condition are separate checks. No claim that a former occupier's approval or trading performance transfers automatically.
- Planning: [Planning Portal shop-to-café guide](https://www.planningportal.co.uk/permission/common-projects/shops/i-want-to-convert-a-shop-to-a-cafe-public-house-or-takeaway/), [government use-class comparison](https://www.gov.uk/government/publications/healthy-weight-environments-using-the-planning-system/addendum-hot-food-takeaways-use-in-the-new-use-class-order), [when permission is required](https://www.gov.uk/guidance/when-is-permission-required). England scope is explicit; lawful existing use, conditions, works, lease and licensing are not collapsed into Class E.
- Catchment: [ONS local indicators](https://www.ons.gov.uk/explore-local-statistics/indicators), [TfL journey planner](https://tfl.gov.uk/plan-a-journey/), [FSA hygiene records](https://ratings.food.gov.uk/). Population is not observed demand; routes are not visits; hygiene ratings are not commercial performance.
- Costs: [official valuation lookup](https://www.gov.uk/find-business-rates), [2026 revaluation guidance](https://www.gov.uk/guidance/help-with-the-2026-business-rates-revaluation), [rates relief](https://www.gov.uk/business-rates-relief), [RICS service-charge standard](https://www.rics.org/content/dam/ricsglobal/documents/standards/Service-charges-in-CP_2nd-ed_amended-Oct-2025.pdf). Rateable value is not the bill; current occupier relief is not assumed; the lease determines recoverability. No invented property costs or customer financial calculation.

## Delivery state

Implemented and verified locally on Node 24.12.0/npm 11.6.2. `npm ci --no-audit --no-fund` completed; `npm run check` passed lint, strict types, all 559 tests and the production build. `npm run check:public -- http://127.0.0.1:3013 noindex` passed against the running build: 21 public pages/articles and internal paths, 18 same-origin scripts, security headers, metadata, JSON-LD, sitemap, robots, social image, privacy and route boundaries. An independent content audit confirms ten published posts at the current date, valid new CTA targets and the word counts above. All fourteen distinct external article-reference URLs returned HTTP200.

The five existing post records are preserved exactly. Application journeys, site configuration, dependencies, renderer, scroll CTA and migrations have no diff. A configured-private-value scan of the changed text found zero matches. No local environment file or credentials enter the branch.

Visual/responsive/keyboard browser inspection was attempted but did not complete: Computer Use stopped because it could not determine the current Windows browser URL with sufficient confidence. No further UI input was attempted; this inspection is not claimed as passed. The existing article template is reused without frontend changes.

Protected PR/CI, merge and Production receipts are separate actual gates and are recorded in the delivery PR. A source publication flag does not by itself prove a live release or search indexing. The owner's explicit request permits this editorial Production deployment after protected delivery; it does not enable automatic main deployments or any paid/report execution.
