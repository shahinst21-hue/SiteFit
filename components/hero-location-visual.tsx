import Image from "next/image";
import { Icon, type IconName } from "./icon";

const signals: {
  icon: IconName;
  title: string;
  detail: string;
  tone: string;
}[] = [
  { icon: "demand", title: "Demand", detail: "Customers & occasions", tone: "green" },
  { icon: "shop", title: "Competition", detail: "Offering & position", tone: "amber" },
  { icon: "access", title: "Accessibility", detail: "Routes & trading hours", tone: "blue" },
  { icon: "shield", title: "Premises risk", detail: "Questions to verify", tone: "violet" },
];

export function HeroLocationVisual() {
  return (
    <figure className="hero-location-visual" aria-label="Illustrative location analysis interface; no property has been assessed">
      <div className="hero-location-scene">
        <Image
          src="/images/location-aerial.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1099px) calc(100vw - 64px), 50vw"
          className="hero-location-aerial"
        />
        <div className="hero-location-rings" aria-hidden="true">
          <span className="hero-ring hero-ring-outer" />
          <span className="hero-ring hero-ring-middle" />
          <span className="hero-ring hero-ring-inner" />
          <span className="hero-map-point hero-map-point-one" />
          <span className="hero-map-point hero-map-point-two" />
          <span className="hero-map-point hero-map-point-three" />
          <span className="hero-map-point hero-map-point-four" />
          <svg className="hero-location-pin" viewBox="0 0 78 96" focusable="false" aria-hidden="true">
            <path d="M39 2C18.6 2 2 18.6 2 39c0 27 37 54 37 54s37-27 37-54C76 18.6 59.4 2 39 2Z" fill="#0d1400" stroke="white" strokeWidth="3" />
            <circle cx="39" cy="38" r="10" fill="#b2f34c" />
          </svg>
          <span className="hero-walk-label hero-walk-near">5 min walk</span>
          <span className="hero-walk-label hero-walk-far">10 min walk</span>
        </div>
        {signals.map(({ icon, title, detail, tone }, index) => (
          <div className={`hero-map-card hero-map-card-${index} hero-map-card-${tone}`} key={title}>
            <span className="hero-map-card-icon"><Icon name={icon} /></span>
            <span className="hero-map-card-copy">
              <strong>{title}</strong>
              <span>{detail}</span>
              <span className="hero-map-card-bars" aria-hidden="true">
                {Array.from({ length: 6 }, (_, bar) => <i key={bar} />)}
              </span>
            </span>
            <Icon name="down" className="hero-map-card-arrow" />
          </div>
        ))}
      </div>
    </figure>
  );
}
