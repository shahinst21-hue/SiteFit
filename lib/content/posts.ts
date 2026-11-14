import type { BlogPost, ContentBlock, ContentCTA, Inline } from "./model.ts";

const text = (text: string): Inline => ({ type: "text", text });
const cta: ContentCTA = {
  label: "Check a Location",
  href: "/check-location",
  heading: "Start with the space you have in mind.",
  supportingText:
    "Start with a commercial address and business type. Use your Snapshot to focus the questions that matter.",
  variant: "primary",
};
const shared = {
  author: { name: "SiteFit", type: "Organization" as const },
  datePublished: "2026-10-03T09:00:00Z",
  dateModified: "2026-10-03T09:00:00Z",
  status: "published" as const,
  featuredImageAlt:
    "Illustration of a shopfront with a door, display windows and an awning; no real property is depicted.",
  canonicalUrl: null,
  ogImage: null,
  cta,
};

const editorialCta: ContentCTA = {
  label: "Check a Location",
  href: "https://sitefit.co.uk/check-location",
  heading: "Put a London location into context.",
  supportingText:
    "Choose a commercial address and business type to start a Free Snapshot. No account or card is needed.",
  variant: "primary",
};

const paragraphs = (...items: string[]): ContentBlock[] =>
  items.map((value) => {
    const content: Inline[] = [];
    const pattern = /\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g;
    let cursor = 0;
    for (const match of value.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (index > cursor) content.push(text(value.slice(cursor, index)));
      content.push({ type: "link", text: match[1]!, href: match[2]! });
      cursor = index + match[0].length;
    }
    if (cursor < value.length) content.push(text(value.slice(cursor)));
    return { type: "paragraph", content };
  });

type EditorialSection = { heading: string; paragraphs: string[]; bullets?: string[] };
function editorialContent(intro: string, sections: EditorialSection[]): ContentBlock[] {
  return [
    ...paragraphs(intro),
    ...sections.flatMap((section) => [
      { type: "heading" as const, level: 2 as const, text: section.heading },
      ...paragraphs(...section.paragraphs),
      ...(section.bullets
        ? [{ type: "list" as const, ordered: false, items: section.bullets.map((item) => [text(item)]) }]
        : []),
    ]),
    { type: "cta", cta: editorialCta },
  ];
}

