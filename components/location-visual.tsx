export function LocationVisual() {
  return (
    <figure className="location-visual">
      <div className="visual-toolbar">
        <span className="live-dot" aria-hidden="true" />
        <strong>The location, in context</strong>
        <span className="badge">Illustrative</span>
      </div>
      <div className="map-scene">
        <svg
          viewBox="0 0 600 380"
          role="img"
          aria-label="Schematic map of catchment, nearby businesses and access. Not a real map or measured catchment."
        >
          <rect width="600" height="380" fill="#eef3f5" />
          <g fill="#dde6e8">
            <rect x="20" y="20" width="120" height="60" rx="8" />
            <rect x="175" y="15" width="120" height="70" rx="8" />
            <rect x="345" y="20" width="90" height="80" rx="8" />
            <rect x="475" y="15" width="100" height="65" rx="8" />
            <rect x="15" y="145" width="130" height="100" rx="8" />
            <rect x="440" y="150" width="140" height="95" rx="8" />
            <rect x="20" y="295" width="165" height="70" rx="8" />
            <rect x="225" y="290" width="135" height="75" rx="8" />
            <rect x="410" y="285" width="170" height="80" rx="8" />
          </g>
          <path
            d="M-20 105 620 125M160-10 190 400M450-10 390 400M-10 270 610 260"
            stroke="white"
            strokeWidth="22"
          />
          <path
            d="M-20 105 620 125M160-10 190 400M450-10 390 400M-10 270 610 260"
            stroke="#c9d4d8"
            strokeWidth="1"
          />
          <path
            d="M280-10C240 90 370 160 320 400"
            fill="none"
            stroke="#bad7e4"
            strokeWidth="30"
          />
          <circle
            cx="300"
            cy="195"
            r="115"
            fill="#167b6920"
            stroke="#167b69"
            strokeDasharray="5 6"
          />
          <circle
            cx="300"
            cy="195"
            r="66"
            fill="#167b6910"
            stroke="#167b6940"
          />
          <g fill="#6375bf" stroke="white" strokeWidth="4">
            <circle cx="200" cy="120" r="9" />
            <circle cx="397" cy="260" r="9" />
            <circle cx="460" cy="115" r="9" />
          </g>
          <g fill="#1a8472" stroke="white" strokeWidth="4">
            <circle cx="145" cy="264" r="9" />
            <circle cx="390" cy="110" r="9" />
          </g>
          <path
            d="M300 147c-20 0-35 15-35 34 0 26 35 54 35 54s35-28 35-54c0-19-15-34-35-34Z"
            fill="#102c3d"
            stroke="white"
            strokeWidth="4"
          />
          <circle cx="300" cy="180" r="11" fill="white" />
        </svg>
        <div className="map-label">Your commercial property</div>
      </div>
      <div className="visual-signals">
        <span>
          <i className="signal-dot demand" />
          Demand context
        </span>
        <span>
          <i className="signal-dot competition" />
          Competition
        </span>
        <span>
          <i className="signal-dot access" />
          Access
        </span>
      </div>
      <figcaption>
        Schematic example · no real property or measured local data
      </figcaption>
    </figure>
  );
}
