"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Arrow } from "./ui";
import { Icon } from "./icon";
import {
  emptyManualAddress,
  manualErrors,
  normalisePostcode,
  normaliseQuery,
} from "@/lib/addresses/model";
import type {
  AddressCandidate,
  ManualAddress,
  PropertySelection,
} from "@/lib/addresses/model";
export type AddressLookupState = {
  mode: "postcode" | "search" | "manual";
  postcode: string;
  query: string;
  resultPostcode: string;
  candidates: AddressCandidate[] | null;
  manual: ManualAddress;
};
export const initialAddressLookup = (postcode = ""): AddressLookupState => ({
  mode: "postcode",
  postcode,
  query: "",
  resultPostcode: "",
  candidates: null,
  manual: emptyManualAddress(),
});
export function AddressLookup({
  state,
  setState,
  selected,
  onSelect,
  initialSearch,
  onInitialSearch,
}: {
  state: AddressLookupState;
  setState: (state: AddressLookupState) => void;
  selected: PropertySelection | null;
  onSelect: (property: PropertySelection) => void;
  initialSearch: string;
  onInitialSearch: () => void;
}) {
  const [busy, setBusy] = useState<
    "lookup" | "search" | "resolve" | "manual" | null
  >(null);
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<
    Partial<Record<keyof ManualAddress, string>>
  >({});
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const latest = useRef(state);
  latest.current = state;
  const request = useCallback(
    async (
      operation: "lookup" | "search" | "resolve" | "manual",
      body: object,
    ) => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      const version = ++generation.current;
      setBusy(operation);
      setError("");
      try {
        const response = await fetch(`/api/addresses/${operation}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: abort.signal,
          cache: "no-store",
        });
        const result = await response.json();
        if (abort.signal.aborted || version !== generation.current) return null;
        if (!response.ok) {
          setError(
            typeof result.error === "string"
              ? result.error
              : "Address search is temporarily unavailable. Please try again.",
          );
          return null;
        }
        return result;
      } catch {
        if (!abort.signal.aborted && version === generation.current)
          setError(
            "Address search is temporarily unavailable. Please try again.",
          );
        return null;
      } finally {
        if (version === generation.current) {
          setBusy(null);
          setPendingReference(null);
        }
      }
    },
    [],
  );
  const lookup = useCallback(
    async (raw: string) => {
      const postcode = normalisePostcode(raw);
      if (!postcode) {
        setError("Enter a valid UK postcode.");
        document.getElementById("postcode")?.focus();
        return;
      }
      setState({
        ...latest.current,
        postcode,
        candidates: null,
        resultPostcode: "",
      });
      const result = await request("lookup", { postcode });
      if (result)
        setState({
          ...latest.current,
          postcode,
          resultPostcode: result.postcode,
          candidates: result.candidates,
        });
    },
    [request, setState],
  );
  // Home's explicit Start action initiates one lookup after navigation. The cancellable
  // timer prevents Strict Mode's mount rehearsal from spending a second billable request.
  useEffect(() => {
    if (!initialSearch) return;
    const timer = setTimeout(() => {
      onInitialSearch();
      void lookup(initialSearch);
    }, 0);
    return () => clearTimeout(timer);
  }, [initialSearch, lookup, onInitialSearch]);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (state.mode !== "search") return;
    const query = normaliseQuery(state.query);
    if (!query) return;
    const timer = setTimeout(async () => {
      const result = await request("search", { query });
      if (result)
        setState({
          ...latest.current,
          candidates: result.candidates,
          resultPostcode: "",
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [state.mode, state.query, request, setState]);
  function changeMode(mode: AddressLookupState["mode"]) {
    controller.current?.abort();
    generation.current++;
    setBusy(null);
    setError("");
    setFields({});
    setState({ ...state, mode, candidates: null, resultPostcode: "" });
  }
  async function select(candidate: AddressCandidate) {
    if (busy) return;
    if (selected?.providerAddressId === candidate.reference) {
      onSelect(selected);
      return;
    }
    setPendingReference(candidate.reference);
    const result = await request("resolve", { reference: candidate.reference });
    if (result) onSelect(result.property);
  }
  async function manualSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const issues = manualErrors(state.manual);
    setFields(issues);
    if (Object.keys(issues).length) {
      setError("Check the address details.");
      document.getElementById(`manual-${Object.keys(issues)[0]}`)?.focus();
      return;
    }
    const result = await request("manual", state.manual);
    if (result) onSelect(result.property);
  }
  return (
    <div className="address-lookup">
      <p className="muted">
        Find the postal address, then choose your business. No account or
        financial details needed.
      </p>
      {selected && (
        <div className="selected-property" role="status">
          <Icon name="check" />
          <div>
            <strong>Selected property</strong>
            <p>{selected.formattedAddress}</p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            disabled={!!busy}
            onClick={() => onSelect(selected)}
          >
            Continue <Arrow />
          </button>
        </div>
      )}
      {state.mode === "manual" ? (
        <form onSubmit={manualSubmit} noValidate>
          <p className="field-help">
            Use the details from the listing. This address will remain
            unverified.
          </p>
          {(
            [
              ["line1", "Address line 1", "address-line1"],
              ["line2", "Address line 2 (optional)", "address-line2"],
              ["town", "Town or city", "address-level2"],
              ["postcode", "Postcode", "postal-code"],
            ] as const
          ).map(([key, label, complete]) => (
            <div className="field" key={key}>
              <label htmlFor={`manual-${key}`}>{label}</label>
              <input
                id={`manual-${key}`}
                value={state.manual[key]}
                autoComplete={complete}
                disabled={!!busy}
                required={key !== "line2"}
                maxLength={key === "postcode" ? 20 : key === "town" ? 100 : 180}
                aria-invalid={!!fields[key]}
                aria-describedby={
                  fields[key] ? `manual-${key}-error` : undefined
                }
                onChange={(event) =>
                  setState({
                    ...state,
                    manual: { ...state.manual, [key]: event.target.value },
                  })
                }
              />
              {fields[key] && (
                <p className="field-error" id={`manual-${key}-error`}>
                  {fields[key]}
                </p>
              )}
            </div>
          ))}
          <button
            type="submit"
            className="button button-primary"
            disabled={!!busy}
          >
            {busy === "manual" ? "Keeping the address…" : "Use this address"}
            <Arrow />
          </button>
        </form>
      ) : state.mode === "postcode" ? (
        <form
          className="postcode-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) void lookup(state.postcode);
          }}
        >
          <div className="field">
            <label htmlFor="postcode">Enter a UK postcode</label>
            <div className="postcode-controls">
              <input
                id="postcode"
                value={state.postcode}
                disabled={!!busy}
                autoComplete="postal-code"
                spellCheck={false}
                required
                maxLength={20}
                placeholder="e.g. KT2 7AU"
                aria-invalid={!!error}
                aria-describedby={
                  error ? "postcode-help address-error" : "postcode-help"
                }
                onChange={(event) => {
                  setError("");
                  setState({
                    ...state,
                    postcode: event.target.value,
                    candidates: null,
                    resultPostcode: "",
                  });
                }}
              />
              <button
                type="submit"
                className="button button-primary"
                disabled={!!busy}
              >
                {busy === "lookup" ? "Searching…" : "Search"}
                <Icon name="search" />
              </button>
            </div>
            <p className="field-help" id="postcode-help">
              Search once, then select the exact premises from the address list.
            </p>
          </div>
        </form>
      ) : (
        <div className="field">
          <label htmlFor="address-query">Search by address</label>
          <input
            id="address-query"
            value={state.query}
            disabled={busy === "resolve"}
            autoComplete="off"
            maxLength={160}
            aria-describedby="address-query-help"
            onChange={(event) => {
              controller.current?.abort();
              generation.current++;
              setBusy(null);
              setError("");
              setState({
                ...state,
                query: event.target.value,
                candidates: null,
              });
            }}
          />
          <p className="field-help" id="address-query-help">
            Enter at least four characters, including the street or town.
          </p>
        </div>
      )}
      {error && (
        <p
          className="field-error address-status"
          id="address-error"
          role="alert"
        >
          {error}
        </p>
      )}
      <div
        className="address-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {busy === "search"
          ? "Searching for addresses…"
          : busy === "resolve"
            ? "Checking the selected address…"
            : state.candidates &&
              (state.candidates.length
                ? `${state.candidates.length} ${state.candidates.length === 1 ? "address" : "addresses"}${state.resultPostcode ? ` in ${state.resultPostcode}` : " found"}`
                : state.mode === "postcode"
                  ? "No addresses were found for this postcode."
                  : "No matching addresses were found.")}
      </div>
      {state.candidates && state.candidates.length > 0 && (
        <ul
          className="address-results"
          aria-label="Select the property"
          aria-busy={!!busy}
        >
          {state.candidates.map((candidate) => (
            <li key={candidate.reference}>
              <button
                type="button"
                className={`address-result ${selected?.providerAddressId === candidate.reference ? "selected" : ""}`}
                disabled={!!busy}
                onClick={() => void select(candidate)}
              >
                <Icon
                  name={
                    selected?.providerAddressId === candidate.reference
                      ? "check"
                      : "pin"
                  }
                />
                <span>
                  {candidate.label}
                  {selected?.providerAddressId === candidate.reference && (
                    <small>Selected property</small>
                  )}
                  {pendingReference === candidate.reference && (
                    <small>Checking address…</small>
                  )}
                </span>
                <Arrow />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="address-alternatives">
        {state.mode !== "postcode" && (
          <button
            type="button"
            className="text-link"
            onClick={() => changeMode("postcode")}
          >
            Search by postcode
          </button>
        )}
        {state.mode === "postcode" && (
          <button
            type="button"
            className="text-link"
            onClick={() => changeMode("search")}
          >
            Search by address instead
          </button>
        )}
        {state.mode !== "manual" && (
          <button
            type="button"
            className="text-link"
            onClick={() => changeMode("manual")}
          >
            Can’t find the address? Enter it manually
          </button>
        )}
      </div>
    </div>
  );
}
