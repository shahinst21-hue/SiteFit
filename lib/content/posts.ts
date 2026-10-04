import type { BlogPost, ContentCTA, Inline } from "./model.ts";

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
];
