"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { normalisePostcode } from "@/lib/addresses/model";
import { trackJourney } from "@/lib/measurement/client";
import { Arrow } from "./ui";
import { Icon } from "./icon";

const postcodeExamples = ["KT2 7AU", "SW1A 1AA", "SE1 7PB"];

function PostcodeExample({ active }: { active: boolean }) {
  const [example, setExample] = useState(postcodeExamples[0]);

  useEffect(() => {
    if (!active) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number;

    function start() {
      window.clearTimeout(timer);
      setExample(postcodeExamples[0]);
      if (motion.matches || document.hidden) return;

      let index = 0;
      let length = postcodeExamples[index].length;
      let deleting = true;

      function tick() {
        length += deleting ? -1 : 1;
        const postcode = postcodeExamples[index];
        setExample(postcode.slice(0, length));

        if (deleting && length === 0) {
          index = (index + 1) % postcodeExamples.length;
          deleting = false;
          timer = window.setTimeout(tick, 250);
        } else if (!deleting && length === postcode.length) {
          deleting = true;
          timer = window.setTimeout(tick, 1800);
        } else {
          timer = window.setTimeout(tick, deleting ? 55 : 100);
        }
      }

      timer = window.setTimeout(tick, 1800);
    }

    start();
    motion.addEventListener("change", start);
    document.addEventListener("visibilitychange", start);
    return () => {
      window.clearTimeout(timer);
      motion.removeEventListener("change", start);
      document.removeEventListener("visibilitychange", start);
    };
  }, [active]);

  return (
    <span className="postcode-example" aria-hidden="true">
      e.g. {active ? example : postcodeExamples[0]}
    </span>
  );
}

const EntryContext = createContext<{
  address: string;
  setAddress: (address: string) => void;
  clear: () => void;
} | null>(null);
export function LocationEntryProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState("");
  const pathname = usePathname();
  const clear = useCallback(() => setAddress(""), []);
  useEffect(() => {
    if (!["/", "/check-location", "/coffee-shop-location-analysis"].includes(pathname)) clear();
  }, [pathname, clear]);
  return (
    <EntryContext.Provider value={{ address, setAddress, clear }}>
      {children}
    </EntryContext.Provider>
  );
}
export function useLocationEntry() {
  const entry = useContext(EntryContext);
  if (!entry) throw new Error("Location entry must be inside its provider.");
  return entry;
}
export function LocationEntry() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const entry = useLocationEntry();
  const router = useRouter();
  const pathname = usePathname();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    trackJourney("start_free_clicked", pathname === "/coffee-shop-location-analysis" ? "coffee" : "home");
    const postcode = normalisePostcode(value);
    if (!postcode) {
      setError("Enter a valid UK postcode.");
      document.getElementById("hero-address")?.focus();
      return;
    }
    entry.setAddress(postcode);
    setError("");
    router.push("/check-location");
  }
  return (
    <form className="hero-entry" onSubmit={submit} noValidate>
      <label htmlFor="hero-address">Property postcode</label>
      <div className="hero-entry-controls">
        <span className="entry-search" data-invalid={error ? "true" : undefined}>
          <Icon name="pin" />
          <span className="entry-search-field">
            <input
              id="hero-address"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError("");
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              required
              maxLength={20}
              autoComplete="postal-code"
              autoCapitalize="characters"
              enterKeyHint="search"
              spellCheck={false}
              placeholder="Enter postcode"
              aria-invalid={!!error}
              aria-describedby={error ? "hero-address-error hero-entry-note" : "hero-entry-note"}
            />
            <PostcodeExample active={!focused && !value && !paused} />
          </span>
          <button
            className="postcode-example-toggle"
            type="button"
            aria-label={paused ? "Play postcode examples" : "Pause postcode examples"}
            onClick={() => setPaused(!paused)}
            hidden={!!value}
          >
            <Icon name={paused ? "play" : "pause"} />
          </button>
        </span>
        <button className="button button-primary" type="submit">
          Find address <Arrow />
        </button>
      </div>
      {error && (
        <p className="field-error" id="hero-address-error" role="alert">
          {error}
        </p>
      )}
      <p className="hero-footnote" id="hero-entry-note">
        London analysis · No account or card needed for your Free Snapshot.
      </p>
    </form>
  );
}
