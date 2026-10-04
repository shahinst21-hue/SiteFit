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
import { emptyDraft, validateStep } from "@/lib/wizard";
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
    const issue = validateStep(0, { ...emptyDraft(), address: value }).address;
    if (issue) {
      setError(issue);
      document.getElementById("hero-address")?.focus();
      return;
    }
    entry.setAddress(value.trim());
    setError("");
    router.push("/check-location");
  }
  return (
    <form className="hero-entry" onSubmit={submit} noValidate>
      <label htmlFor="hero-address">Property address</label>
      <div className="hero-entry-controls">
        <span className="entry-search">
          <Icon name="pin" />
          <input
            id="hero-address"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            maxLength={300}
            autoComplete="off"
            placeholder="Property address and postcode"
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
