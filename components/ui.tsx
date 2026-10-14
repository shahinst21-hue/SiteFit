import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Icon } from "./icon";

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <Icon name="arrow" className={className} />
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
        <p className="eyebrow">BEFORE YOU SIGN</p>
        <h2>
          Found your next premises?
          <br />
          Start with a free check.
        </h2>
        <p>
          Enter your London property and business type. No account or card
          needed for your Free Snapshot.
        </p>
      </div>
      <ButtonLink href="/check-location">Check a Location</ButtonLink>
    </section>
  );
}
export function Wordmark() {
  return (
    <Image
      className="wordmark"
      src="/brand/sitefit-wordmark.svg"
      alt="SiteFit"
      width={4094}
      height={927}
      priority
    />
  );
}