export const localPosts: BlogPost[] = [
  {
    ...shared,
    id: "choose-coffee-shop-location-london",
    slug: "how-to-choose-a-coffee-shop-location-in-london",
    featured: true,
    title: "How to Choose a Coffee Shop Location in London",
    excerpt:
      "A practical way to compare London locations for a coffee shop, from the people nearby to the questions a viewing cannot answer.",
    seoTitle: "How to Choose a Coffee Shop Location in London",
    seoDescription:
      "Planning a London coffee shop? Learn how to assess a location, nearby customers, competition, access and the unknowns to check before signing.",
    ogTitle: "Choosing a Coffee Shop Location in London",
    ogDescription: "A clear location checklist for your London coffee shop idea.",
    category: "Choosing a location",
    tags: ["coffee-shop", "location", "London"],
    featuredImage: { src: "/images/london-coffee-shop-location.webp", width: 800, height: 800 },
    featuredImageAlt: "A London coffee shop with outdoor tables on the pavement and customers inside.",
    datePublished: "2026-10-19T06:00:00Z",
    dateModified: "2026-10-19T06:00:00Z",
    cta: editorialCta,
    content: editorialContent(
      "You have found a unit that looks promising. It is near a station, the frontage is smart and the rent seems within reach. It is tempting to picture the queue already. Before you commit, though, ask a more useful question: does this particular spot fit the coffee shop you want to run? A good London location is not simply the busiest street or the trendiest postcode. It is a place where the people you hope to serve can reach you, where your offer makes sense, and where the practical details do not quietly undermine the idea. This guide gives you a calm way to look at those factors. It cannot predict sales or replace advice on a lease, but it can help you decide what to investigate next.",
      [
        {
          heading: "Start with the coffee shop you want to open",
          paragraphs: [
            "“Coffee shop” covers very different businesses. A quick takeaway counter for commuters needs a different setting from a neighbourhood café where people sit with laptops, or a bakery café built around weekend visits. Write a short description of your offer before judging an address. Include the main reason someone would choose you, the times you expect to trade, whether customers will sit in, and how much of the day depends on passing trade. Keep it simple; the point is to make your assumptions visible.",
            "Then picture a normal Tuesday, not just opening day. Who is likely to be nearby at breakfast, lunchtime and mid-afternoon? How would they notice the shop, get to the door, order and leave? A unit next to a station may suit a fast morning offer, while a quieter residential parade may suit repeat local visits. Neither is automatically better. The fit depends on your concept, the people around it and the way the property works. If you cannot explain why your likely customer would choose this spot, that is a question to resolve before you fall in love with the frontage.",
          ],
        },
        {
          heading: "Look at the area in more than one time window",
          paragraphs: [
            "A single walk past can give you a vivid impression and a very incomplete picture. Visit on different days and at different times that match your trading plan. Notice whether the street feels different on a weekday morning, at lunch, after work and at the weekend. Pay attention to how people move through the area and what seems to bring them there: homes, offices, schools, transport, shops or leisure. Those are observations to record, not proof that people will buy from a particular café.",
            "Keep the notes specific. Record the date, time, weather and what you actually saw. If the pavement was busy, say that it was busy during your visit, rather than turning it into a claim about daily footfall. Check whether nearby destinations are open at the times you plan to trade. A cluster of offices can mean a different rhythm from a high street with evening and weekend activity. Area statistics can add context about residents or jobs, but they do not tell you how many people will cross your threshold or what they will spend.",
          ],
          bullets: [
            "Visit at the times your offer is designed for.",
            "Note transport entrances, crossings, pavements and the route to the door.",
            "Separate what you saw from what an agent, listing or dataset says.",
          ],
        },
        {
          heading: "Study nearby cafés without assuming they are all rivals",
          paragraphs: [
            "A few coffee shops nearby do not settle the question. Some may serve a different customer, trade at different hours or specialise in an offer you do not plan to copy. Others may be direct alternatives. Visit them as a customer and note what they sell, how people use the space, when they seem busiest and what kind of experience they provide. Look for gaps as well as similarities: perhaps there is strong morning takeaway but little comfortable seating, or several lunch options and few places open later.",
            "Treat a directory or business-register result as a lead to check, rather than a confirmed competitor. Businesses close, move, change names and alter their offer. Confirm important observations in person or from a recent, reliable source. Avoid framing a high count as proof that an area is saturated, or a low count as guaranteed opportunity. The useful question is whether your proposed offer has a clear reason to be chosen and whether the local context gives you enough evidence to keep exploring. A competitor can also show that customers already use the area for coffee; it does not prove that another shop will work.",
          ],
        },
        {
          heading: "Check whether the premises suit the day-to-day operation",
          paragraphs: [
            "A location can look right from the pavement and still be awkward to operate. Think through the customer journey and the work behind the counter. Is there room for the queue you expect, seating if you need it, storage, deliveries, staff movement and waste? What condition is the unit in, and which alterations would your format require? For a food business, the practical fit of preparation space, ventilation, utilities and access deserves proper investigation by the relevant professionals. A photo or listing rarely answers those questions.",
            "Ask the landlord or agent for documents and clear answers, then have the right adviser review them. Confirm the permitted use and any conditions against your intended operation; do not rely on an old advert or a casual assurance. Government guidance describes Class E uses in England, including many shops, cafés and restaurants, but premises can have restrictions and planning details depend on the property and proposal. See the [official planning guidance](https://www.gov.uk/guidance/when-is-permission-required) and confirm your own case with the local planning authority or a qualified adviser. A food business must also meet registration requirements; the [Food Standards Agency guidance](https://www.gov.uk/guidance/starting-a-food-business) explains the starting point.",
          ],
        },
        {
          heading: "Make a short comparison, not a gut-feel ranking",
          paragraphs: [
            "If you are looking at more than one unit, use the same questions for each. A simple comparison sheet stops a striking frontage or a persuasive pitch from taking over the decision. Give each point a note and a source: observed on a visit, stated by the agent, shown in a document, estimated by you, or still unknown. You do not need to invent a numerical score. A side-by-side record can be more honest and more useful than a single overall number when the evidence is uneven.",
            "Include the parts that matter to your offer: likely customer context, competing options, visibility, access, operating hours, layout, required works and unanswered lease or planning questions. If the address is strong on one point but uncertain on another, keep both in view. Decide what new information would change your preference. For example, a second visit at the intended trading time, written confirmation of a restriction, or a measured layout may move the decision. This turns “I like it” into a testable next step without pretending the comparison predicts a successful business.",
          ],
        },
        {
          heading: "Keep lease and money questions with the right adviser",
          paragraphs: [
            "The location decision sits beside a separate review of the lease and the cost of occupying the unit. Ask which charges sit alongside rent, how the service charge is described, who is responsible for repairs, what the break and review terms say, and what happens if your plans change. Request the documents early enough for an independent solicitor or surveyor to review them. Do not rely on a guide, blog or agent conversation as legal, tax or financial advice for your own agreement.",
            "For business rates, find the property's current valuation and check the relevant official information rather than assuming a previous occupier's bill will apply to you. The [GOV.UK business rates service](https://www.gov.uk/find-business-rates) lets you look up a property's rateable value and compare similar properties. Your actual liability can depend on rules and circumstances that are separate from location suitability. Keep these costs in your decision file, but do not let an attractive headline rent distract you from the full set of obligations and the advice needed before signing.",
          ],
        },
        {
          heading: "A sensible next step before you commit",
          paragraphs: [
            "Before making a commitment, write down your strongest reason for choosing the address, the main reason it might not fit, and the one unanswered question most likely to change your mind. Then decide how you will answer that question and who is qualified to help. Revisit the area at a relevant time, check the source behind important claims, confirm the premises details and get professional advice on the agreement. If the evidence is mixed, that is not a failure; it is a sign to slow down and investigate the point that matters.",
            "SiteFit can help you put a London commercial address into context for a coffee shop, restaurant or salon. A Free Snapshot is an initial assessment of the selected location and business type; it is not a forecast of sales, a measured count of shopfront visitors or a substitute for a property survey or legal review. Keep your own viewing notes and confirm property-specific details directly. The best next move is the one that replaces an important assumption with evidence you can actually rely on.",
          ],
        },
      ],
    ),
  },
  {
    ...shared,
    id: "assess-cafe-competition",
    slug: "how-to-assess-competition-before-opening-a-cafe",
    featured: false,
    title: "How to Assess Competition Before Opening a Café",
    excerpt:
      "Nearby cafés can be rivals, useful clues or simply different businesses. Here is how to research the difference before you take a lease.",
    seoTitle: "How to Assess Café Competition in London",
    seoDescription:
      "Learn how to research café competition around a London property, check nearby businesses and identify what you still need to verify.",
    ogTitle: "Assessing Café Competition Before You Open",
    ogDescription: "A practical London guide to researching nearby cafés.",
    category: "Market research",
    tags: ["coffee-shop", "competition", "London"],
    featuredImage: { src: "/images/cafe-competition-london.webp", width: 800, height: 800 },
    featuredImageAlt: "People gathering outside a small coffee shop on a London street.",
    datePublished: "2026-10-19T06:00:00Z",
    dateModified: "2026-10-19T06:00:00Z",
    cta: editorialCta,
    content: editorialContent(
      "You have spotted a café unit in London and searched the surrounding streets. There are already several coffee shops nearby. Is that a warning sign, or evidence that people come to the area for coffee? The honest answer is: the count alone cannot tell you. Competition research is useful when it helps you understand what customers can already choose, how those businesses differ from your idea and what remains uncertain. It is much less useful when a map full of pins becomes a confident claim that the area is saturated or wide open. This guide shows how to examine nearby cafés in a grounded way before you commit to a property.",
      [
        {
          heading: "Define what you mean by a competitor",
          paragraphs: [
            "Start with the customer and the occasion. A coffee shop serving takeaway espresso to commuters may compete with a station kiosk, a bakery or a convenience shop as well as another café. A place designed for long, relaxed visits may have a different set of alternatives. Write down your intended offer, typical visit, likely price positioning and opening hours. Then ask which nearby businesses could realistically serve the same person for the same reason.",
            "This is a working definition, not a fixed radius on a map. People choose routes, destinations and habits in ways that a simple circle cannot capture. A business two streets away might be highly relevant if it sits on the same route, while a closer one may serve a different use or customer. Begin with a sensible walkable area, then adjust it after visiting the site and understanding how the streets connect. Explain why each place is included. That makes the research easier to review and prevents “nearby” from turning into “direct competitor” without evidence.",
          ],
        },
        {
          heading: "Build a current list and verify it",
          paragraphs: [
            "Online maps and directories are useful for finding leads, but they can contain duplicates, old names, closed venues or incomplete categories. Use them to make a first list, then verify the places that could matter. Check the business's own current information, visit where practical and note the date of your check. If a listing says “café” but the current offer is mainly a bakery, pub or restaurant, describe what you observed instead of keeping a broad label that hides the difference.",
            "A register entry is not the same as a confirmed open shop, and an open shop is not automatically a direct rival. Keep the evidence type beside each note: observed in person, stated by the business, listed in a directory or not yet confirmed. Do not treat missing online information as proof that a business has closed. If the status cannot be established, leave it uncertain and decide whether it is important enough to investigate further. The goal is a reliable picture of what you know, not the longest list of pins.",
          ],
          bullets: [
            "Name and address checked against a current source.",
            "Offer, service style and opening times recorded with a date.",
            "Unconfirmed entries clearly marked for follow-up.",
          ],
        },
        {
          heading: "Compare offers, not just business names",
          paragraphs: [
            "Visit relevant cafés as a customer and observe the parts of the offer that distinguish them. What is on the menu? Is the main use takeaway, sitting in, a quick meeting or a longer stay? What can you see about seating, service, accessibility and opening hours? What seems to bring people there at the time of your visit? Keep your notes descriptive. “Several customers sat outside on a Saturday morning” is clearer than “the shop has strong demand” when you have only one observation.",
            "Look for patterns and gaps, but do not decide too quickly what they mean. Several independent cafés might indicate a local coffee culture, a busy destination, a tough field of alternatives, or all three. A chain may have strong visibility and a different offer from a small neighbourhood café. A quiet visit may reflect the day, time, weather or season. Record enough context to interpret what you saw later. If you intend to trade early, lunchtime and weekends, make observations that cover those periods rather than relying on one convenient visit.",
          ],
        },
        {
          heading: "Ask whether your idea has a clear reason to be chosen",
          paragraphs: [
            "Competition research becomes useful when it is connected to your own concept. What would a customer get from your café that is meaningfully different for them? It might be a menu focus, a service rhythm, seating arrangement, an accessible stop on a regular route or a neighbourhood role. “Better coffee” is a starting thought, not evidence that the idea fits the area. Be specific about the customer and occasion, and be honest about what you have not tested.",
            "You do not need a completely empty street to have a reason to continue. Nor does a gap on a map prove that customers want the missing offer. Treat each possible opportunity as a question: who might use it, when, and what evidence supports that? Speak with potential customers if appropriate, observe relevant routes and compare credible local information. Keep opinions, estimates and observations separate. This approach helps you avoid two common traps: dismissing a location just because it has competitors, and assuming there is unmet demand simply because you cannot see an obvious rival.",
          ],
        },
        {
          heading: "Use local context carefully",
          paragraphs: [
            "The businesses around a property sit within a wider neighbourhood. Homes, workplaces, education, transport and other destinations can help explain who may be in the area and at what times. Use sources that match the question. Resident or workplace statistics describe the wider context; they do not measure café visits or purchases. A transit stop can indicate a connection, not a count of customers walking past your door. A short visual check can tell you what happened during that visit, not what happens every day.",
            "For each source, record its geography, date, definition and limitations. Avoid combining different areas as if they were interchangeable. If a figure applies to a neighbourhood or census zone, say so. Do not turn population into guaranteed customers, transport access into measured footfall, or competitor counts into a sales forecast. An honest research note is more useful than an impressive-sounding number that answers a different question from the one you are trying to solve.",
          ],
        },
        {
          heading: "Compare the property and the customer experience",
          paragraphs: [
            "A competitor may have a similar menu but a different customer experience because its frontage, layout, access or operating conditions differ. At your proposed unit, look at visibility from the approaches people actually use. Check where a queue could form, whether customers can enter comfortably, and how deliveries and staff movement would work. Note possible constraints and ask the landlord or agent for documents rather than guessing from a photograph.",
            "Also consider how the premises support the offer you plan to make. Seating, preparation, storage, utilities, ventilation, works and permissions may need specialist checks. Confirm the permitted use and any property-specific restrictions with the local authority or an adviser. In England, planning use classes changed in 2020, and broad class descriptions do not resolve every condition or building issue. A competitor's ability to trade nearby does not prove that your proposed unit has the same permissions or practical setup. Check the unit itself.",
          ],
        },
        {
          heading: "Turn the research into a decision and next action",
          paragraphs: [
            "Summarise what you learned in three short lists: what supports your idea, what challenges it, and what you still need to verify. Include the source and date for important observations. Then ask which unknown could change your decision. If the key issue is whether the street has activity at breakfast, return at that time. If the concern is a possible direct competitor, verify its current offer. If the property may not support your operation, ask for documents and qualified advice.",
            "A competitor count is a useful prompt for research, not a verdict on a location. The strongest next step is a focused check that connects your business idea to current, relevant evidence and the actual premises. SiteFit can help put a London commercial address into context for a coffee shop, restaurant or salon. Its Free Snapshot is an initial location assessment, not a forecast of sales or a guarantee that an idea will work. Keep the limits visible, check material unknowns and make the lease decision with the information appropriate to your circumstances.",
            "Keep a dated copy of your notes as the area changes. If you return a few weeks later, do not quietly combine the new visit with the old one as if conditions were identical. Note what changed and whether it affects the question you were investigating. This small habit makes your research easier to explain and helps you revisit the decision without relying on memory alone.",
          ],
        },
      ],
    ),
  },
  {
    ...shared,
    id: "compare-commercial-properties",
    slug: "how-to-compare-two-commercial-properties-for-your-business",
    featured: false,
    title: "How to Compare Two Commercial Properties for Your Business",
    excerpt:
      "When two London units both look promising, use the same questions and evidence for each before choosing where to take your idea.",
    seoTitle: "How to Compare Commercial Properties for a Business",
    seoDescription:
      "Comparing two commercial properties in London? Use a clear framework for location, customers, competition, premises fit and unanswered questions.",
    ogTitle: "Compare Two Commercial Properties with a Clear Framework",
    ogDescription: "A practical way to compare London premises before you commit.",
    category: "Before the lease",
    tags: ["commercial-property", "due-diligence", "London"],
    featuredImage: { src: "/images/comparing-commercial-properties.webp", width: 800, height: 800 },
    featuredImageAlt: "A café and restaurant frontage on a London street, illustrating a commercial property choice.",
    datePublished: "2026-10-19T06:00:00Z",
    dateModified: "2026-10-19T06:00:00Z",
    cta: editorialCta,
    content: editorialContent(
      "You have viewed two commercial units and can picture your business in either one. One has a better frontage; the other feels closer to the people you want to serve. The agent is asking for a decision, and your notes are a mix of photos, figures and impressions. This is exactly when a simple comparison helps. It will not tell you which property will make money. It can show what you know about each address, where one may fit your concept better, and what needs checking before you take on a lease. Use the same questions for both units so that a confident sales pitch or a memorable viewing does not quietly set the rules.",
      [
        {
          heading: "Set the decision you are trying to make",
          paragraphs: [
            "Before comparing addresses, write down the business you intend to run. Is it a coffee shop, restaurant, hair salon or beauty salon? What service will you offer, who do you hope to serve, and when do you expect customers to visit? SiteFit currently supports these business types in London. A comparison that does not state the business concept can drift into a general property ranking, even though suitability depends on what you plan to do there.",
            "Keep the decision narrow: which unit is more worth pursuing, given the information available today? You may still need a survey, legal review, planning confirmation or more research before signing. “Worth pursuing” is a useful stage in the process; it is not the same as “ready to commit”. Write down what would make you stop considering a unit. This gives each new piece of evidence a clear role and helps prevent the preferred option from receiving a more generous standard than the other one.",
          ],
        },
        {
          heading: "Use one comparison sheet for both units",
          paragraphs: [
            "Create a row for each decision factor and a column for each property. Record the observation, source, date and remaining question. Use plain labels such as observed, stated by agent, documentary evidence, estimate and unknown. You do not need a numerical score. If you choose to rank anything, explain the rule and apply it consistently. An unsupported score can make a weak comparison look precise without adding evidence.",
            "A useful sheet is short enough to revisit. Include the customer context, nearby alternatives, route and visibility, premises layout, required works, intended use, operating conditions and lease questions. Some points may be relevant to one concept and not another, so write down why they matter. Keep a separate section for information that is common to both units and information that is specific to one. If a source is out of date or describes a wider area, say that beside the note rather than allowing the caveat to disappear.",
          ],
          bullets: [
            "What is known about each property, and how do you know it?",
            "Which finding is an estimate or interpretation?",
            "What unanswered point could change your preference?",
          ],
        },
        {
          heading: "Compare the customer context around each address",
          paragraphs: [
            "Look at the area each unit sits in and the routes customers might use. Consider homes, workplaces, nearby destinations, public transport, street connections and the times your business expects to trade. Visit both areas at comparable times. If one visit was on a sunny Saturday and the other on a wet Tuesday afternoon, note that difference; do not treat the impressions as a fair head-to-head test. A second visit may be more valuable than adding another broad statistic.",
            "Use local data for the question it actually answers. Information about residents or jobs can describe customer context at an area level. It cannot confirm the number of people who will pass a shopfront, enter a premises or buy from you. A station nearby indicates a transport connection, not automatically a useful customer route. Be clear about boundaries and dates. If one unit seems better connected, explain the route or evidence that supports that view and identify anything that still needs a direct check.",
          ],
        },
        {
          heading: "Compare the nearby alternatives for your customer",
          paragraphs: [
            "For each address, identify businesses that could serve the same customer for a similar occasion. A coffee shop may compete with cafés, bakeries or takeaway counters; a restaurant may sit among different cuisines and service styles. Hair and beauty businesses have their own local alternatives. Do not draw a fixed circle and assume everything inside is a direct competitor. Explain why a business is relevant, and verify that it is still trading and offering what your notes say.",
            "Observe the offer, hours and customer experience where practical. Look for what might distinguish your concept and where your idea may face a stronger set of alternatives. More nearby businesses can mean more choice for customers and a more established destination; it can also mean more competition. A quieter map may reflect a gap, a different kind of area or incomplete records. Counts alone cannot decide between those explanations. Record the evidence, then ask what additional observation would help.",
          ],
        },
        {
          heading: "Check how each unit works as a premises",
          paragraphs: [
            "Walk through the operation in both spaces. Where do customers enter and wait? Where are staff, stock, equipment, deliveries and waste handled? Can the layout support the service you described? Note visible condition and access, but distinguish what you can see from what requires a survey or document. A unit that looks larger may still have an awkward layout; a smaller unit may be workable for a different format. Your concept and professional advice matter more than a generic preference for size.",
            "List the alterations or approvals your plan might need. Ask for the documents that establish the property's use and any restrictions, and have the appropriate adviser review them. Planning rules and the property's actual history can be more specific than an online listing. For food businesses, the [Food Standards Agency's starting guidance](https://www.gov.uk/guidance/starting-a-food-business) covers registration and premises responsibilities. For any commercial use, confirm the case with the relevant local authority and qualified professionals rather than borrowing assumptions from a neighbouring business.",
          ],
        },
        {
          heading: "Keep location fit separate from lease and cost checks",
          paragraphs: [
            "A location comparison should sit alongside a separate review of the proposed lease and occupation costs. For each unit, ask for the rent schedule, service-charge information, repair obligations, break terms, rent reviews, deposit or guarantee requirements and any incentives in writing. Check whether the assumptions you used are supported by the documents. A lower headline rent does not automatically mean a lower total commitment, and a high rent does not tell you whether the location fits your customer concept.",
            "For business rates, look up the relevant valuation and current official guidance. The [GOV.UK service](https://www.gov.uk/find-business-rates) provides rateable-value information and lets users compare similar properties. Your liability depends on rules and circumstances that should be checked for your own case. Ask a solicitor, surveyor or accountant the questions within their expertise. Keep their advice alongside the property research, but do not blend unverified cost assumptions into a supposed location score.",
          ],
        },
        {
          heading: "Make uncertainty part of the comparison",
          paragraphs: [
            "When the evidence is uneven, the right comparison may be conditional. Unit A may look stronger on customer context but have an unresolved permission question. Unit B may have a practical layout but less direct evidence about the times you plan to trade. State both points. Do not convert missing information into a neutral or favourable result. An unknown may be the most important entry on the sheet if it could change your decision.",
            "For each property, choose one next action that would reduce a material uncertainty: request a document, revisit at a relevant time, verify a business, measure a layout or get professional advice. Set a sensible deadline for the information, not for a rushed signature. If the answer does not arrive, decide whether you can accept the uncertainty or whether it means you should pause. This makes your reasoning understandable to a partner, adviser or future version of yourself.",
          ],
        },
        {
          heading: "Reach a clear and proportionate conclusion",
          paragraphs: [
            "Finish with a short conclusion: which unit is currently more worth pursuing, what supports that view, what argues against it, and which condition could change your mind. The conclusion should match the strength of the evidence. If neither unit is ready to progress, say so and identify the information needed. You are allowed to choose neither. The fact that you have spent time viewing a property is not evidence that it is the right one.",
            "SiteFit can give an initial London location assessment for a selected address and business type. It helps organise relevant context; it cannot tell you which property will succeed, replace a survey or legal review, or confirm every unit-specific fact. Use it as one input alongside your visits, documents and qualified advice. A comparison is useful when it clarifies what to do next and keeps the remaining questions visible. It is not useful when a single polished score hides the parts you still need to check.",
          ],
        },
      ],
    ),
  },
  {
    ...shared,
    id: "choose-restaurant-location-london",
    slug: "how-to-choose-a-restaurant-location-in-london",
    featured: false,
    title: "How to Choose a Restaurant Location in London",
    excerpt:
      "A restaurant site needs to fit its customers, trading hours and operating plan. Here is what to investigate around a London property.",
    seoTitle: "How to Choose a Restaurant Location in London",
    seoDescription:
      "Choosing a London restaurant site? Assess customer context, nearby restaurants, access, trading patterns and the practical checks before a lease.",
    ogTitle: "Choosing a Restaurant Location in London",
    ogDescription: "A practical guide to assessing a London restaurant site.",
    category: "Choosing a location",
    tags: ["restaurant", "location", "London"],
    featuredImage: { src: "/images/london-restaurant-location.webp", width: 800, height: 800 },
    featuredImageAlt: "A restaurant with pavement tables on a London street.",
    datePublished: "2026-10-19T06:00:00Z",
    dateModified: "2026-10-19T06:00:00Z",
    cta: editorialCta,
    content: editorialContent(
      "A restaurant can make sense on one street and feel out of place a few minutes away. The right location depends on the concept, its customers, trading hours and whether the premises can support the operation. In London, a busy address may be costly and full of alternatives; a quieter one may rely on a different reason for customers to visit. A postcode or quick glance at the pavement cannot answer the whole question. Before taking a lease, connect your concept to the area, check what is known about the unit and note what needs specialist confirmation. This guide is a starting point, not a sales forecast or legal advice.",
      [
        {
          heading: "Be clear about the restaurant concept",
          paragraphs: [
            "Begin with a plain description of the restaurant you want to open. What kind of food and service will it offer? Is it built around lunch, dinner, takeaway, bookings, walk-ins or a mix? Will customers stay for a full meal or make a quick stop? What hours do you expect to trade? These choices shape the location question. A weekday lunch-led offer may look for a different customer rhythm from a neighbourhood restaurant that depends on evenings and weekends.",
            "Write down what you know and what is still an assumption. If the idea is not settled, choose the most realistic version you are considering and say so. A location assessment cannot make a broad concept specific on your behalf. Once your offer is clearer, you can ask whether the area contains people and destinations relevant to that offer, whether customers can reach the door, and whether the property can work for your service. This keeps your search grounded in the actual business rather than generic claims about a “good restaurant area”.",
          ],
        },
        {
          heading: "Research the area at the times you plan to trade",
          paragraphs: [
            "Visit the street on a weekday and at the hours that matter to your restaurant. If lunch is central, observe the area around lunch. If evenings matter, return after work and later in the evening where safe and practical. Check weekends too if they form part of the plan. Record date, time, weather and what you actually saw. One visit cannot establish a regular pattern, but comparable visits can help you understand how the location changes through the day.",
            "Look for the destinations and routines that may explain activity: homes, offices, theatres, schools, retail, transport or leisure. Notice routes, crossings, visibility and whether the entrance is easy to find. These observations do not measure customer demand at the unit. Area-level information about residents or jobs can add context but does not show who will book, walk in or spend. Use each source for its real scope. If a claim comes from a listing or agent, mark it as such until you have supporting evidence.",
          ],
          bullets: [
            "Visit more than once at relevant trading times.",
            "Write down what happened during each visit, not what you assume happens daily.",
            "Check whether the customer route reaches the actual premises entrance.",
          ],
        },
        {
          heading: "Understand the nearby restaurant choices",
          paragraphs: [
            "Map the restaurants and other food options that could serve the same customer occasion. A casual lunch counter, a destination dining room, a takeaway and a pub kitchen may all sit nearby but serve different needs. Visit the most relevant ones and note cuisine, service style, price information where publicly available, opening times, seating and what appears distinctive. Separate direct alternatives from businesses that simply sell food. Explain the reasoning so another person can understand why each venue is on your list.",
            "Do not treat the number of restaurants as a verdict. A cluster can be a recognised dining destination with strong choice, intense competition or both. Few listings may mean an opening, a different area pattern or incomplete online records. Businesses may have changed or closed. Verify current details, add the date and leave uncertain entries marked as uncertain. Most importantly, ask how your concept would fit the range customers can already choose from. A gap is a prompt for further research; it is not proof that enough people want the missing offer.",
          ],
        },
        {
          heading: "Check access, visibility and the customer journey",
          paragraphs: [
            "Think about how a customer would discover and reach the restaurant. Is the frontage visible from the approaches people use? Can someone identify the entrance? Are crossings, pavements and nearby transport practical for the customers you have in mind? If you expect bookings, consider how guests arrive at the time of service. If takeaway matters, consider how people collect orders without disrupting the entrance. If accessibility is important to your plan, have the relevant requirements assessed properly rather than relying on a brief viewing.",
            "Take the journey from the customer's point of view, then consider staff and deliveries. Where could a queue form? How would stock arrive? How are waste and collections handled? These practical questions can change whether a unit suits your model. Record visible conditions separately from assumptions about the building or access arrangements. Ask for plans, specifications and relevant permissions, and use qualified professionals to interpret anything that affects your operation.",
          ],
        },
        {
          heading: "Check the premises against the menu and operating plan",
          paragraphs: [
            "A restaurant's location is only part of the decision. The premises must support the intended use, fit-out and service. Think through seating, kitchen workflow, preparation, storage, utilities, extraction, ventilation, deliveries, staff areas and waste. Requirements depend on the particular menu and layout. A previous restaurant use or a fitted kitchen does not guarantee that the unit suits your concept or that equipment and permissions remain appropriate. Request the relevant documents and have the plans reviewed by competent advisers.",
            "Confirm planning use and any property-specific conditions with the local authority or a qualified planning adviser. Government guidance in England includes cafés and restaurants within Class E in many cases, but broad rules do not answer every question about a specific premises, works, licensing or building requirements. Food businesses must also register with the relevant local authority; see the [official starting guidance](https://www.gov.uk/guidance/starting-a-food-business). Treat these checks as separate workstreams and allow time to get reliable answers before you make a binding commitment.",
          ],
        },
        {
          heading: "Keep lease costs and property terms in view",
          paragraphs: [
            "Ask for the heads of terms and the draft lease early. Review the length of the commitment, break options, rent review, repairing responsibilities, service charge, insurance, deposit, permitted use, alterations and any conditions. Ask what is included in quoted costs and which figures are estimates. A restaurant may require substantial works, and the agreement can affect who pays for them and what happens at the end. Get independent legal and surveying advice before relying on a summary or promise.",
            "Check business rates through current official information rather than using another tenant's experience as a forecast. The [GOV.UK valuation service](https://www.gov.uk/find-business-rates) lets you look up rateable values and compare similar properties. The rateable value is not the same as your complete bill. Confirm the rules and your own position with an appropriate adviser. Keep the occupancy-cost review distinct from your assessment of customers, competition and access; a promising location does not make unclear lease terms safe, and a lower rent does not establish a stronger customer fit.",
          ],
        },
        {
          heading: "Compare locations with the same questions",
          paragraphs: [
            "If you have several possible addresses, use one framework for each. Record the concept fit, customer context, nearby alternatives, observed activity, access, premises condition, documents and outstanding checks. Add a source and date to every material statement. Keep unknowns visible instead of filling them with a guess. You may find that one address has stronger support for lunch trade while another has clearer evening destinations, or that neither has enough evidence yet.",
            "A short conclusion can be conditional: this unit is worth pursuing if a particular permission or layout question is resolved; that unit needs another evening visit before it can be compared fairly. Decide which new evidence would change your mind and who can provide it. This is more useful than giving each address a single score that hides conflicting signals. A clear process also helps you explain the decision to a co-founder, lender or adviser without presenting an uncertain view as a certainty.",
          ],
        },
        {
          heading: "Choose the next check before you sign",
          paragraphs: [
            "Before signing, ask yourself three things: what is the strongest evidence that this location suits the restaurant, what is the biggest unresolved risk or constraint, and what would change the decision? If you cannot answer, identify the information needed. Revisit the area, confirm the facts that are specific to the property and ask qualified professionals to review the lease, planning position, building and food operation as appropriate. Do not confuse a well-known street or an attractive interior with completed due diligence.",
            "SiteFit offers an initial assessment for London commercial locations and supported business types, including restaurants. It can help organise relevant context around an address. It does not measure actual restaurant sales, promise demand or replace legal, planning, food-safety, building or financial advice. Use it as one part of a broader decision, alongside your observations and property documents. A good process leaves you with a clear next action and a realistic account of what remains unknown.",
          ],
        },
      ],
    ),
  },
  {
    ...shared,
    id: "high-footfall-location-business",
    slug: "does-high-footfall-mean-a-good-business-location",
    featured: false,
    title: "Does High Footfall Mean a Good Business Location?",
    excerpt:
      "A busy pavement can catch your eye, but footfall alone cannot tell you whether a London unit suits your business.",
    seoTitle: "Does High Footfall Mean a Good Business Location?",
    seoDescription:
      "High footfall sounds attractive, but it is not a sales forecast. Learn how to assess a London commercial location beyond a busy pavement.",
    ogTitle: "High Footfall Does Not Tell the Whole Story",
    ogDescription: "How to assess activity, customer fit and evidence around a London property.",
    category: "Research notes",
    tags: ["footfall", "location", "London"],
    featuredImage: { src: "/images/london-high-street-footfall.webp", width: 800, height: 800 },
    featuredImageAlt: "A London café terrace with the City skyline in the distance.",
    datePublished: "2026-10-19T06:00:00Z",
    dateModified: "2026-10-19T06:00:00Z",
    cta: editorialCta,
    content: editorialContent(
      "“High footfall” is one of the first phrases people notice in a commercial property listing. It sounds like a shortcut to a busy shop and a healthy till. But a lively street does not show how many people will enter a particular unit, whether they need what you sell, or whether they will come at the times you trade. Footfall data can be useful when its source, area, date and method are clear. A quick count during a viewing is something else entirely. Before choosing a London property because it looks busy, separate measured information from what you observed and ask whether the activity fits your business. That gives you a better starting point than treating movement on a pavement as a promise.",
      [
        {
          heading: "What people mean by footfall",
          paragraphs: [
            "People use “footfall” to mean different things: a formal pedestrian-count dataset, a sensor estimate, a town-centre monitoring figure, or simply the number of people they remember seeing outside. Those measures are not interchangeable. Before using a number, find out who collected it, when, where, by what method and what the count includes. Was it a single hour or a longer period? A street segment or a shopping centre? A weekday or a weekend? Without that context, a large number may answer a different question from the one your business needs.",
            "If a property listing says the location has high footfall, ask for the source and supporting period. If the answer is not available, treat the statement as an unverified claim, not a measured fact. During your own visit, write down what you saw at the time. That observation can still help you understand the street, but label it accurately. One busy moment cannot establish a daily or seasonal pattern, and a quiet visit does not prove that the area is always quiet.",
          ],
        },
        {
          heading: "A person passing is not necessarily a potential customer",
          paragraphs: [
            "The people moving through an area may be travelling somewhere else, waiting for transport, heading to work or visiting a nearby destination. Their route, reason for being there and available time matter. Someone rushing for a train may be relevant to a takeaway coffee offer and less relevant to a long sit-down visit. A pedestrian count does not tell you what people want, whether they can see the unit, or whether the price and offer suit them.",
            "Think about the customer occasion your business depends on. Which people might notice the premises, enter and choose your service? What would make them stop? Does your offer match the times they are nearby? The answer may involve passing trade, local residents, workers, destination visits or repeat customers. Do not assume that the biggest crowd is automatically the best fit. A smaller but better-matched customer context may be more relevant to your concept, though that too needs evidence and should not be turned into a sales prediction.",
          ],
        },
        {
          heading: "Match the activity to your business and trading hours",
          paragraphs: [
            "Different businesses need different patterns. A coffee shop might care about a morning route, local lunchtime visits or weekend neighbourhood activity. A restaurant may depend on lunch, evening bookings, walk-ins or takeaway. A hair or beauty salon may rely more on planned appointments and repeat customers than spontaneous pavement stops. The address should be assessed against the business you intend to run, not a generic idea that “busy is good”.",
            "Visit during the periods that matter to your plan, on more than one occasion where possible. Record the day, time, weather, nearby events and what you noticed. Look at the route to the entrance, not just the main road. Are people on the other side of a barrier? Is the unit set back or hard to see? Is the street busy only when neighbouring offices or venues are open? These details can help you form better questions, but they do not replace reliable measurement when a measured count is essential to your decision.",
          ],
          bullets: [
            "Choose observation times that match your planned opening hours.",
            "Note routes, crossings, visibility and the actual entrance.",
            "Keep each visit's conditions beside your observation.",
          ],
        },
        {
          heading: "Separate footfall from nearby customer context",
          paragraphs: [
            "Population, household and workplace data can help describe who lives or works in a wider area. Transport data can describe services, routes or stops. Business records can help identify nearby places. These sources may add context to a location decision, but none should silently become a count of measured pedestrians outside a particular shopfront. Each has its own geography, date, definition and limits.",
            "When you read a chart or report, check the original source and ask what it measures. A statistic for a neighbourhood does not describe every street. A stop nearby does not prove that customers use the route to your door. A business directory may include stale or broad-category records. Write down the source and the conclusion it can support, then note what it cannot tell you. This is how you avoid a common leap: treating a related indicator as if it were direct evidence of visits, demand or spending at one property.",
          ],
        },
        {
          heading: "Look at competitors and the street together",
          paragraphs: [
            "A busy location often contains several reasons for people to be there and several businesses competing for attention. Visit relevant alternatives and see what they offer, when they appear active and how customers reach them. A count of cafés or restaurants is not a measure of market demand, and activity outside one venue does not reveal its revenue. Still, direct observations can help you understand the customer choices and the shape of the area.",
            "Ask what makes your proposed business distinct for the customer and occasion you have in mind. If the area has many similar options, research how they differ before deciding that the market is full. If there are few visible alternatives, find out whether customers have another way to meet the same need or whether the area works differently at other times. A gap is not proof of unmet demand, just as a cluster is not proof that a new business cannot fit. Keep both explanations open until the evidence supports a clearer view.",
          ],
        },
        {
          heading: "Check the route, visibility and premises",
          paragraphs: [
            "People can be close to a unit and still have little reason or ability to enter. Examine the approach from the routes your likely customer uses. Is the frontage visible? Is the entrance obvious? Can customers cross the road conveniently? Are there barriers, steps or other practical issues to assess? What happens when several people arrive at once? A site visit helps you ask these questions, while accessibility and building requirements should be checked by someone qualified to assess them.",
            "Then consider whether the premises itself fits the offer. Layout, condition, utilities, storage, delivery access, equipment and permissions may matter as much as street activity. Ask the landlord or agent for documents and have the appropriate professionals review them. Do not assume that a busy site is operationally suitable or that a previous tenant's use proves your proposed business can operate in the same way. The property and the surrounding area are related parts of the decision, but they answer different questions.",
          ],
        },
        {
          heading: "Use evidence proportionately",
          paragraphs: [
            "If a reliable pedestrian-count dataset exists for the relevant street and period, read its methodology and limitations before using it. If it does not, say so. You can still combine visits, local context, competitor research and premises checks to form a more complete view, provided you keep each source type clear. Do not invent a number, extrapolate one short count into a year, or label an estimate as observed fact. If a conclusion depends on a measurement you do not have, keep that conclusion uncertain.",
            "A useful evidence note might say: “On two weekday lunchtime visits, I observed steady movement outside the unit. These visits do not establish a typical daily count. I still need a reliable measure if the business plan depends on a specific volume.” That is more informative than “high footfall” because it tells you what happened and what remains unknown. The right standard depends on the importance of the question and the cost of being wrong.",
          ],
        },
        {
          heading: "Decide what to check next",
          paragraphs: [
            "Before choosing the property, write down why the observed or measured activity matters to your business, what evidence supports the point, and what could weaken it. Ask whether the source matches your opening hours, customer route and premises. If the issue is a time-of-day pattern, make another visit. If a listing makes a measured claim, request its source. If the property has a practical constraint, get the plans or an expert view. This turns a vague impression into a sequence of specific checks.",
            "SiteFit can put a London address into context for a coffee shop, restaurant or salon. It does not treat transport or population data as measured shopfront footfall and cannot guarantee customer numbers or sales. Use its assessment alongside observations, property documents and professional advice. High footfall may be relevant, but the useful decision is whether the location, customer context and premises fit your business, with uncertainty stated honestly.",
          ],
        },
      ],
    ),
  },

  {
    ...shared,
    id: "choose-salon-location-london",
    slug: "how-to-choose-a-salon-location-in-london",
    featured: false,
    title: "How to Choose a Salon Location in London",
    excerpt: "A practical location checklist for hair and beauty salons, from repeat clients and easy journeys to treatment permissions and premises costs.",
    seoTitle: "How to Choose a Salon Location in London",
    seoDescription: "Choosing a London hair or beauty salon location? Check client journeys, nearby services, layout, permissions and costs before agreeing a lease.",
    ogTitle: "How to Choose a Salon Location in London",
    ogDescription: "Choosing a London hair or beauty salon location? Check client journeys, nearby services, layout, permissions and costs before agreeing a lease.",
    category: "Choosing a location",
    tags: ["salon", "location", "London"],
    featuredImage: {"src": "/images/london-salon-interior.webp", "width": 1200, "height": 1200},
    featuredImageAlt: "A bright salon interior with two barber chairs, mirrors, washbasins and large street-facing windows.",
    ogImage: {"src": "/images/london-salon-interior.webp", "width": 1200, "height": 1200},
    datePublished: "2026-11-05T00:00:00Z",
    dateModified: "2026-11-05T00:00:00Z",
    cta: editorialCta,
    content: editorialContent(
      "Choosing a salon location in London starts with the people who could realistically become regular clients, the journeys they would make and whether the premises can support your services. A smart shopfront helps, but it cannot answer those questions on its own. Before you sign a lease, build a picture of an ordinary appointment, from booking to the journey home. This guide covers hair and beauty premises, including the different checks that treatment rooms can need. It is designed to help you shortlist locations and ask better questions, rather than predict bookings or replace professional advice about a particular property.",
      [
        {
          heading: "Start with the salon you actually want to run",
          paragraphs: [
            "A neighbourhood hairdresser, a specialist colour studio and a beauty business offering longer treatments can need very different spaces. Write down your intended services, appointment lengths, opening hours and how clients will book. Include the time needed for consultations, cleaning, storage and staff breaks.",
            "Think about the visit from your client's side. Someone popping in for a quick trim may value an easy stop on their usual route. A client booking a longer appointment may put more weight on reliable travel, comfort and privacy. It gives you a clear set of questions to investigate, and helps you avoid paying for features your business does not really need."
          ]
        },
        {
          heading: "Look for repeat customers, not just a busy pavement",
          paragraphs: [
            "Start with the people living and working within a realistic journey of the unit. Consider the services they can already reach, the times they might be free and whether your proposed offer has a clear place among those options. Local population figures can provide background, but they cannot tell you who wants a haircut next week or what someone will spend on a treatment.",
            "Visit during the hours you expect to trade. A street can feel very different on a weekday morning, a late opening evening and a Saturday afternoon. Note what you can actually see without guessing people's income or preferences from their appearance. For more on that distinction, read [why high footfall does not automatically mean a good business location](https://sitefit.co.uk/blog/does-high-footfall-mean-a-good-business-location). Passing people are a useful observation; repeat bookings still need a separate case."
          ]
        },
        {
          heading: "Test the journey all the way to the door",
          paragraphs: [
            "An address described as near a station may still involve an awkward crossing, steps or a confusing entrance. Walk the route from the stops and streets your clients are likely to use. Check how obvious the frontage is from both directions, and whether someone arriving for the first time could find the door without ringing for directions.",
            "Consider clients with different access needs. Look at the entrance, circulation space, toilet arrangements and the proposed route to treatment areas. Do not decide accessibility from a photograph or a quick glance at a step. Ask a suitable adviser what adjustments the premises and your service may require. If customers or staff may leave after dark, repeat the journey at that time. Record practical questions about lighting and transport rather than making unsupported claims about an area's safety."
          ]
        },
        {
          heading: "Compare competitors by service and experience",
          paragraphs: [
            "Put nearby salons on a simple list, then look beyond the total. Record services, advertised prices, opening hours, booking options and the experience each business presents. Check whether a supposed competitor is a barber, a specialist studio, a treatment room inside another business or a salon offering much the same service you plan to provide. Their relevance will differ.",
            "Read recent public reviews for recurring questions about appointments, communication or convenience. Reviews are selective accounts, not a complete measure of service quality or commercial strength. Keep the date and source with each note, and avoid assuming that a gap in a menu means unmet demand. You can adapt the questions in [our guide to assessing café competition](https://sitefit.co.uk/blog/how-to-assess-competition-before-opening-a-cafe) to your own services. The useful outcome is a testable reason for clients to choose you."
          ]
        },
        {
          heading: "Check whether the layout works behind the mirror",
          paragraphs: [
            "A room can look generous until you account for everything needed during a working day. Sketch where consultations, washing, styling, treatments, clean supplies, used towels and staff belongings would go. Include movement between stations and the space needed to open doors or use equipment. Keep the sketch provisional until measurements and specialist requirements have been checked.",
            "Ask about water supply, drainage, ventilation, electrical capacity and the condition of existing installations. A visible sink does not prove that the plumbing will support your layout, and a fitted treatment room does not establish that your services can operate there. Arrange appropriate surveys or inspections before relying on those features. Request written details of what the landlord includes, what belongs to the outgoing occupier and which alterations would need consent. Those answers can change an apparently attractive shortlist quickly."
          ]
        },
        {
          heading: "Confirm registration, treatment licences and permitted use",
          paragraphs: [
            "The checks depend on the services and the borough. [GOV.UK's hairdresser registration guidance](https://www.gov.uk/find-licences/register-a-hairdressing-business) says to check with the local council whether registration is required. Beauty treatments can bring additional requirements. For example, [Westminster's special treatment premises guidance](https://www.westminster.gov.uk/licensing/other-licence-and-business-permit-types/licensing/other-licence-and-business-permit-types/special-treatment-premises-licences) explains that certain treatments may require a premises licence, with exemptions and treatment-specific details to consider.",
            "Send the relevant council your actual treatment list and address. Do not assume an answer from another borough applies, or that a previous salon's paperwork covers a new operator and different services. Separately, ask a planning adviser or the local planning authority to establish the lawful use and any conditions. Planning, the lease and treatment licensing answer different questions. Get each checked before the proposed services become the basis of a binding commitment."
          ]
        },
        {
          heading: "Put the whole occupancy cost beside the location",
          paragraphs: [
            "Compare rent with the rest of the cost of occupying the unit. Ask about business rates, service charges, insurance contributions, utilities, waste arrangements, repairs and proposed alterations. Make clear which figures are quotations, which are estimates and which are still unknown. An attractive rent is harder to judge while those other obligations remain blank.",
            "Ask your solicitor or surveyor to explain the relevant lease terms, including repairs, alterations, rent review, breaks and what happens at the end. If you intend to rent chairs or rooms to other practitioners, explain that arrangement before agreeing terms so the necessary permissions and responsibilities can be checked. Read [our guide to business rates and service charges](https://sitefit.co.uk/blog/business-rates-and-service-charges-commercial-property-2026) for a practical document list. Keep any commercial forecast separate from verified property costs; neither should quietly stand in for the other."
          ]
        },
        {
          heading: "Consider neighbouring businesses without assuming referrals",
          paragraphs: [
            "A gym, café, workplace or other local business might give people a reason to visit the street. That is worth observing, but proximity does not establish a referral stream. Look at whether opening hours and customer journeys could sensibly fit together. A neighbouring business with a very different routine may have little bearing on your appointment diary.",
            "Also notice potential friction: deliveries outside the entrance, noise reaching treatment rooms, shared access or limited storage. Ask how these arrangements work in practice and who is responsible for resolving problems. Where possible, speak to neighbouring occupiers with a few specific questions about the building and street. Treat their answers as dated accounts to follow up, rather than guarantees about your own trading conditions."
          ]
        },
        {
          heading: "Make a shortlist with clear next steps",
          paragraphs: [
            "Use the same headings for each address: client fit, journey, competition, layout, permissions and occupancy costs. Under each one, record what you know, what is assumed and what needs checking.",
            "Then identify the question most likely to change your decision. It might be whether the ventilation can support a service, whether a treatment licence is needed or whether the repair obligation is manageable. Give that question an owner and a next action. [SiteFit's Free Snapshot](https://sitefit.co.uk/check-location) can help put a London address and business type into context while you organise the property checks. Use that context alongside visits and specialist advice, with unresolved premises questions still visible."
          ]
        },
        {
          heading: "Conclusion: choose a place clients can keep coming back to",
          paragraphs: [
            "The best salon location for your plan is one where the client journey, services, premises and obligations make sense together. A fashionable postcode or polished interior can draw your attention, but the decision becomes stronger when you can explain who the salon would serve and what still needs verification. Compare a small number of addresses consistently, walk the routes and ask for the documents behind the listing. Before committing, resolve the issues that could prevent your intended services or materially change the cost. That leaves you with a location decision grounded in your actual salon, rather than the promise of a busy street."
          ]
        }
      ]
    ),
  },
  {
    ...shared,
    id: "takeover-cafe-restaurant-premises",
    slug: "taking-over-cafe-restaurant-premises-checklist",
    featured: false,
    title: "Taking Over a Café or Restaurant: Premises Checklist",
    excerpt: "What to verify before inheriting a fitted café or restaurant, including the transaction, equipment, permissions, location and handover.",
    seoTitle: "Taking Over a Café or Restaurant: Premises Checklist",
    seoDescription: "Taking over café or restaurant premises? Check equipment ownership, planning, extraction, registration and lease costs before committing.",
    ogTitle: "Taking Over a Café or Restaurant: Premises Checklist",
    ogDescription: "Taking over café or restaurant premises? Check equipment ownership, planning, extraction, registration and lease costs before committing.",
    category: "Before the lease",
    tags: ["coffee-shop", "restaurant", "premises", "London"],
    featuredImage: {"src": "/images/former-cafe-restaurant-premises.webp", "width": 1200, "height": 1200},
    featuredImageAlt: "The frontage of a café with a green door, awning and outdoor tables.",
    ogImage: {"src": "/images/former-cafe-restaurant-premises.webp", "width": 1200, "height": 1200},
    datePublished: "2026-11-05T00:00:00Z",
    dateModified: "2026-11-05T00:00:00Z",
    cta: editorialCta,
    content: editorialContent(
      "Taking over a former café or restaurant can look like a head start: there is already a counter, perhaps a kitchen, and a shopfront that people recognise. Before you agree terms, check what is actually included, what the premises can lawfully support and whether the location fits your own business. The previous occupier's setup is useful background, but it does not settle those questions. This checklist focuses on the property decision for London premises. Buying an existing trading business brings additional legal, financial and employment checks, which need advice specific to the transaction.",
      [
        {
          heading: "Establish exactly what you are taking over",
          paragraphs: [
            "Ask the agent to describe the proposed transaction clearly. Are you taking a new lease of an empty unit, an assignment of an existing lease, selected equipment and fittings, or an operating business? These arrangements create different questions. A listing that mentions a premium or a fully fitted café does not tell you exactly which rights, assets or obligations would pass to you.",
            "Request a written inventory and ask who owns each significant item. The coffee machine, extraction equipment, furniture or payment terminal might belong to someone other than the outgoing operator. Your solicitor should check the documents and any relevant contracts before you rely on the sales description. Keep property checks and business-purchase checks in view together, without assuming that agreement on one means the other is complete."
          ]
        },
        {
          heading: "Research the location as if the unit were empty",
          paragraphs: [
            "Existing tables can make it surprisingly easy to skip the location question. Step outside and ask who your own offer would serve, at which times, and why they would choose this address. A former breakfast café does not establish an evening market, and a previous restaurant does not prove that a smaller daytime offer will attract the same customers.",
            "Walk the nearby streets during your intended opening hours. Look at the route from transport, the frontage and the businesses customers can already choose. Separate what you observe from anything an agent or seller tells you about trade. If useful, start with [how to choose a coffee shop location](https://sitefit.co.uk/blog/how-to-choose-a-coffee-shop-location-in-london) or [how to choose a restaurant location](https://sitefit.co.uk/blog/how-to-choose-a-restaurant-location-in-london). The fitted interior should be one part of the decision, rather than the reason to stop researching it."
          ]
        },
        {
          heading: "Treat the previous business's story carefully",
          paragraphs: [
            "Ask about the occupation history and why the premises are available, but avoid turning a short explanation into a firm conclusion. A closure could have several causes, and the public information may not establish any of them. A food register entry or an old review is not a trading account. Record gaps instead of filling them with a story about the street.",
            "If turnover, profit or customer numbers form part of a business sale, have your accountant assess the underlying evidence and what it actually covers. Check the periods, business identity and whether exceptional circumstances affect the comparison. Even reliable historical figures do not forecast your results under a different menu, team, price or opening pattern. Keep a clear distinction between evidence about the outgoing business and the assumptions behind the business you intend to run."
          ]
        },
        {
          heading: "Verify planning use and the actual permissions",
          paragraphs: [
            "Ask for the planning history, decision notices and relevant conditions, including any restrictions on hours or equipment. The important question is whether your proposed operation is lawful at this address. Old signage, a restaurant listing or a previous tenant's menu cannot establish that. Ask the local planning authority or a qualified planning adviser to review the actual use and proposal.",
            "In England, cafés and restaurants can fall within Class E, while hot food takeaway use is treated differently. The detail matters when cooking, delivery and on-site dining change. [Planning Portal's explanation](https://www.planningportal.co.uk/permission/common-projects/shops/i-want-to-convert-a-shop-to-a-cafe-public-house-or-takeaway/) outlines the distinction, and [our Class E guide](https://sitefit.co.uk/blog/class-e-planning-use-cafe-restaurant) explains the questions to take forward. Separately confirm landlord consent for the intended use and alterations. Planning permission and the lease do not substitute for each other."
          ]
        },
        {
          heading: "Inspect equipment before calling the fit-out a saving",
          paragraphs: [
            "A fitted kitchen can be valuable only if it is included, serviceable and suitable for your operation. Request maintenance records and relevant inspection documents. Ask appropriately qualified contractors to inspect the systems you would depend on, such as gas, electrical installations, ventilation and extraction. Do not treat equipment being switched on during a viewing as a condition survey.",
            "Work through your proposed menu and layout with the relevant specialists. Ask about capacity, drainage, refrigeration, hot water and the route for replacement equipment. Identify anything needing repair, replacement or consent, then obtain quotations before calling the existing fit-out a saving. Keep assumptions visible if access or records are incomplete. An attractive collection of fittings can otherwise distract from a costly practical mismatch that only becomes obvious after you have committed to the premises."
          ]
        },
        {
          heading: "Follow the extraction route and shared-building arrangements",
          paragraphs: [
            "If you plan to cook, inspect more than the canopy inside the kitchen. Ask where the duct runs, where it discharges, who owns it and how maintenance access works. Have a competent specialist assess whether it is appropriate for your proposed use. Request the relevant permissions and any conditions, rather than assuming that a visible installation was approved or remains suitable.",
            "Consider the whole building as well. Ask about flats above, shared yards, drainage, waste storage, deliveries and access outside opening hours. Find out who deals with shared systems and how costs are allocated. Neighbours' accounts may help identify questions, but they cannot prove that complaints, restrictions or defects are absent. Record what remains unverified, especially where your business depends on evening trading, cooking or regular collections."
          ]
        },
        {
          heading: "Check food registration and licensing for your operation",
          paragraphs: [
            "Taking over a food business requires attention to your own operator details. The [Food Standards Agency registration service](https://register.food.gov.uk/new) says that a new operator starting or taking over a food business must register with the local authority at least 28 days before trading. Ask the council how that applies to your proposed start date and operation. Do not rely on the outgoing business's registration as your own.",
            "Where alcohol or other licensable activities are involved, ask for the full premises licence, plans and conditions, and have the proposed arrangements checked. A transfer or variation may be needed; [the Home Office provides the relevant premises licence forms](https://www.gov.uk/government/publications/premises-licence-application-forms). Check pavement seating separately too. An old outdoor table, licence summary or hygiene sticker is not evidence that every part of your proposed operation is authorised."
          ]
        },
        {
          heading: "Read the lease and the costs together",
          paragraphs: [
            "Ask your solicitor and surveyor to review the lease obligations alongside the physical condition. Clarify repairs, alterations, reinstatement, breaks, rent review and any conditions affecting transfer or future exit. Where an existing lease is assigned, the remaining term and its obligations deserve close attention. Do not judge the commitment only by the rent quoted in the listing.",
            "Request the current rates information, service charge budget, available accounts and details of insurance or other landlord charges. Confirm which figures relate to the exact unit and which costs arise from your intended changes. [Our rates and service charge guide](https://sitefit.co.uk/blog/business-rates-and-service-charges-commercial-property-2026) sets out useful questions. Keep one-off takeover costs distinct from continuing occupancy costs, and ask your advisers how any premium, deposit or equipment purchase should be treated for the actual transaction."
          ]
        },
        {
          heading: "Turn the handover into a written checklist",
          paragraphs: [
            "Before agreeing a completion timetable, list the documents, inspections, consents and access arrangements still needed. Include meter readings, keys, alarm arrangements, equipment ownership and any agreed removal or repair work. Assign each item to a named person and record the evidence that will close it. Your solicitor should advise how important outstanding matters need to be addressed in the agreement.",
            "Use the same approach for the location decision. [SiteFit](https://sitefit.co.uk/check-location) can help you examine a London address in the context of the business you propose, alongside your own visits and professional checks. Keep those questions separate enough to see clearly, then consider their combined effect before making your commitment."
          ]
        },
        {
          heading: "Conclusion: inherit the fittings, verify the case",
          paragraphs: [
            "A former café or restaurant deserves a fresh assessment against your plans. Establish what the transaction includes, test the location, inspect the systems and confirm the permissions and obligations that would apply to you. Treat the previous business's history as evidence to investigate, rather than a forecast or an explanation for every uncertainty. A sensible takeover decision is one you can support with documents, suitable advice and a practical operating plan. If a critical answer is still missing, make it a specific next check before allowing the fitted interior or a proposed opening date to drive the decision."
          ]
        }
      ]
    ),
  },
  {
    ...shared,
    id: "class-e-cafe-restaurant",
    slug: "class-e-planning-use-cafe-restaurant",
    featured: false,
    title: "Class E Planning Use: Can You Open a Café or Restaurant?",
    excerpt: "A plain-English guide to Class E, takeaway use, planning conditions and the separate lease and licensing checks for a London food business.",
    seoTitle: "Class E Planning Use: Can You Open a Café or Restaurant?",
    seoDescription: "Understand Class E for cafés and restaurants in England, the hot food takeaway distinction, and the property permissions to check before signing.",
    ogTitle: "Class E Planning Use: Can You Open a Café or Restaurant?",
    ogDescription: "Understand Class E for cafés and restaurants in England, the hot food takeaway distinction, and the property permissions to check before signing.",
    category: "Before the lease",
    tags: ["planning", "restaurant", "coffee-shop", "London"],
    featuredImage: {"src": "/images/class-e-cafe-restaurant-planning.webp", "width": 1200, "height": 1200},
    featuredImageAlt: "A café interior with woven chairs, brick walls, large windows and hanging plants.",
    ogImage: {"src": "/images/class-e-cafe-restaurant-planning.webp", "width": 1200, "height": 1200},
    datePublished: "2026-11-05T00:00:00Z",
    dateModified: "2026-11-05T00:00:00Z",
    cta: editorialCta,
    content: editorialContent(
      "Class E can allow a café or restaurant use in England, but the label alone does not confirm that your proposed business can operate from a particular unit. The existing lawful use, planning conditions, intended activities and any building work all matter. Hot food takeaway use also raises a different planning question from food mainly consumed on the premises. Before signing a lease, describe what you actually intend to do and check it against the property's records. This guide explains that first conversation in plain English, with London premises in mind. It is general guidance, not a planning decision about your address.",
      [
        {
          heading: "What does Class E mean for a café or restaurant?",
          paragraphs: [
            "Planning use classes group certain uses of land and buildings in England. Class E includes a range of commercial, business and service activities, including many shops, cafés and restaurants. That is why a commercial listing may describe a unit as Class E instead of using the older A1 or A3 descriptions you might still see in historical documents.",
            "[Planning Portal explains](https://www.planningportal.co.uk/permission/common-projects/shops/i-want-to-convert-a-shop-to-a-cafe-public-house-or-takeaway/) that a change from a shop to a café within Class E will not normally need planning permission for the change of use, although associated works may need permission. The word normally matters. Ask an adviser to establish the lawful existing use and check the documents for restrictions relevant to your proposal. An agent's category is a starting point for questions, rather than a substitute for that review."
          ]
        },
        {
          heading: "Describe the operation before asking about permission",
          paragraphs: [
            "The council needs something more precise than 'a food business'. Write a short description covering the menu, cooking methods, intended hours, seating, takeaway orders, collections and deliveries. Mention alcohol, outdoor seating and any proposed extraction, signs or alterations. If the plan is still changing, say which elements are undecided rather than presenting guesses as a fixed specification.",
            "For example, coffee and pastries served mainly to seated customers can raise different questions from a business built around evening hot-food deliveries. The distinction comes from the actual operation, not the name above the door. If your business will combine activities, explain the proposed balance and how the space will be used. A clear description lets a planning adviser identify the important questions before you spend money developing a layout that depends on unconfirmed assumptions."
          ]
        },
        {
          heading: "Understand the hot food takeaway distinction",
          paragraphs: [
            "Government guidance distinguishes cafés and restaurants within Class E from hot food takeaways, which are treated as sui generis, meaning a use outside the specified classes. [The official use-class comparison](https://www.gov.uk/government/publications/healthy-weight-environments-using-the-planning-system/addendum-hot-food-takeaways-use-in-the-new-use-class-order) describes the difference between food mainly consumed on the premises and hot food sold for consumption elsewhere. It is relevant when a proposed model relies heavily on collection or delivery.",
            "Do not settle the classification by counting tables or choosing a particular business name. Nor should you assume a takeaway coffee automatically makes a café a hot food takeaway. Ask the local planning authority or a qualified adviser to assess the complete proposal and any mixed use. If the menu or delivery model changes during negotiations, revisit the advice; the earlier answer may have depended on a different operation."
          ]
        },
        {
          heading: "Read the planning history, not just the latest listing",
          paragraphs: [
            "Search the relevant borough's planning register for the exact address and any alternative descriptions of the unit. Ask for decision notices, approved plans and conditions associated with relevant permissions. Read the actual documents with suitable help, rather than treating a search-result heading as the complete planning position. Older records may use previous use-class terminology.",
            "A condition might affect how an approved operation can run, so ask specifically about hours, extraction, deliveries and other matters central to your plan. A past permission also needs to be understood in context: which part of the building did it cover, and what was actually authorised? If the records are incomplete, record that gap. Failure to find a document online does not establish that no permission, condition or restriction exists. Your adviser can explain what further evidence is needed."
          ]
        },
        {
          heading: "Separate a change of use from building work",
          paragraphs: [
            "Even where a change of use does not need a planning application, works associated with it may raise separate requirements. Proposed ducts, external plant, frontage changes or alterations to a building should be assessed on their own facts. [GOV.UK's guidance on when permission is required](https://www.gov.uk/guidance/when-is-permission-required) distinguishes building operations and material changes of use within the broader planning framework.",
            "Bring sketches and a clear equipment brief to the discussion. Ask whether the building's status, location or existing permissions affect what can be changed, and what other approvals need checking. Planning and building regulations are separate regimes; an answer under one does not resolve the other. Have the appropriate professionals assess structure, fire precautions, access and services for the proposed fit-out. This is especially useful before treating an empty shell as a straightforward conversion."
          ]
        },
        {
          heading: "Keep planning, the lease and licensing distinct",
          paragraphs: [
            "Landlord approval does not confirm planning permission, and a planning position does not override your lease. Ask your solicitor to check the permitted-use wording, alteration provisions and any other relevant restrictions. Explain the full operation, including deliveries, cooking, hours and outdoor areas, so the advice addresses what you intend rather than a narrower description.",
            "Licensing and registration need separate attention too. Food-business registration belongs with the local authority; alcohol and certain other activities can require premises licensing. [The Home Office's premises licence guidance and forms](https://www.gov.uk/government/publications/premises-licence-application-forms) provide a useful starting point for that discussion. Ask about any proposed pavement seating with the relevant authority as well. Keep a separate answer for each requirement, with the document, responsible person and next action recorded."
          ]
        },
        {
          heading: "Treat an existing kitchen as a question to investigate",
          paragraphs: [
            "A former café or restaurant can appear ready to go, particularly when the counter and kitchen remain in place. Ask for the planning and licensing records supporting that setup, then check whether they cover the activities you propose. The presence of equipment does not establish lawful use, sufficient capacity, ownership or condition.",
            "Ask a competent contractor to inspect extraction and other systems relevant to your menu. Check the route through the building, access for maintenance and any proposed changes. Keep technical suitability separate from planning and landlord consent, even when the same installation features in all three conversations. [Our former café and restaurant checklist](https://sitefit.co.uk/blog/taking-over-cafe-restaurant-premises-checklist) sets out a wider handover review. Reusing a previous fit-out can be practical, but only once the important assumptions have been examined for your operation."
          ]
        },
        {
          heading: "Allow the permissions position to shape negotiations",
          paragraphs: [
            "Before agreeing an opening date, identify which answers or approvals remain outstanding and who will obtain them. Ask your professional advisers about the implications for timing, cost and your commitment to the premises. If your proposal depends on a particular permission, make that dependency explicit while terms are being discussed.",
            "Do not assume an application will succeed or use an advertised timetable as a guaranteed decision date. The right next step may be further records, specialist advice or a properly framed enquiry to the council. Ask your solicitor how any necessary conditions or protections should be documented. A rent-free period can help a fit-out timetable, but it does not establish that the intended use will be allowed. Commercial incentives should be considered alongside the permission risk, with neither left vague."
          ]
        },
        {
          heading: "Build a short evidence file for each unit",
          paragraphs: [
            "Keep the address, proposed operation, relevant plans, decision notices and adviser responses together. Mark each item as a verified document, a dated statement or an unresolved question. If someone says a restriction does not apply, ask which document or professional assessment supports that answer. This makes it easier to compare units without losing important details between viewings.",
            "Pair that permission review with the location question. [SiteFit's Free Snapshot](https://sitefit.co.uk/check-location) helps put a London address and business type into context, while the property-specific permissions still need their own checks. A street that suits your customers is only part of the case. You also need a lawful and workable way to operate the business you have in mind, with any critical gaps identified before the commitment becomes binding."
          ]
        },
        {
          heading: "Conclusion: Class E is the opening question",
          paragraphs: [
            "Class E is useful context when searching for café or restaurant premises in England. The decision still depends on the actual property, its planning history and your proposed activities. Describe the operation clearly, investigate takeaway or mixed-use questions, and assess works, lease consent and licensing separately. Ask qualified advisers and the relevant council to resolve the issues that matter to your plan. Once those answers are documented, you can judge the premises on firmer ground and negotiate with a clearer understanding of what opening the doors would require."
          ]
        }
      ]
    ),
  },
  {
    ...shared,
    id: "research-commercial-catchment",
    slug: "commercial-property-catchment-area-research",
    featured: false,
    title: "Commercial Property Catchment Area: How to Research a Location",
    excerpt: "How to research the streets around a unit, interpret local data and compare customer journeys without confusing a map with future demand.",
    seoTitle: "Commercial Property Catchment Area: How to Research a Location",
    seoDescription: "Research a commercial property catchment area using local data, customer routes, timed visits and competing offers, with uncertainty kept visible.",
    ogTitle: "Commercial Property Catchment Area: How to Research a Location",
    ogDescription: "Research a commercial property catchment area using local data, customer routes, timed visits and competing offers, with uncertainty kept visible.",
    category: "Research notes",
    tags: ["catchment", "location", "London"],
    featuredImage: {"src": "/images/commercial-property-catchment-research.webp", "width": 1200, "height": 1200},
    featuredImageAlt: "A café interior looking towards the street through large front windows.",
    ogImage: {"src": "/images/commercial-property-catchment-research.webp", "width": 1200, "height": 1200},
    datePublished: "2026-11-05T00:00:00Z",
    dateModified: "2026-11-05T00:00:00Z",
    cta: editorialCta,
    content: editorialContent(
      "A commercial property's catchment area is the area from which a business might draw customers. Researching it means looking at people, journeys, competing offers and the way the surrounding streets work at the times you intend to trade. A circle on a map is a starting point, not a customer forecast. In London, a short distance can hide a railway, an awkward crossing or a route that takes people past several alternatives. This guide shows how to build a useful picture of the area around a commercial unit before you rent or buy, while keeping observations, data and assumptions clearly identified.",
      [
        {
          heading: "Begin with the customer journey you want to understand",
          paragraphs: [
            "Write down the business you are considering and the visit you expect someone to make. A quick coffee before work, a booked salon appointment and a restaurant dinner each involve different routines. Ask when the visit could happen, how people might travel and what would make the stop convenient. Keep those ideas as hypotheses until you have evidence to support them.",
            "Choose a few practical questions rather than trying to collect everything about the postcode. You might ask whether the unit is visible from a station route, whether nearby residents have useful alternatives, or how an evening customer would get home. They also make it easier to recognise when a source is interesting background but does not help answer the location decision in front of you."
          ]
        },
        {
          heading: "Walk the streets before trusting a radius",
          paragraphs: [
            "Start at the actual entrance and walk the routes customers might use. Look for crossings, gradients, steps, railway lines, large roads and entrances that are less obvious than they appear on a map. Note where people can enter a station, shopping centre or estate; a building's nearest edge may not be its usable entrance.",
            "Use [TfL's journey planner](https://tfl.gov.uk/plan-a-journey/) to explore journeys where relevant, then check the last part on foot. Keep a distinction between a planned route, your own timed walk and a broader catchment estimate. Each answers a slightly different question. Repeat important journeys at the hours that matter to the business, and consider different access needs. A neat boundary should help organise your enquiries, rather than imply that everyone inside it is equally likely to become a customer."
          ]
        },
        {
          heading: "Use population information as context",
          paragraphs: [
            "Population data can help describe the area around a unit, but check what geography and period the figures cover. A borough total may be too broad for a short walk from a shopfront. Residents, workers and visitors are also different groups, and a source covering one does not automatically describe the others.",
            "[ONS Explore Local Statistics](https://www.ons.gov.uk/explore-local-statistics/indicators) offers local indicators with information about their sources and scope. Read those details before making comparisons. Do not turn a population count into expected customers or assume a demographic category establishes someone's preferences. Use the information to form questions you can investigate locally. For instance, a possible difference between weekday and weekend activity is a reason to revisit at both times. It is not a sales estimate hidden inside an official statistic."
          ]
        },
        {
          heading: "Observe more than one trading period",
          paragraphs: [
            "Build a small visiting plan around your proposed hours. Include different weekdays and a weekend period where relevant. Note the date, time, weather and anything unusual, such as roadworks, a nearby event or a disrupted transport service. These details help explain why one visit may not resemble another.",
            "Write observations narrowly: a queue outside a particular business, an entrance that is difficult to spot, or a side street that feels quieter during the visit. If you count passers-by, state the position, duration and method. A short manual count cannot stand in for measured annual footfall, and it does not reveal buying intent. [Our high-footfall guide](https://sitefit.co.uk/blog/does-high-footfall-mean-a-good-business-location) explains why the type of journey and timing matter. Useful research becomes more honest when the limits of each observation stay attached to it."
          ]
        },
        {
          heading: "Map alternatives by what customers need",
          paragraphs: [
            "List nearby businesses that might meet the same need as your proposed offer. Include direct competitors and relevant alternatives: a bakery selling takeaway coffee, for example, may matter alongside dedicated coffee shops. A salon specialist may compete with businesses offering a broader treatment menu. Do not give every map pin the same commercial meaning.",
            "Check current menus, advertised services, hours and access arrangements, then verify important details where possible. Online listings can be incomplete or out of date. Keep the source and date rather than presenting the map as a comprehensive register. For food businesses, [FSA hygiene ratings](https://ratings.food.gov.uk/) can provide a dated hygiene reference, but do not establish popularity or trading performance. The question is what choices customers can make, and whether your proposed offer has a reason to be considered among them."
          ]
        },
        {
          heading: "Look at the street's daily practicalities",
          paragraphs: [
            "Research needs to include the ordinary tasks behind opening the doors. Look at deliveries, waste collection, staff journeys and the route customers would take if they need step-free access. Ask about shared entrances, yards and loading arrangements. Confirm the rules with the appropriate people rather than assuming an observed delivery shows what your business will be allowed to do.",
            "Notice nearby uses and their operating patterns without treating them as automatic benefits or problems. Offices, schools, shops and leisure businesses can create different routines. Whether those routines help your proposal needs investigation. Speak to neighbouring occupiers with specific questions about access and building arrangements. Their accounts can point to useful checks, but one person's experience does not establish that your own operation will run in the same way. Record the account and what would verify it."
          ]
        },
        {
          heading: "Check local changes without predicting their effect",
          paragraphs: [
            "Search the council's planning register for relevant proposals and check official transport or highway notices where a possible change could affect the unit. Separate a submitted application from an approved scheme, and an approval from work that has actually happened. Read dates and status carefully; a rendering in a letting brochure is not evidence of completed development.",
            "Ask a practical question about each change: could it affect access, visibility, noise, delivery routes or the people visiting the street? Keep the possible effect conditional if the outcome or timetable is uncertain. Avoid converting planned homes or offices into a precise future customer number. If a change could materially alter your decision, discuss it with the appropriate adviser and obtain the relevant documents. Background regeneration claims become more useful when translated into an identifiable dependency to check."
          ]
        },
        {
          heading: "Organise findings so gaps remain visible",
          paragraphs: [
            "Create a short research sheet with five columns: question, observation or finding, source, date and next check. Mark estimates and inferences explicitly. If two sources disagree, retain both until you understand their different dates, definitions or coverage. A missing listing is not proof of an empty market, and an unanswered question is not a neutral result.",
            "Put the most decision-relevant findings first. For example, an unconfirmed entrance arrangement may matter more than a large background population figure. Give each unresolved issue an action and a responsible person. [SiteFit's methodology](https://sitefit.co.uk/methodology) explains its approach to evidence and uncertainty. The aim of organising research is to make your judgement easier to inspect, including the reasons it might change, rather than to produce a confident-looking collection of numbers."
          ]
        },
        {
          heading: "Compare addresses using the same questions",
          paragraphs: [
            "When two units look promising, investigate the same business needs and relevant trading periods at each. Differences in research effort can otherwise look like differences between the locations. Keep route observations, customer context, alternatives and practical constraints beside each other, with uncertain answers marked consistently.",
            "Use [our commercial property comparison guide](https://sitefit.co.uk/blog/how-to-compare-two-commercial-properties-for-your-business) to structure that review. You can also [start a Free Snapshot](https://sitefit.co.uk/check-location) for a London address and business type to put the location into context. Keep property permissions, surveys and lease advice alongside the area research; they resolve different parts of the commitment. A strong local story does not remove a premises problem, and favourable terms do not establish the right customer fit. Look at how those factors work together for your plan."
          ]
        },
        {
          heading: "Conclusion: research the journeys behind the postcode",
          paragraphs: [
            "Good catchment research explains who could realistically reach your business, how the area works and which assumptions still need checking. Combine local data with purposeful visits, current sources and a clear view of competing offers. Keep dates, geography and limitations with every important finding. Before committing, identify the uncertainty most likely to change your decision and take a concrete step to resolve it. You do not need a perfect map of future customers. You need a careful, practical account of why this address could fit your business, and what would make you reconsider it."
          ]
        }
      ]
    ),
  },
  {
    ...shared,
    id: "rates-service-charges-2026",
    slug: "business-rates-and-service-charges-commercial-property-2026",
    featured: false,
    title: "Business Rates and Service Charges: What to Check in 2026",
    excerpt: "A clear guide to current rates records, relief questions, service charge budgets and the lease obligations behind a commercial unit’s headline rent.",
    seoTitle: "Business Rates and Service Charges: What to Check in 2026",
    seoDescription: "Check business rates, the 2026 revaluation and commercial service charges. Know which documents and lease questions to review before committing.",
    ogTitle: "Business Rates and Service Charges: What to Check in 2026",
    ogDescription: "Check business rates, the 2026 revaluation and commercial service charges. Know which documents and lease questions to review before committing.",
    category: "Before the lease",
    tags: ["business-rates", "service-charges", "premises", "London"],
    featuredImage: {"src": "/images/business-rates-service-charges-premises.webp", "width": 1200, "height": 1200},
    featuredImageAlt: "Tables and customers inside a café, with board games on wooden shelves.",
    ogImage: {"src": "/images/business-rates-service-charges-premises.webp", "width": 1200, "height": 1200},
    datePublished: "2026-11-05T00:00:00Z",
    dateModified: "2026-11-05T00:00:00Z",
    cta: editorialCta,
    content: editorialContent(
      "Business rates and service charges can materially change the cost of taking a commercial unit, even when the headline rent looks manageable. They are different charges, supported by different records, so ask for each separately before you commit. For premises in England, the business rates revaluation effective from April 2026 also makes old bills a poor starting assumption. This guide explains the questions to ask about a London café, restaurant or salon, and the documents that help your advisers answer them. It is a due-diligence checklist, not a calculation of your property's bill or individual tax, financial or legal advice.",
      [
        {
          heading: "Keep rent, business rates and service charges separate",
          paragraphs: [
            "Rent is the amount agreed for occupying the premises under the lease. Business rates are a separate property tax generally charged on non-domestic premises. A service charge is a contribution towards services or costs recoverable under the lease, which may include shared-building or estate arrangements. Do not assume that one advertised figure covers all three.",
            "Start a simple schedule with a separate line for each charge. Note the period, who supplied the figure and whether it is confirmed, estimated or unknown. Ask whether quoted amounts include any applicable VAT and have your adviser check the treatment for the actual transaction. If the agent says a cost is included, request written detail identifying which cost and the relevant lease provision. The purpose is to make the commitment legible before comparing it with another unit's apparently cheaper rent."
          ]
        },
        {
          heading: "Check the current rateable value for the exact premises",
          paragraphs: [
            "Use the [official business rates valuation service](https://www.gov.uk/find-business-rates) to find the relevant property entry. Check the address, description and extent against the unit being offered. Subdivision, combined units or an upstairs area can make an approximate address match misleading. Save the entry and its date, then ask about any discrepancy rather than choosing the figure that looks most favourable.",
            "A rateable value is not the amount of the bill. Your actual liability depends on the applicable rules and circumstances, which need checking for the occupation you propose. Ask the council's business rates team how to confirm the position, and obtain specialist advice where necessary. A neighbouring business's payment or the outgoing occupier's recollection is not a substitute for establishing which rating entry and liability apply to your premises and occupation."
          ]
        },
        {
          heading: "Understand why the 2026 revaluation matters",
          paragraphs: [
            "[GOV.UK's revaluation guidance](https://www.gov.uk/guidance/help-with-the-2026-business-rates-revaluation) confirms that current rateable values took effect on 1 April 2026, using a valuation date of 1 April 2024. That makes the age of a rates document important. If a letting pack contains an older valuation or historic bill, ask for the current information before incorporating it into your decision.",
            "The revaluation does not establish whether your own bill increased, decreased or stayed similar. Check the current entry, relevant year's rules and any relief or transitional arrangements with the council or your adviser. Avoid simply carrying forward last year's payment or applying a headline percentage to the quoted rent. Record which assumptions remain open, especially if the intended occupation, layout or property description differs from the circumstances shown in the documents you have received."
          ]
        },
        {
          heading: "Ask about relief without assuming eligibility",
          paragraphs: [
            "Reliefs and adjustments can affect the amount payable, but eligibility needs to be checked for your circumstances. [GOV.UK's business rates relief guidance](https://www.gov.uk/business-rates-relief) explains the available categories and routes to further information. Read the current rules, then ask the council what evidence it needs to assess your position. Do not assume that a seller's or previous tenant's relief continues for a new operator.",
            "Give your adviser the relevant facts about your occupation and any other premises, rather than just asking whether a unit is 'rates free'. If a relief is important to affordability, keep it as unconfirmed until you have an appropriate answer. Ask what could change the position later and which dates or actions matter. Your cost review should show the dependency clearly, so a favourable assumption does not quietly become a guaranteed saving in negotiations."
          ]
        },
        {
          heading: "Request the service charge budget and accounts",
          paragraphs: [
            "Ask for the current budget, the explanation of what it covers and available accounts or reconciliations for previous periods. Confirm whether the figure in the listing is a budget, a fixed amount, a recent actual charge or an informal estimate.",
            "Ask how the unit's share is determined and whether the building has vacant areas, changing occupancy or shared facilities that warrant further questions. The [RICS commercial service charge standard](https://www.rics.org/content/dam/ricsglobal/documents/standards/Service-charges-in-CP_2nd-ed_amended-Oct-2025.pdf), effective from 31 December 2025, provides a professional reference for transparency and management. Your lease remains central to what is recoverable. Have a solicitor or surveyor review the documents rather than treating professional guidance as a universal cap or a replacement for your agreement."
          ]
        },
        {
          heading: "Find out what is included and excluded",
          paragraphs: [
            "Ask for a practical breakdown: common-area cleaning, security, shared utilities, management costs, plant maintenance and other relevant services. Establish which items apply to this building and which are only examples. A generic agent description is not the same as the budget or lease for the unit you are considering.",
            "Then ask what sits outside that charge. Insurance contributions, repairs, business waste, utilities or other obligations may be dealt with separately. Identify who arranges each service and who pays, including any shared meters or access arrangements. If an item appears in more than one document, ask your adviser how the provisions fit together. A clear breakdown is more useful than a reassuring statement that the charge is 'normal for the area'."
          ]
        },
        {
          heading: "Ask about major works and uncertain future costs",
          paragraphs: [
            "Request information about proposed or discussed works that could affect the building or services. Ask about the nature of the work, its current status, any available estimates and whether the proposed lease could make you responsible for a share. Keep a distinction between a confirmed project and an informal possibility. Neither should disappear from the decision file.",
            "Ask your solicitor or surveyor to explain any reserve or sinking-fund provisions and how caps, exclusions or other negotiated terms would operate in this lease. Do not assume that a low current budget limits every later demand. Equally, an unanswered question about works is not evidence that a large bill is inevitable. Record the uncertainty, the person expected to answer it and the document or advice needed before you can judge its effect on the commitment."
          ]
        },
        {
          heading: "Put the charges beside the condition and lease terms",
          paragraphs: [
            "Costs make more sense when you understand the premises and your obligations. A repair provision, an alteration requirement or responsibility for a shared system can matter as much as the annual figures in a letting pack. Arrange the appropriate survey and ask your advisers to connect their findings with the lease wording.",
            "For a former food business, [our takeover checklist](https://sitefit.co.uk/blog/taking-over-cafe-restaurant-premises-checklist) helps identify equipment, extraction and handover questions. For any unit, distinguish initial works and deposits from continuing costs. Keep proposed figures and quotations labelled, with their scope and dates. A location that looks promising still needs a manageable property commitment; a manageable commitment still needs a credible customer case. Comparing both together is useful, provided neither is used to excuse missing evidence about the other."
          ]
        },
        {
          heading: "Compare units on a consistent basis",
          paragraphs: [
            "Use the same period and cost headings for every shortlisted property. Record rent, the confirmed or unresolved rates position, service charges, insurance contributions and other relevant obligations. Keep differences in evidence visible: an estimate for one unit should not look as reliable as a documented figure for another. Ask your accountant to assess the wider affordability of the proposed business using appropriate assumptions.",
            "You can use [our property comparison guide](https://sitefit.co.uk/blog/how-to-compare-two-commercial-properties-for-your-business) to organise the location questions alongside that review. [SiteFit's Free Snapshot](https://sitefit.co.uk/check-location) puts a London address and business type into context while your advisers verify property costs and terms. Before agreeing, identify which unresolved amount or obligation could change your decision most, then pursue that specific answer. A consistent comparison should make uncertainty easier to see, not hide it inside a single total."
          ]
        },
        {
          heading: "Conclusion: ask for the figures behind the rent",
          paragraphs: [
            "Before taking a commercial unit, establish the current rates position, understand the service charge documents and have the lease obligations reviewed. The 2026 revaluation makes document dates especially relevant, while relief eligibility and recoverable building costs need their own checks. Keep every figure attached to its period, source and level of certainty. Where an answer is missing, name the next action instead of guessing. This gives you a clearer basis for negotiations and helps you assess whether the property commitment fits the business you intend to run, before an attractive headline rent becomes an expensive assumption."
          ]
        }
      ]
    ),
  },
  {
    ...shared,
    id: "best-london-areas-coffee-shops-cafes-bars-delis",
    slug: "best-london-areas-coffee-shops-cafes-bars-delis",
    title: "Best London Areas for Coffee Shops, Cafés, Bars and Delis",
    seoTitle: "Best London Areas for Coffee Shops, Cafés, Bars and Delis",
    excerpt: "Compare London neighbourhoods for coffee shops, cafés, bars and delis, with practical checks on customers, trading hours, premises and costs.",
    seoDescription: "Compare London neighbourhoods for coffee shops, cafés, bars and delis, with practical checks on customers, trading hours, premises and costs.",
    ogTitle: "Best London Areas for Coffee Shops, Cafés, Bars and Delis",
    ogDescription: "Compare London neighbourhoods for coffee shops, cafés, bars and delis, with practical checks on customers, trading hours, premises and costs.",
    featuredImage: {"src":"/images/london-hospitality-area-guide.webp","width":1200,"height":1200},
    ogImage: {"src":"/images/london-hospitality-area-guide.webp","width":1200,"height":1200},
    featuredImageAlt: "Café frontage with a pavement menu board, a wooden bench and plants in the window.",
    featured: false,
    category: "Choosing a location",
    tags: ["coffee-shop","location","London"],
    datePublished: "2026-11-13T00:00:00Z",
    dateModified: "2026-11-13T00:00:00Z",
    cta: editorialCta,
    content: editorialContent(
      "The best London area for a coffee shop, café, bar or deli depends on when people would visit and what they would come for. A morning espresso counter needs a quick stop on an existing journey. A neighbourhood café needs people with time to sit down. A bar needs a credible evening trade and premises that can support it. A deli may rely on people coming back for their weekly shop. This guide gives you a London shortlist for each format and shows how to narrow it to properties worth viewing. The examples are starting points for research, rather than recommendations to sign a lease in a particular neighbourhood.",
      [
        {
          "heading": "Start with the visit you want to earn",
          "paragraphs": [
            "Describe one ordinary visit before opening the listings. A takeaway customer wants to see the menu, order and get back on their way. A parent meeting a friend may want room for a buggy, a loo and somewhere to sit. An evening guest may plan the visit around dinner or a train home. Those are three different reasons to choose a premises, even when the customers live on the same road.",
            "Write down two visits that could sustain your business on an ordinary day. For a deli, that could be a midweek lunch and a Saturday shop for dinner. Then decide which visit needs to happen most reliably. When comparing areas, look for a route, an hour and a reason to stop that fit that visit. A single busy hour can be useful, but it cannot answer for the rest of the week."
          ]
        },
        {
          "heading": "Coffee shops: test the morning route",
          "paragraphs": [
            "Start with the streets around London Bridge or Liverpool Street if your idea is a compact counter serving people on their way to work. These are examples of station districts to investigate. The decision is whether the door sits on a route your customers actually take. The far side of a junction can have a very different relationship with a station exit, even when both units are advertised as a two minute walk away.",
            "Visit before the time you plan to open. Walk from the station to several obvious destinations and repeat the journey in reverse. Watch where people can see a menu without slowing everyone behind them, and where a queue could stand without blocking the pavement. If the unit only makes sense when the morning is exceptionally busy, investigate a second trading period before relying on it. For the premises checks, use [our London coffee shop location guide](https://sitefit.co.uk/blog/how-to-choose-a-coffee-shop-location-in-london)."
          ]
        },
        {
          "heading": "Cafés: look for ordinary repeat visits",
          "paragraphs": [
            "Put parts of Stoke Newington, Crouch End and Herne Hill on the first map if you want to test a neighbourhood café with seating. The aim is to see whether people already combine a local errand, a walk or a regular meeting with enough time to stop. Ask which surrounding streets provide those journeys and how straightforward it is to reach the front door. A nice looking stretch of shops is useful only when you can explain who would come back and when.",
            "Check both a weekday and a Saturday. Notice whether there is room to wait, whether seated customers and takeaway customers would get in each other's way, and whether the layout allows staff to clear tables and serve comfortably. An all day menu introduces storage, preparation and cleaning requirements. Check those early rather than drawing a floor plan around the number of tables that happened to be there at the viewing."
          ]
        },
        {
          "heading": "Bars: check how the evening works",
          "paragraphs": [
            "Soho, Dalston and Peckham offer different places to investigate an evening proposition. Put a small drinks led bar and a restaurant with a bar on separate shortlists. Ask whether the evening relies on people deliberately travelling to you, passing between other venues or staying close to home. Return later than the agent's viewing slot. Check the journey back to transport, the neighbouring uses and where people would wait outside.",
            "Speak to the borough about the proposed activities and hours before relying on a listing's description. The [Home Office premises licence guidance](https://www.gov.uk/government/publications/premises-licence-application-forms/premises-licence-guidance) covers alcohol and certain other licensable activities. Ask for the actual licence and conditions if there is one. Planning, licensing and the lease each need a separate answer. SiteFit's location tools do not assess bars as a separate business type; the bar examples here are for your own research and professional checks."
          ]
        },
        {
          "heading": "Delis: test the basket as well as the lunch queue",
          "paragraphs": [
            "Start with neighbourhood shopping routes in Hampstead, Marylebone or East Dulwich if you expect a mix of food to take home and lunchtime sales. These are places to walk, rather than evidence that a deli is missing. Observe whether people naturally combine food shopping with other errands and whether they could carry a bag home easily. A lunch queue tells you little about whether people will buy cheese, bread or dinner ingredients later in the day.",
            "Decide what share of the space your proposed shelves, refrigeration and preparation would use before getting attached to the frontage. Check delivery access and where stock and packaging will go. A good window can help people understand the offer, but practical storage affects what you can keep in stock. For a food business, check [Food Standards Agency registration](https://register.food.gov.uk/new) with the relevant local authority and ask about any additional requirements for your operation."
          ]
        },
        {
          "heading": "Use area data to plan visits",
          "paragraphs": [
            "The [London High Streets Data Explorer](https://apps.london.gov.uk/high-streets-explorer/) is a place to explore area patterns in footfall and spending where figures are available. Read the geography and period before comparing results. An area measure can help you decide when to visit, but it cannot tell you how many people pass the entrance of an individual unit. [TfL open data](https://tfl.gov.uk/info-for/open-data-users/our-open-data) adds station and journey context; a station entry or exit is a transport event.",
            "Keep a simple log with the source, date, area and question you are trying to answer. For example, if a source suggests a strong daytime pattern, test a lunchtime walk at the exact property and then try the same route after work. Record separately what you saw and what you think it means. That distinction matters especially when an event, works or a service disruption made the day unusual."
          ]
        },
        {
          "heading": "Compare two properties before comparing two postcodes",
          "paragraphs": [
            "When an area looks promising, pick two actual units and make the same checks at both. Look at the approach, the nearest alternatives, the shape of the space and where deliveries and waste would go. Ask for the rateable value, service charge budget, draft lease and details of works you would be responsible for. The [SiteFit guide to business rates and service charges](https://sitefit.co.uk/blog/business-rates-and-service-charges-commercial-property-2026) explains which documents to request and why the date matters.",
            "For an existing food premises, find out what equipment is included, who owns it and whether the proposed menu works with the installation. For a new fit out, find out which consents and surveys are needed. Record open questions as open. A lower headline rent deserves a second look if there is still no answer on extraction, opening hours or a repair that could affect the timetable."
          ]
        },
        {
          "heading": "Turn the shortlist into a decision",
          "paragraphs": [
            "Give each area one sentence that explains why it made your list. Then write the strongest reason it might fail. A commuter street may work on the way into the station but feel empty in your proposed second trading period. A neighbourhood unit may suit a seated café while giving very little room for a counter queue. If the biggest uncertainty is the proposed trading hours, ask the council and landlord about those hours specifically.",
            "Choose the next action that could actually change the decision. That could be a return visit in the rain, a walk from a different station exit or a request for the full service charge accounts. The [ten streets guide](https://sitefit.co.uk/blog/london-coffee-shop-streets-2026) gives coffee operators a starting list. If you have a London coffee shop or restaurant address in mind, [check the location](https://sitefit.co.uk/check-location) to put the surroundings into context before taking the property checks further."
          ]
        },
        {
          "heading": "Conclusion: choose the routine before the area",
          "paragraphs": [
            "Shortlist station routes for quick coffee, neighbourhood errands for cafés and delis, and genuine evening journeys for bars. Then see which specific door can serve that routine within the hours, costs and permissions the business needs. Use area data to choose the questions and times for your visits; use the actual unit, the documents and professional advice to make the commitment. A useful shortlist should leave you with fewer addresses and a clearer idea of what would make you walk away."
          ]
        }
      ],
    ),
  },
  {
    ...shared,
    id: "london-coffee-shop-streets-2026",
    slug: "london-coffee-shop-streets-2026",
    title: "10 London Streets to Consider for a Coffee Shop in 2026",
    seoTitle: "10 London Streets for a Coffee Shop Shortlist (2026)",
    excerpt: "Explore ten London streets for a coffee shop, with 2026 public data context and practical checks on customer routes, competition and premises.",
    seoDescription: "Explore ten London streets for a coffee shop, with 2026 public data context and practical checks on customer routes, competition and premises.",
    ogTitle: "10 London Streets to Consider for a Coffee Shop in 2026",
    ogDescription: "Explore ten London streets for a coffee shop, with 2026 public data context and practical checks on customer routes, competition and premises.",
    featuredImage: {"src":"/images/london-coffee-street-shortlist.webp","width":1200,"height":1200},
    ogImage: {"src":"/images/london-coffee-street-shortlist.webp","width":1200,"height":1200},
    featuredImageAlt: "Orange espresso bar frontage in Hampstead with two stools and a pavement sign.",
    featured: false,
    category: "Choosing a location",
    tags: ["coffee-shop","location","London"],
    datePublished: "2026-11-13T00:00:00Z",
    dateModified: "2026-11-13T00:00:00Z",
    cta: editorialCta,
    content: editorialContent(
      "If you are looking for the best street to open a coffee shop in London, begin with a shortlist you can walk. These ten streets offer different location questions, from catching a station crowd to giving neighbours a place they can come back to. The list is editorial and unranked. It uses public evidence available in November 2026 to frame the checks, including a recent update on Oxford Street. There is no comparable 2026 sales or shopfront footfall series here for all ten streets. The goal is to help you choose which premises to investigate and what to check before making an offer.",
      [
        {
          "heading": "How the shortlist works",
          "paragraphs": [
            "We picked examples with distinct reasons for a coffee stop: work journeys, local errands, market visits and trips that mix shopping with leisure. For each street, there is a proposed coffee format, a route to walk and a reason to reject an unsuitable unit. These are hypotheses to test. The numbers help you navigate the list and do not indicate performance or relative quality.",
            "Use [GLA high street boundaries and open data](https://data.london.gov.uk/high-street-data-service/open-data) to check how an area is defined, and [TfL's open data](https://tfl.gov.uk/info-for/open-data-users/our-open-data) for transport context. Write down each figure's period and what it counts. A number published in 2026 can describe an earlier period, and neither a station total nor spending across a shopping district is a count of coffee customers at a door."
          ]
        },
        {
          "heading": "1. Borough High Street, Southwark",
          "paragraphs": [
            "Investigate a quick counter for morning and lunchtime trade. Walk from London Bridge towards Borough, then approach your unit from the opposite direction. Check whether the crossing you naturally use puts you on the right side of the road, and whether you can spot the entrance in time to change course. Walk it again at lunch when there may be a different reason to stop.",
            "A location near the market can bring a different sort of visit from an office trip. Compare the weekday and weekend rather than assuming one predicts the other. If customers would have to double back or stand awkwardly outside to order, that is a practical reason to compare another frontage."
          ]
        },
        {
          "heading": "2. Brushfield Street, Spitalfields",
          "paragraphs": [
            "Test a compact coffee shop with a distinct reason to stop on the way between Liverpool Street and Spitalfields Market. Try the walk from more than one exit and note where people turn into the market or towards their next destination. Check whether you would be competing with businesses already on that route before people see your door.",
            "Separate weekday breakfast from weekend browsing. Those visits may call for different service speeds and different use of the space. If you would need seats to make the weekend offer work, check the floor plan before assuming a narrow counter unit can do both jobs."
          ]
        },
        {
          "heading": "3. Exmouth Market, Clerkenwell",
          "paragraphs": [
            "Compare a small sit down café and a takeaway counter on the same stretch. Visit before lunch and again after it. Look at how people move between doors and whether there is a place to wait without obstructing neighbours. Check the layout in bad weather, when an outside table may not help your seating plan.",
            "A row of food businesses can give people a reason to visit and give them alternatives to your offer. Record what the closest substitutes actually serve and when. A gap in opening hours is a question to investigate, rather than proof of unserved demand."
          ]
        },
        {
          "heading": "4. Broadway Market, Hackney",
          "paragraphs": [
            "Start with a coffee and pastry proposition that has a credible weekday routine. Walk the approaches from the canal and the surrounding residential streets. Compare a regular weekday with a market day and keep the observations separate. A visitor browsing stalls has a different reason to stop from a neighbour buying a coffee on the way to work.",
            "Look at how stalls or temporary activity affect the sightline to the premises, where applicable. Ask how deliveries and waste collection would work during the hours you intend to use. If the plan only holds together on market day, treat that dependency as a risk to investigate before pricing the lease."
          ]
        },
        {
          "heading": "5. Stoke Newington Church Street, Hackney",
          "paragraphs": [
            "Investigate a neighbourhood café with a mix of short visits and sit down trade. Pick a stretch and walk it from the side streets as well as along the main road. Note whether people could easily find the entrance from the nearest crossing and whether the pavement outside can accommodate a queue.",
            "Check the route at the times you would open, then look at what a repeat customer can already buy nearby. Give yourself a clear reason someone might choose your offer, such as a quicker visit or a menu that suits the time of day. Treat that reason as something to validate, rather than as a sales forecast."
          ]
        },
        {
          "heading": "6. Hampstead High Street, Camden",
          "paragraphs": [
            "Compare a compact espresso bar with a small café where people can linger. Walk downhill and uphill from the Tube and see which doors you notice from each direction. The gradient, steps and available space at the entrance are worth inspecting in person, particularly if your plan depends on easy access or outdoor seating.",
            "Try a weekday morning and a weekend afternoon. Look for a plausible local repeat visit as well as a leisure visit. Before paying for an attractive frontage, confirm what can be changed and what is included in the lease. A small space can work for fast service, provided the queue, counter and storage fit the plan."
          ]
        },
        {
          "heading": "7. Marylebone High Street, Westminster",
          "paragraphs": [
            "Look for a coffee offer that fits a shopping trip, a local appointment or a short work break. Choose a particular block rather than treating the whole street as one location. Walk from both directions and note where people stop, cross or turn away before reaching the unit.",
            "Check how easily a customer could see prices and decide whether to come in. Inside, test whether a queue and seated service would share the room comfortably. Ask for the rates and service charge documents alongside the rent. If a high occupancy cost needs consistently strong trade, the burden is on your own evidence to support that assumption."
          ]
        },
        {
          "heading": "8. Lordship Lane, East Dulwich",
          "paragraphs": [
            "Consider a local coffee shop where customers could combine a visit with everyday errands. Because this is a long road, choose a short stretch around an actual unit and draw the approach on a map. Compare the two sides, including where people can cross and how far they have to walk from a bus stop.",
            "Return on an ordinary weekday after the first rush. Test the case for a second useful trading period, whether that is takeaway lunch or a quieter seated visit. Record the operational limits too: delivery access, food preparation, storage and the position of the door can all change the kind of shop the unit can support."
          ]
        },
        {
          "heading": "9. Brixton Station Road, Lambeth",
          "paragraphs": [
            "Investigate a quick coffee offer that could work alongside a station or market trip. Walk the connection from Brixton Road and check where your proposed customers turn. A unit near a station on a map may sit off the easiest path, so watch the actual approach rather than counting everyone entering the station as part of your audience.",
            "Compare a weekday rush with a different trading window. Check the nearby choices for a quick drink and how long you expect your own service to take. If the premises only works with a queue outside, find out who controls that space and what is allowed before relying on it."
          ]
        },
        {
          "heading": "10. Oxford Street, Westminster",
          "paragraphs": [
            "Oxford Street belongs on a 2026 watchlist because its routes are changing. [City Hall's 9 November update](https://www.london.gov.uk/overwhelmingly-positive-impact-first-week-oxford-street-pedestrianisation-hailed-mayor-london-sadiq) reported that aggregate spending rose 12% in the first week compared with the previous week. That short comparison does not isolate coffee sales, establish the cause of the change or tell you how any particular door performed.",
            "Walk the block you are considering and compare it with a nearby side street. Check crossing routes, delivery arrangements and any transitional street works. Keep the broader spending figure as context for the visit. An independent operator still needs to make the case for a particular unit at its actual cost."
          ]
        },
        {
          "heading": "Conclusion: make the shortlist earn a viewing",
          "paragraphs": [
            "Pick three streets that fit your intended customer visit, then compare actual units at matching times. Record the approach, alternatives, practical limits and full occupancy costs. Ask which missing answer would make you walk away, and resolve that one first. For a wider choice of neighbourhood and trading format, read [our London areas guide](https://sitefit.co.uk/blog/best-london-areas-coffee-shops-cafes-bars-delis). Once you have an address, [check the location](https://sitefit.co.uk/check-location) for local context and take the property documents to the appropriate advisers before committing."
          ]
        }
      ],
    ),
  },
  {
    ...shared,
    id: "free-restaurant-location-analysis-london",
    slug: "free-restaurant-location-analysis-london",
    title: "Free Restaurant Location Analysis in London",
    seoTitle: "Free Restaurant Location Analysis in London",
    excerpt: "Check a London restaurant address for free and learn how to use the result to assess customer routes, nearby alternatives and what to verify before signing.",
    seoDescription: "Check a London restaurant address for free and learn how to use the result to assess customer routes, nearby alternatives and what to verify before signing.",
    ogTitle: "Free Restaurant Location Analysis in London",
    ogDescription: "Check a London restaurant address for free and learn how to use the result to assess customer routes, nearby alternatives and what to verify before signing.",
    featuredImage: {"src":"/images/free-restaurant-location-london.webp","width":1200,"height":1200},
    ogImage: {"src":"/images/free-restaurant-location-london.webp","width":1200,"height":1200},
    featuredImageAlt: "Restaurant dining room with white tablecloths, a chalkboard menu and diners seated at several tables.",
    featured: false,
    category: "Choosing a location",
    tags: ["restaurant","location","London"],
    datePublished: "2026-11-14T00:00:00Z",
    dateModified: "2026-11-14T00:00:00Z",
    cta: editorialCta,
    content: editorialContent("If you have found a restaurant unit in London, you can start checking the location before paying for a full report or agreeing a lease. Enter the commercial address in SiteFit, choose Restaurant and start a Free Snapshot. You do not need an account, a card or financial figures to begin. The point is to get a first view of the location and decide what to investigate next. This guide shows how to make that first check useful, how to read the result and where you still need a site visit, documents or professional advice.",
      [
        {
          "heading": "What a free restaurant location analysis is for",
          "paragraphs": [
            "A location check helps you decide whether an address merits more time. That could mean arranging a second viewing, walking the area after dark or asking the agent a question before spending money on a survey. Start with the decision you are trying to make. If you already have a shortlist, the useful question may be which of two units is worth investigating first. If you have only seen the listing, you may simply want to know whether there is a plausible customer journey to the door.",
            "Treat the result as a starting point. It cannot tell you how many covers you will serve, what your takings will be or whether the landlord will agree to your plans. If you are still deciding which neighbourhoods to explore, start with [our guide to choosing a restaurant location in London](https://sitefit.co.uk/blog/how-to-choose-a-restaurant-location-in-london), then return once you have a specific address."
          ]
        },
        {
          "heading": "How to check a London restaurant address for free",
          "paragraphs": [
            "Open [Check a Location](https://sitefit.co.uk/check-location), enter the postcode or commercial address and select the right premises from the results. Be careful with units that share a postcode, entrances on the side of a building and listings that describe a whole building when only the ground floor is available. If you cannot tell which unit is being offered, ask the agent for the exact address and floor before relying on the comparison.",
            "Choose Restaurant and start the Free Snapshot. SiteFit’s analysis covers London; being able to enter a UK address does not mean the analysis is available everywhere. Keep the listing and floor plan handy so you can compare the location findings with what the unit actually offers. There is no need to decide your final menu before you start, but it helps to know whether you are mainly considering weekday lunch, evening dining or a mix."
          ]
        },
        {
          "heading": "Read the result against an ordinary service",
          "paragraphs": [
            "Picture the service you expect to repeat every week. A quick weekday lunch spot needs people who can get to the door, order and eat within the time they have. A neighbourhood restaurant that takes bookings needs customers to find it easily and make the journey at dinner time. A room that feels close to an office district on a map may be a poor fit for evening trade if your customers would need to cross a road or walk away from the route they normally use.",
            "Read the available customer, competition and access context with that service in mind. If an observation looks promising, ask what would have to be true for it to help you. Nearby workplaces may be relevant to lunch, for instance, but they do not tell you how often people eat out or whether they would choose your menu. Write down one assumption you can investigate on your next visit."
          ]
        },
        {
          "heading": "Check the route, not just the distance",
          "paragraphs": [
            "Start at a nearby station, bus stop or street you think customers will use and walk all the way to the entrance. Repeat the approach from another direction. Notice the crossing, the visibility of the door and where someone might turn off before reaching you. When looking at evening trade, walk the route at the relevant hour too. Think about the journey home and how easy it is to find the entrance when some neighbouring businesses are shut.",
            "[TfL’s journey planner](https://tfl.gov.uk/plan-a-journey/) can help you plan the trip. The journey on the screen and the journey on the pavement are different checks. A station count would describe transport activity; it would not tell you how many people pass your door. If you take a short manual count, keep the exact place, time and day with it. [Our footfall guide](https://sitefit.co.uk/blog/does-high-footfall-mean-a-good-business-location) explains why a busy road can still be a poor match."
          ]
        },
        {
          "heading": "See what customers can choose instead",
          "paragraphs": [
            "Make a short list of the places that could serve the same occasion. If your proposed restaurant sells a quick lunch, the alternatives might include a bakery, a takeaway and a supermarket meal deal as well as other restaurants. For a Saturday dinner, the useful comparison may be with venues people book in advance. Note the menu, advertised prices, opening hours and the route to the door. Check anything important in person if a listing looks out of date.",
            "Nearby businesses can bring people to a street and give them other places to spend their money. What matters is whether you have a credible reason for someone to choose you. If you think there is a gap for a certain meal or time of day, look for evidence of the visit itself. Finding nobody selling a particular dish does not establish that people are looking for it."
          ]
        },
        {
          "heading": "Give the premises its own checklist",
          "paragraphs": [
            "A promising location still needs a unit that works for the operation. Before relying on the layout, ask what is included, what needs replacing and whether the kitchen can support your proposed menu. Check where deliveries arrive and where waste, stock and cleaning equipment would go. A former restaurant might already have extraction, but its presence does not establish that it is suitable, in good condition or authorised for your proposed use. Ask for records and arrange appropriate specialist checks.",
            "Confirm planning, lease consent and licensing separately with the relevant advisers and council. Explain the proposed hours, cooking, seating and any delivery or collection activity. [Our Class E guide](https://sitefit.co.uk/blog/class-e-planning-use-cafe-restaurant) explains why the description in a listing is only the start of that conversation. A free location result cannot settle these questions or tell you that you can open."
          ]
        },
        {
          "heading": "Compare the cost of two real units",
          "paragraphs": [
            "If you have two addresses, start a separate check for each and visit them at comparable times. Use the same questions: who could come for the service you plan, how they reach the door, what else they can choose and what could make the premises difficult to operate. Leave gaps visible. A lower rent is less useful if you still do not know what you would spend fitting out the kitchen or what the lease says about repairs.",
            "Ask for current rates information and the service charge documents, then have the terms reviewed. [Our guide to business rates and service charges](https://sitefit.co.uk/blog/business-rates-and-service-charges-commercial-property-2026) explains what to request. The free check puts the location in context; ask your advisers to help assess the occupancy costs and your accountant to review the assumptions behind the business plan. Keep the figures and their sources beside the location notes so you can tell which parts are still estimates."
          ]
        },
        {
          "heading": "When is the free check enough?",
          "paragraphs": [
            "The Free Snapshot can be enough to decide whether an address deserves a closer look. If it points to a question about access, walk the route. If you see a possible lunch opportunity but have only visited on a Saturday, go back before making much of it. An unanswered question is a reason to get better evidence, especially if the answer could stop the business from operating as planned.",
            "If the address stays on the shortlist and you want more detail, the optional [Full Report](https://sitefit.co.uk/pricing) is a separate one-off purchase. It can help you explore the available evidence and prioritise checks. You may already know the next useful move, such as getting the lease or checking the extraction. In that case, do that first. The right amount of research depends on the decision you still need to make."
          ]
        },
        {
          "heading": "Conclusion: use the free result to choose your next check",
          "paragraphs": [
            "Start with the exact property, select Restaurant and read the result against the kind of service you want to run. Walk the customer route, compare the real alternatives and check that the premises, permissions and costs fit your plan. Before committing, name the one missing answer most likely to change your decision. That could be a question for the council, the landlord or another visit. A good first check leaves you with a clearer idea of whether to keep looking at that unit and what evidence would justify the next step."
          ]
        }
      ],
    ),
  },
];
