import Image from "next/image";
import { Icon } from "./icon";

const topics = [
  { icon: "demand", title: "Demand", detail: "Customers & occasions", tone: "green", filled: 5 },
  { icon: "shop", title: "Competition", detail: "Offering & position", tone: "amber", filled: 4 },
  { icon: "access", title: "Accessibility", detail: "Routes & trading hours", tone: "blue", filled: 3 },
  { icon: "shield", title: "Premises risk", detail: "Questions to verify", tone: "violet", filled: 2 },
] as const;

export function CoffeeHeroVisual() {
  return <figure className="coffee-hero-visual" aria-label="Illustrative café location analysis. The architectural scene and interface are fictional, not a property assessment.">
    <div className="coffee-hero-scene">
      <Image src="/images/coffee-shop-isometric.webp" alt="" fill priority
        sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1099px) calc(100vw - 64px), 50vw"
        className="coffee-hero-architecture" />
      <div className="coffee-hero-reach" aria-hidden="true"><i /><i /><i /></div>
      <svg className="coffee-hero-connectors" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="2"><path d="M306 245 380 370 M776 338 689 432 M273 800 332 694 M782 840 712 726" /></g>
        <g fill="currentColor">{[[380,370],[689,432],[332,694],[712,726]].map(([cx,cy])=><circle key={cx} cx={cx} cy={cy} r="6" />)}</g>
      </svg>
      <svg className="coffee-hero-location-pin" viewBox="0 0 78 100" aria-hidden="true" focusable="false">
        <path d="M39 3C19 3 3 19 3 39c0 25 36 57 36 57s36-32 36-57C75 19 59 3 39 3Z" fill="#0d1400" stroke="white" strokeWidth="3" />
        <circle cx="39" cy="38" r="12" fill="#b2f34c" />
      </svg>
      {topics.map((topic, i) => <div className={`hero-map-card hero-map-card-${i} hero-map-card-${topic.tone}`} key={topic.title}>
        <span className="hero-map-card-icon"><Icon name={topic.icon} /></span>
        <span className="hero-map-card-copy">
          <strong>{topic.title}</strong>
          <span>{topic.detail}</span>
          <span className="hero-map-card-bars" aria-hidden="true">
            {Array.from({ length: 6 }, (_, bar) => <i key={bar} className={bar < topic.filled ? "coffee-bar-filled" : "coffee-bar-empty"} />)}
          </span>
        </span>
        <Icon name="down" className="hero-map-card-arrow" />
      </div>)}
    </div>
    <figcaption>Illustrative café scenario · Example indicators, not property scores</figcaption>
  </figure>;
}
