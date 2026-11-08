import Image from "next/image";
import { Icon } from "./icon";

const topics = [
  { icon: "demand", title: "Customers", detail: "People & daily routines" },
  { icon: "shop", title: "Coffee competition", detail: "Nearby offers & choices" },
  { icon: "access", title: "Local access", detail: "Routes & the shopfront" },
  { icon: "shield", title: "Premises checks", detail: "Use, layout & lease" },
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
      {topics.map((topic,i)=><div className={`coffee-hero-topic coffee-hero-topic-${i}`} key={topic.title}>
        <span className="coffee-hero-topic-icon"><Icon name={topic.icon} /></span>
        <div><strong>{topic.title}</strong><span>{topic.detail}</span><i className="coffee-hero-topic-accent" aria-hidden="true" /></div>
      </div>)}
    </div>
    <figcaption>Illustrative café scenario · No property assessed</figcaption>
  </figure>;
}
