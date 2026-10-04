import type { ReactNode } from "react";
export type IconName =
  | "pin"
  | "demand"
  | "shop"
  | "access"
  | "shield"
  | "document"
  | "cost"
  | "coffee"
  | "restaurant"
  | "hair"
  | "beauty"
  | "search"
  | "check"
  | "clock"
  | "evidence";
const drawings: Record<IconName, ReactNode> = {
  pin: (
    <>
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  demand: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 2 4v2" />
    </>
  ),
  shop: (
    <>
      <path d="m4 3-2 6h20l-2-6ZM3 9v3a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9M4 15v6h16v-6M9 21v-6h6v6" />
    </>
  ),
  access: (
    <>
      <rect x="5" y="2" width="14" height="16" rx="4" />
      <path d="M5 9h14M12 2v7M8 21l2-3m6 3-2-3" />
      <circle cx="9" cy="14" r=".7" />
      <circle cx="15" cy="14" r=".7" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z" />
      <path d="M12 7v5m0 4v.1" />
    </>
  ),
  document: (
    <>
      <path d="M14 2H5v20h14V7ZM14 2v5h5M8 11h8m-8 4h8m-8 4h4" />
    </>
  ),
  cost: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v5c0 4 16 4 16 0V5M4 10v5c0 4 16 4 16 0v-5M4 15v4c0 4 16 4 16 0v-4" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM17 9h2a3 3 0 0 1 0 6h-2M3 23h16M7 2v3m4-3v3m4-3v3" />
    </>
  ),
  restaurant: (
    <>
      <path d="M5 2v7a3 3 0 0 0 6 0V2M8 2v20M19 2c-4 3-4 9 0 10v10m0-20v10" />
    </>
  ),
  hair: (
    <>
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="m7 15 11-13M17 15 6 2" />
    </>
  ),
  beauty: (
    <>
      <path d="M12 21C4 21 1 16 2 10c5 0 9 3 10 11Zm0 0c8 0 11-5 10-11-5 0-9 3-10 11Zm0-18c-5 5-5 10 0 15 5-5 5-10 0-15Z" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="m15 15 6 6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  evidence: (
    <>
      <path d="M4 21V10h4v11m2 0V6h4v15m2 0V2h4v19" />
    </>
  ),
};
export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {drawings[name]}
    </svg>
  );
}
