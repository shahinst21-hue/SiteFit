import { Icon, type IconName } from "./icon";
const signals: [IconName, string, string, string][] = [
  ["demand", "Demand", "Customers & occasions", "green"],
  ["shop", "Competition", "Offering & position", "amber"],
  ["access", "Accessibility", "Routes & trading hours", "blue"],
  ["shield", "Premises risk", "Questions to verify", "rose"],
];
export function LocationVisual({ compact = false }: { compact?: boolean }) {
  return (
    <figure className={`location-visual ${compact ? "visual-compact" : ""}`}>
      <div className="visual-toolbar">
        <span className="badge">Interface example</span>
        <span>Illustrative map</span>
      </div>
      <div className="map-scene">
        <svg
          viewBox="0 0 640 500"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label="Original schematic of streets, an illustrative location and surrounding context. Not a real map or measured catchment."
        >
          <rect width="640" height="500" fill="#f1f4f2" />
          <g fill="#e1e7e2" stroke="#fff" strokeWidth="2">
            {Array.from({ length: 6 }, (_, row) =>
              Array.from({ length: 8 }, (_, col) => {
                const x = col * 88 - 25 + (row % 2) * 12,
                  y = row * 91 - 20;
                return (
                  <g
                    key={`${row}-${col}`}
                    transform={`translate(${x} ${y}) rotate(-14)`}
                  >
                    <rect width="66" height="60" rx="3" />
                    <path
                      d="M20 0v60M0 27h66"
                      stroke="#f7f9f7"
                      strokeWidth="3"
                    />
                  </g>
                );
              }),
            )}
          </g>
          <g fill="#d8eed6">
            <path d="m22 60 140-30 19 70-138 40Z" />
            <path d="m432 72 137-31 21 79-137 37Z" />
            <path d="m142 334 89-22 16 66-95 20Z" />
          </g>
          <path
            d="M-30 395C80 348 153 440 279 406S393 325 492 348 626 462 680 400"
            stroke="#bfdfeb"
            strokeWidth="42"
            fill="none"
          />
          <g stroke="#fff" fill="none" strokeWidth="12">
            <path d="M-30 240 680 68M-20 78 620 498M170-20 330 520M515-20 383 520" />
            <path d="M-20 320 680 250M45 520 630-20" strokeWidth="8" />
          </g>
          <g stroke="#d0d8d1" fill="none" strokeWidth="1">
            <path d="M-30 240 680 68M-20 78 620 498M170-20 330 520M515-20 383 520" />
          </g>
          <g
            fill="#70d954"
            fillOpacity=".08"
            stroke="#79ce65"
            strokeOpacity=".55"
          >
            <circle cx="329" cy="246" r="149" />
            <circle cx="329" cy="246" r="105" />
            <circle cx="329" cy="246" r="59" fillOpacity=".14" />
          </g>
          <g fill="#a9c4ac" stroke="#fff" strokeWidth="3">
            <circle cx="203" cy="192" r="6" />
            <circle cx="403" cy="299" r="6" />
            <circle cx="439" cy="189" r="6" />
            <circle cx="258" cy="339" r="6" />
          </g>
          <path
            d="M329 206c-19 0-34 14-34 33 0 24 34 54 34 54s34-30 34-54c0-19-15-33-34-33Z"
            fill="#16872b"
            stroke="white"
            strokeWidth="3"
          />
          <circle cx="329" cy="238" r="10" fill="white" />
        </svg>
        <span className="map-label">Illustrative location</span>
        {signals.map(([icon, label, text, tone], i) => (
          <div className={`map-card map-card-${i} ${tone}`} key={label}>
            <span className={`icon-disc ${tone}`}>
              <Icon name={icon} />
            </span>
            <div>
              <strong>{label}</strong>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </div>
      <figcaption>
        Schematic example · no real property or measured local data
      </figcaption>
    </figure>
  );
}
