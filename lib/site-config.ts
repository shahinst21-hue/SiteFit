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
      "Enter a UK address and business type. London analysis offers a Free Snapshot and deeper Full Report evidence; financial planning is separate.",
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
      "Sign in securely to your SiteFit account with a one-time email link. No password required.",
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
      "Understand how SiteFit handles location entries, optional financial details, account information and session cookies.",
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
      "Explore a clearly labelled fictional SiteFit report: key opportunities, risks, evidence and practical lease questions.",
  },
] as const;
