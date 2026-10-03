export const site = {
  name: "SiteFit",
  tagline: "Check a commercial location before you commit.",
  currency: "GBP",
  pricing: { snapshot: 0, fullReport: 2900 }, // Minor units; initial pricing assumption.
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
      "Investigate a London commercial location before signing a lease. Explore SiteFit's planned Free Snapshot and Single Location Due Diligence Report.",
  },
  {
    path: "/how-it-works",
    title: "How it works",
    description:
      "From a property address to the questions worth asking: see the planned SiteFit journey and explore the location checker.",
  },
  {
    path: "/pricing",
    title: "Pricing",
    description:
      "Explore the planned Free Snapshot and one-off Full Report. Clear initial pricing, with no subscriptions or payments available in this preview.",
  },
  {
    path: "/check-location",
    title: "Check a Location",
    description:
      "Prepare a commercial address, business type and optional costs in the SiteFit location checker. Reports are not available yet.",
  },
  {
    path: "/login",
    title: "Login",
    description:
      "Account access is coming to SiteFit. Explore the public location-checking journey while sign-in is unavailable.",
  },
  {
    path: "/methodology",
    title: "Our methodology",
    description:
      "Understand SiteFit's approach to sources, estimates, unknowns and practical checks before committing to a commercial lease.",
  },
  {
    path: "/contact",
    title: "Contact",
    description:
      "Find answers about the SiteFit preview, availability and planned support for commercial location checks.",
  },
  {
    path: "/privacy",
    title: "Privacy",
    description:
      "Read the development privacy notice for the SiteFit preview, including how the frontend handles information you enter.",
  },
  {
    path: "/terms",
    title: "Terms",
    description:
      "Read the development terms for exploring SiteFit's public preview. Live reports, accounts and purchases are not available.",
  },
  {
    path: "/blog",
    title: "The SiteFit Journal",
    description:
      "Practical reading for your next commercial space: viewing questions, evidence and the gaps to investigate before signing a lease.",
  },
] as const;
