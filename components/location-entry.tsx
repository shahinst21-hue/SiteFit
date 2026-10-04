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
import { Arrow } from "./ui";
import { Icon } from "./icon";
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
    if (pathname !== "/" && pathname !== "/check-location") clear();
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
  const entry = useLocationEntry();
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      <label htmlFor="hero-address">Enter a UK postcode</label>
      <div className="hero-entry-controls">
        <span className="entry-search">
          <Icon name="pin" />
          <input
            id="hero-address"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            maxLength={20}
            autoComplete="postal-code"
            spellCheck={false}
            placeholder="e.g. KT2 7AU"
            aria-invalid={!!error}
            aria-describedby={error ? "hero-address-error" : "hero-entry-note"}
          />
        </span>
        <button className="button button-primary" type="submit">
          Start free <Arrow />
        </button>
      </div>
      {error && (
        <p className="field-error" id="hero-address-error" role="alert">
          {error}
        </p>
      )}
      <p className="hero-footnote" id="hero-entry-note">
        Two details. No account. Economics is optional.
      </p>
    </form>
  );
}
