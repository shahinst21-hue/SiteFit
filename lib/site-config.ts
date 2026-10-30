export const site = {
  name: "SiteFit",
  tagline: "Check a commercial location before you commit.",
  currency: "GBP",
  pricing: { snapshot: 0, fullReport: 2900 }, // Minor units; centrally configured product pricing.
} as const;

export function formatPrice(minorUnits: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: site.currency,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

export const publicPages = [
  {
    path: "/",
    title: "Check a commercial location before you commit",
    description:
      "Assess a London commercial location before committing to a lease. Understand customer context, competition, access, premises and available rental evidence.",
  },
  {
    path: "/how-it-works",
    title: "How it works",
    description:
      "Check a London property for your coffee shop, restaurant or salon. Start free, then explore strengths, risks and priority checks in the Full Report.",
  },
  {
    path: "/pricing",
    title: "Pricing",
    description:
      "Compare the £0 Free Snapshot with a £29 one-off Full Report: prioritised risks, business context, evidence and practical next checks.",
  },
  {
    path: "/check-location",
    title: "Check a Location",
    description:
      "Enter a UK commercial property address and choose your business type. Start a Free Snapshot without an account or financial inputs.",
  },
  {
    path: "/login",
    title: "Login",
    description:
      "Sign in with Google or a one-time email link to revisit your saved SiteFit Snapshots and Full Reports.",
  },
  {
    path: "/methodology",
    title: "Our methodology",
    description:
      "Understand how SiteFit distinguishes evidence, estimates and AI interpretation, and keeps important limitations visible.",
  },
  {
    path: "/contact",
    title: "Contact",
    description:
      "Find answers about location checks, report evidence and SiteFit accounts before assessing a commercial property.",
  },
  {
    path: "/privacy",
    title: "Privacy",
    description:
      "Read SiteFit privacy information covering location checks, account details, purchases and cookies.",
  },
  {
    path: "/terms",
    title: "Terms",
    description:
      "Read SiteFit service information, sample report limitations and guidance on responsible commercial-property decisions.",
  },
  {
    path: "/blog",
    title: "The SiteFit Journal",
    description:
      "Practical guidance for a commercial lease: viewing questions, location evidence and the checks that matter before signing.",
  },
  {
    path: "/sample-report",
    title: "Sample Report",
    description:
      "Explore an interactive fictional SiteFit Full Report: recommendation, catchment, competition, risks, actions and sample PDF downloads.",
  },
] as const;
