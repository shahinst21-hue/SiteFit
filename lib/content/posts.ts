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
    id: "first-viewing",
    slug: "questions-for-your-first-commercial-property-viewing",
    featured: true,
    title: "A better first viewing starts with better questions.",
    excerpt:
      "Take a practical checklist to your next commercial viewing. Separate what you can see from what you still need to verify.",
    seoTitle: "Questions for your first commercial property viewing",
    seoDescription:
      "A practical viewing checklist for a coffee shop, restaurant or salon: capture observations, ask clear questions and record what still needs verification.",
    ogTitle: "A better first viewing starts with better questions.",
    ogDescription:
      "A practical checklist for the space you might call your own.",
    category: "Before the lease",
    tags: ["viewings", "due-diligence"],
    featuredImage: { src: "/images/shopfront.svg", width: 1200, height: 760 },
    content: [
      {
        type: "paragraph",
        content: [
          text(
            "A viewing is a chance to collect questions as well as impressions. The space might feel right, but the details that matter to your business deserve a separate note. This is a starting checklist, not an assessment of a particular property or professional advice.",
          ),
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Start with how you would use the space",
      },
      {
        type: "paragraph",
        content: [
          text(
            "Imagine an ordinary working day: a customer arriving, a delivery being unloaded, a member of staff setting up. Where would each activity happen? ",
          ),
          {
            type: "text",
            text: "Write down the assumptions you are making.",
            bold: true,
          },
        ],
      },
      {
        type: "list",
        ordered: false,
        items: [
          [text("Where would customers enter, wait and move around?")],
          [
            text(
              "What space would you need for storage, preparation and staff?",
            ),
          ],
          [text("How would deliveries, waste collection and access work?")],
          [text("Which alterations would your planned use need?")],
        ],
      },
      {
        type: "image",
        image: { src: "/images/viewing-notes.svg", width: 1200, height: 600 },
        alt: "Illustrative notebook showing three headings: observed, ask, and verify.",
        caption:
          "Keep observations, questions and assumptions separate in your viewing notes.",
      },
      {
        type: "heading",
        level: 2,
        text: "Ask for the details behind the headline rent",
      },
      {
        type: "paragraph",
        content: [
          text(
            "Ask the landlord or agent which costs, responsibilities and restrictions need your attention. Take the answers to a suitably qualified adviser before relying on them. A verbal answer and a verified document are different kinds of information.",
          ),
        ],
      },
      {
        type: "table",
        caption: "Questions to take to the viewing",
        headers: ["Topic", "A useful question"],
        rows: [
          [
            "Costs",
            "Which costs sit alongside the rent, and which figures are still estimates?",
          ],
          [
            "Condition",
            "What is included, and who would be responsible for repairs or alterations?",
          ],
          [
            "Use",
            "What documents and permissions should my adviser check for my intended use?",
          ],
          [
            "Timing",
            "What would need to happen before I could occupy the space?",
          ],
        ],
      },
      {
        type: "callout",
        heading: "An unanswered question is still useful information.",
        content: [
          text(
            "Mark it as unknown. Decide who can answer it and what evidence would make you comfortable relying on the answer.",
          ),
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Leave with a short list of next checks",
      },
      {
        type: "list",
        ordered: true,
        items: [
          [text("Save your own observations and the date of the visit.")],
          [text("List the documents or explanations you have been promised.")],
          [text("Record what needs a second visit or professional review.")],
        ],
      },
      {
        type: "paragraph",
        content: [
          text("For the way SiteFit approaches uncertainty, read "),
          { type: "link", text: "our methodology", href: "/methodology" },
          text(". You can also read about "),
          {
            type: "link",
            text: "separating evidence from assumptions",
            href: "/blog/what-you-know-and-what-you-still-need-to-check",
          },
          text("."),
        ],
      },
      { type: "cta", cta },
    ],
  },
  {
    ...shared,
    id: "unknowns",
    slug: "what-you-know-and-what-you-still-need-to-check",
    featured: false,
    title: "What you know. What you still need to check.",
    excerpt:
      "A simple way to organise location research without turning a promising impression into a certainty.",
    seoTitle: "Separate location evidence from assumptions",
    seoDescription:
      "Organise commercial location research into observations, estimates and unknowns, with practical questions to take into your next viewing.",
    ogTitle: "What you know. What you still need to check.",
    ogDescription:
      "Keep uncertainty visible while investigating a commercial space.",
    category: "Research notes",
    tags: ["evidence", "due-diligence"],
    featuredImage: {
      src: "/images/viewing-notes.svg",
      width: 1200,
      height: 600,
    },
    featuredImageAlt:
      "Illustrative notebook with separate sections for observations, questions and information to verify.",
    content: [
      {
        type: "paragraph",
        content: [
          text(
            "A busy street, a vacant unit and a helpful agent can all shape a first impression. They do not answer every question about opening a business there. A useful research note makes the boundary between evidence and assumption easy to see.",
          ),
        ],
      },
      { type: "heading", level: 2, text: "Give each note a source" },
      {
        type: "paragraph",
        content: [
          text(
            "Record where information came from, when you collected it and what it actually describes. An area-level statistic and a note from a short viewing describe different things. Neither should quietly become a claim about sales at one unit.",
          ),
        ],
      },
      {
        type: "quote",
        text: "What would I need to see before relying on this?",
        attribution: "A question for your research notes",
      },
      { type: "heading", level: 2, text: "Keep estimates visible" },
      {
        type: "paragraph",
        content: [
          text(
            "If a cost or assumption is an estimate, label it. If you do not have a figure, leave it blank. ",
          ),
          {
            type: "text",
            text: "Missing is different from zero.",
            emphasis: true,
          },
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Three useful headings for your notes",
      },
      {
        type: "list",
        ordered: false,
        items: [
          [text("Observed: what you saw or what a named source states.")],
          [text("Estimated: an assumption with a method and limitations.")],
          [text("Unknown: the question still waiting for a reliable answer.")],
        ],
      },
      {
        type: "callout",
        heading:
          "Research supports a decision; it does not guarantee an outcome.",
        content: [
          text(
            "Take unresolved lease, property and financial questions to the appropriate qualified adviser. A location report cannot replace those checks.",
          ),
        ],
      },
      {
        type: "paragraph",
        content: [
          text("See "),
          {
            type: "link",
            text: "what the planned report includes",
            href: "/how-it-works#report",
          },
          text(" or start with our "),
          {
            type: "link",
            text: "first-viewing questions",
            href: "/blog/questions-for-your-first-commercial-property-viewing",
          },
          text("."),
        ],
      },
    ],
  },
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
];
