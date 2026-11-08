import Image from "next/image";
import { Icon } from "./icon";

const topics = [
  { icon: "demand", title: "Customers", detail: "People & daily routines" },
  { icon: "shop", title: "Coffee competition", detail: "Nearby offers & choices" },
  { icon: "access", title: "Local access", detail: "Routes & the shopfront" },
  { icon: "shield", title: "Premises checks", detail: "Use, layout & lease" },
] as const;

function TopicMotif({index}:{index:number}) {
  return <svg className="coffee-hero-topic-motif" viewBox="0 0 160 26" fill="none" aria-hidden="true" focusable="false">
    {index===0 && <g stroke="currentColor" strokeWidth="1.8"><circle cx="15" cy="7" r="4"/><path d="M6 24v-5a9 9 0 0 1 18 0v5"/><circle cx="43" cy="7" r="4"/><path d="M34 24v-5a9 9 0 0 1 18 0v5"/><circle cx="71" cy="7" r="4"/><path d="M62 24v-5a9 9 0 0 1 18 0v5"/><path d="M98 8h48M98 17h32" strokeOpacity=".3"/></g>}
    {index===1 && <g stroke="currentColor" strokeWidth="1.8"><path d="M7 12h27v12H7zM4 12 9 3h23l5 9M17 24v-8h7v8M53 12h32v12H53zM50 12l5-9h28l5 9M66 24v-8h7v8M105 12h27v12h-27zM102 12l5-9h23l5 9M115 24v-8h7v8"/><path d="M14 4v7M24 4v7M61 4v7M73 4v7M112 4v7M122 4v7" strokeOpacity=".35"/></g>}
    {index===2 && <g stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="14" r="5"/><path d="M22 14h29q11 0 11-8h30q0 16 14 16h29" strokeDasharray="3 4"/><path d="m131 17 5 5-5 4"/><circle cx="147" cy="7" r="4" fill="currentColor" stroke="none"/></g>}
    {index===3 && <g stroke="currentColor" strokeWidth="1.8"><rect x="5" y="4" width="17" height="17" rx="3"/><path d="M31 8h31M31 17h20" strokeOpacity=".55"/><rect x="83" y="4" width="17" height="17" rx="3"/><path d="M109 8h34M109 17h23" strokeOpacity=".55"/></g>}
  </svg>;
}

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
        <div><strong>{topic.title}</strong><span>{topic.detail}</span></div>
        <TopicMotif index={i}/>
      </div>)}
    </div>
    <figcaption>Illustrative café scenario · No property assessed</figcaption>
  </figure>;
}
