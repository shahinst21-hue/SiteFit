"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  businessTypes,
  emptyDraft,
  economicsFields,
  snapshotErrors,
  primaryEconomics,
  steps,
  validateStep,
  visibleEconomics,
} from "@/lib/wizard";
import type { FieldErrors } from "@/lib/wizard";
import { Arrow } from "./ui";
import { Icon, type IconName } from "./icon";
import { LocationVisual } from "./location-visual";
import { useLocationEntry } from "./location-entry";
import { formatPrice, site } from "@/lib/site-config";
const priorities = {
  "coffee-shop": [
    "Check morning and lunchtime activity, repeat custom and complementary workplaces.",
    "Compare takeaway, seating and price points, rather than counting cafés alone.",
    "Visit at opening time: visibility and the route people actually walk matter.",
  ],
  restaurant: [
    "Check lunchtime and evening activity separately, including weekday/weekend differences.",
    "Compare cuisine, price and occasion; neighbouring restaurants may attract a shared audience.",
    "Verify evening transport, deliveries, extraction and permitted use.",
  ],
  "hair-salon": [
    "Consider the reachable customer base and repeat appointment demand.",
    "Compare services, price and positioning; listings do not establish spare capacity.",
    "Check accessible entry, visibility and convenient appointment-time journeys.",
  ],
  "beauty-salon": [
    "Consider repeat treatment needs, local customer reach and appointment patterns.",
    "Compare treatment specialisms and price positioning, not just the number of salons.",
    "Check privacy, accessible entry and convenient appointment-time journeys.",
  ],
};
export function LocationWizard() {
  const entry = useLocationEntry();
  const [draft, setDraft] = useState(() => ({
    ...emptyDraft(),
    address: entry.address,
  }));
  const [step, setStep] = useState(() => (entry.address ? 1 : 0));
  useEffect(() => entry.clear(), [entry.clear]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [economics, setEconomics] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) {
      heading.current?.focus({ preventScroll: true });
      flow.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
    mounted.current = true;
  }, [step, economics]);
  const chosen = businessTypes.find((t) => t.id === draft.businessType);
  function fail(issues: FieldErrors) {
    setErrors(issues);
    if (Object.keys(issues).length)
      requestAnimationFrame(() =>
        document.getElementById(Object.keys(issues)[0])?.focus(),
      );
    return Object.keys(issues).length > 0;
  }
  function advance(event: FormEvent) {
    event.preventDefault();
    if (!fail(step === 1 ? snapshotErrors(draft) : validateStep(0, draft)))
      setStep(step + 1);
  }
  function save(event: FormEvent) {
    event.preventDefault();
    const issues = validateStep(2, draft);
    if (
      Object.keys(issues).some(
        (id) => !primaryEconomics.some((key) => key === id),
      )
    )
      setExpanded(true);
    if (!fail(issues)) {
      setSaved(true);
      setEconomics(false);
    }
  }
  function skip() {
    setErrors({});
    setEconomics(false);
  }
  function reset() {
    setDraft(emptyDraft());
    setStep(0);
    setErrors({});
    setEconomics(false);
    setExpanded(false);
    setSaved(false);
  }
  const supplied = economicsFields.filter((f) => draft.economics[f.id].trim());
  return (
    <div className="location-flow" ref={flow}>
      <div className="flow-progress" aria-label="Location check progress">
        {steps.map((label, i) => (
          <span
            key={label}
            className={i === step ? "current" : ""}
            aria-current={i === step ? "step" : undefined}
          >
            <b>{i + 1}</b>
            <span>{label}</span>
          </span>
        ))}
      </div>
      <div
        className={`flow-columns ${!economics && step === 1 ? "flow-business" : ""}`}
      >
        <section
          className={`wizard-panel ${economics ? "wizard-economics" : `wizard-step-${step}`}`}
          aria-labelledby="wizard-heading"
        >
          <p className="eyebrow">
            {economics
              ? "OPTIONAL · AFTER YOUR SNAPSHOT"
              : `STEP ${step + 1} OF 3`}
          </p>
          <h1 ref={heading} tabIndex={-1} id="wizard-heading">
            {economics
              ? "Add the costs you know"
              : step === 0
                ? "Where is the property?"
                : step === 1
                  ? "What are you opening?"
                  : "Your Free Snapshot"}
          </h1>
          {Object.keys(errors).length > 0 && (
            <div className="error-summary" role="alert">
              <strong>Check these details.</strong>
              <ul>
                {Object.entries(errors).map(([id, message]) => (
                  <li key={id}>
                    <a href={`#${id}`}>{message}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {economics ? (
            <form onSubmit={save} noValidate>
              <p className="muted">
                Keep the costs in context. Every field is optional; leave
                anything you do not have blank.
              </p>
              <button className="text-link" type="button" onClick={skip}>
                Skip economics
              </button>
              <div className="economics-grid" id="economics-fields">
                {visibleEconomics(expanded).map((f) => (
                  <div className="field" key={f.id}>
                    <label htmlFor={f.id}>
                      <span className="field-icon">
                        <Icon
                          name={
                            f.id === "averageTransactionValue" ? "shop" : "cost"
                          }
                        />
                      </span>
                      {f.label}
                    </label>
                    <div className="input-with-unit">
                      <input
                        id={f.id}
                        name={f.id}
                        type="text"
                        inputMode={f.integer ? "numeric" : "decimal"}
                        maxLength={14}
                        value={draft.economics[f.id]}
                        onChange={(e) => {
                          setSaved(false);
                          setDraft({
                            ...draft,
                            economics: {
                              ...draft.economics,
                              [f.id]: e.target.value,
                            },
                          });
                        }}
                        aria-invalid={!!errors[f.id]}
                        aria-describedby={`${f.id}-unit${errors[f.id] ? ` ${f.id}-error` : ""}`}
                      />
                      <span id={`${f.id}-unit`}>{f.unit}</span>
                    </div>
                    {errors[f.id] && (
                      <p className="field-error" id={`${f.id}-error`}>
                        {errors[f.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="disclosure-button"
                type="button"
                aria-expanded={expanded}
                aria-controls="economics-fields"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded
                  ? "Show fewer financial details"
                  : "Add more financial details"}
                <span aria-hidden="true">{expanded ? "−" : "+"}</span>
              </button>
              <p className="field-help">
                Use numbers without commas or currency symbols. Costs are annual
                unless labelled otherwise. Figures stay on this page; reloading
                clears them.
              </p>
              <div className="wizard-actions">
                <button className="button button-primary" type="submit">
                  Keep these details <Arrow />
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={skip}
                >
                  Back to Snapshot
                </button>
              </div>
            </form>
          ) : step < 2 ? (
            <form onSubmit={advance} noValidate>
              {step === 0 ? (
                <>
                  <p className="muted">
                    Enter the commercial address and postcode. No financial
                    details or account needed.
                  </p>
                  <div className="field">
                    <label htmlFor="address">Property address</label>
                    <textarea
                      id="address"
                      name="address"
                      rows={2}
                      required
                      maxLength={300}
                      autoComplete="off"
                      value={draft.address}
                      placeholder="Street address, town or city, postcode"
                      onChange={(e) =>
                        setDraft({ ...draft, address: e.target.value })
                      }
                      aria-invalid={!!errors.address}
                      aria-describedby={`address-help${errors.address ? " address-error" : ""}`}
                    />
                    <p id="address-help" className="field-help">
                      Use the full address shown in the listing. This entry does
                      not resolve or verify the property.
                    </p>
                    {errors.address && (
                      <p className="field-error" id="address-error">
                        {errors.address}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="address-context">{draft.address}</p>
                  <fieldset>
                    <legend className="muted">
                      Choose the closest match. Your business shapes which
                      questions matter.
                    </legend>
                    <div
                      className="business-options"
                      id="businessType"
                      tabIndex={-1}
                    >
                      {businessTypes.map((t, i) => (
                        <label
                          className={`business-option ${draft.businessType === t.id ? "selected" : ""}`}
                          key={t.id}
                        >
                          <input
                            type="radio"
                            name="businessType"
                            value={t.id}
                            checked={draft.businessType === t.id}
                            required
                            onChange={() =>
                              setDraft({ ...draft, businessType: t.id })
                            }
                            aria-invalid={!!errors.businessType}
                            aria-describedby={
                              errors.businessType
                                ? "businessType-error"
                                : undefined
                            }
                          />
                          <span className="business-icon" aria-hidden="true">
                            <Icon
                              name={
                                (
                                  [
                                    "coffee",
                                    "restaurant",
                                    "hair",
                                    "beauty",
                                  ] as IconName[]
                                )[i]
                              }
                            />
                          </span>
                          <span>
                            <strong>{t.label}</strong>
                            <span>{t.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors.businessType && (
                      <p id="businessType-error" className="field-error">
                        {errors.businessType}
                      </p>
                    )}
                  </fieldset>
                </>
              )}
              <div className="wizard-actions">
                {step > 0 && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setStep(0);
                      setErrors({});
                    }}
                  >
                    Back
                  </button>
                )}
                <button type="submit" className="button button-primary">
                  {step === 0 ? "Choose business type" : "View Free Snapshot"}
                  <Arrow />
                </button>
              </div>
            </form>
          ) : (
            <div className="snapshot">
              <div className="snapshot-overview">
                <div className="snapshot-summary">
                  <span className="badge">Your location brief</span>
                  <h3>{draft.address}</h3>
                  <p>
                    {chosen?.label} <span aria-hidden="true">·</span> Entered
                    address, not verified
                  </p>
                  <div className="summary-priority">
                    <span className="icon-disc green">
                      <Icon name="evidence" />
                    </span>
                    <div>
                      <strong>Your business shapes the checks.</strong>
                      <span>Demand, competition and access come first.</span>
                    </div>
                  </div>
                </div>
                <LocationVisual compact />
              </div>
              <div className="evidence-notice">
                <strong>
                  Local evidence has not been verified for this address.
                </strong>
                <p>
                  This Snapshot organises your brief and business-relevant
                  checks. It does not establish local demand, competitor counts
                  or premises suitability.
                </p>
              </div>
              <div className="snapshot-cards">
                {["Demand", "Competition", "Accessibility"].map((label, i) => (
                  <article className="signal-card" key={label}>
                    <div>
                      <span
                        className={`icon-disc ${["green", "amber", "blue"][i]}`}
                      >
                        <Icon
                          name={(["demand", "shop", "access"] as IconName[])[i]}
                        />
                      </span>
                      <span className="status-badge">Verification needed</span>
                    </div>
                    <h3>{label}</h3>
                    <p>
                      {draft.businessType && priorities[draft.businessType][i]}
                    </p>
                    <details>
                      <summary>Evidence to look for</summary>
                      <p>
                        {
                          [
                            "Dated local activity and catchment evidence matching the hours and customers you intend to serve.",
                            "Current businesses and their offering, checked on site. Listings do not prove trading strength.",
                            "Walking routes, entry conditions and relevant transport evidence for the times your customers will travel.",
                          ][i]
                        }
                      </p>
                    </details>
                  </article>
                ))}
              </div>
              <section className="risk-note">
                <p className="eyebrow">KEY RISK TO RESOLVE</p>
                <h3>Do not treat the listing as proof of suitability.</h3>
                <p>
                  Confirm permitted use, lease obligations and fit-out
                  constraints with the landlord and appropriate advisers. This
                  is a due-diligence check, not a finding about this property.
                </p>
              </section>
              <section className="snapshot-next">
                <h3>Make the next viewing count.</h3>
                <ul className="check-list">
                  <li>
                    Visit at the hours your customers would use the business.
                  </li>
                  <li>
                    Ask for evidence of lawful use, rates and building
                    responsibilities.
                  </li>
                  <li>
                    Record unanswered questions before discussing lease terms.
                  </li>
                </ul>
              </section>
              {saved && (
                <div className="quiet-note" role="status">
                  <strong>Financial details kept for this visit.</strong>
                  <p>
                    {supplied.length === 0
                      ? "No financial details supplied."
                      : `${supplied.length} optional ${supplied.length === 1 ? "figure" : "figures"} entered. No financial results have been calculated.`}
                  </p>
                </div>
              )}
              <section className="snapshot-upgrade">
                <div>
                  <p className="eyebrow">LOOK DEEPER BEFORE YOU SIGN</p>
                  <h3>See how the Full Report weighs the evidence.</h3>
                  <p className="upgrade-price">
                    {formatPrice(site.pricing.fullReport)}{" "}
                    <span>one-off · no subscription</span>
                  </p>
                  <p>
                    Explore a fictional example of opportunities, risks,
                    economics and prioritised next checks.
                  </p>
                </div>
                <Link className="button button-primary" href="/sample-report">
                  View Sample Report <Arrow />
                </Link>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    setErrors({});
                    setEconomics(true);
                  }}
                >
                  Add optional economics
                </button>
                <button
                  className="text-link"
                  type="button"
                  onClick={() =>
                    document.getElementById("snapshot-end")?.focus()
                  }
                >
                  Continue without economics ↓
                </button>
              </section>
              <div id="snapshot-end" tabIndex={-1} className="wizard-actions">
                <button
                  className="text-link"
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setErrors({});
                  }}
                >
                  Edit business type
                </button>
                <button
                  className="text-link"
                  type="button"
                  onClick={() => {
                    setStep(0);
                    setErrors({});
                  }}
                >
                  Edit address
                </button>
                <button className="text-link" type="button" onClick={reset}>
                  Start a new check
                </button>
              </div>
            </div>
          )}
        </section>
        {(step === 0 || economics) && (
          <aside className="flow-visual">
            <LocationVisual />
            <div className="flow-visual-note">
              <Icon name={economics ? "cost" : "evidence"} />
              <div>
                <h3>
                  {economics
                    ? "Refine your financial questions."
                    : "A location is more than an address."}
                </h3>
                <p>
                  {economics
                    ? "Rent, rates and transaction value frame the first questions. Adding them does not calculate financial results."
                    : "Bring the business context, evidence gaps and practical checks into one focused brief."}
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
