import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/lib/site-config";

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function ButtonLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`button ${secondary ? "button-secondary" : "button-primary"}`}
    >
      {children}
      <Arrow />
    </Link>
  );
}
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <div className="intro-copy">{children}</div>
    </div>
  );
}
export function ClosingCTA() {
  return (
    <section className="closing-cta">
      <div>
        <p className="eyebrow">YOUR NEXT SPACE DESERVES A CLOSER LOOK</p>
        <h2>
          Start with the address.
          <br />
          Know what to check.
        </h2>
        <p>
          Start with the location and business type for your coffee shop,
          restaurant or salon.
        </p>
      </div>
      <ButtonLink href="/check-location">Check a Location</ButtonLink>
    </section>
  );
}
export function Wordmark() {
  return (
    <span className="wordmark">
      <span className="wordmark-symbol" aria-hidden="true">
        s<span>f</span>
      </span>
      {site.name}
      <span className="wordmark-dot" aria-hidden="true">
        .
      </span>
    </span>
  );
}
