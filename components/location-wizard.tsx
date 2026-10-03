"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  businessTypes,
  economicsFields,
  emptyDraft,
  normaliseInput,
  steps,
  validateStep,
} from "@/lib/wizard";
import type { FieldErrors, LocationCheckInput } from "@/lib/wizard";
import { Arrow } from "./ui";

export function LocationWizard() {
  const [draft, setDraft] = useState(emptyDraft);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState<LocationCheckInput | null>(null);
  const [failure, setFailure] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step, input]);
  async function advance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issues = validateStep(step, draft);
    setErrors(issues);
    setFailure("");
    if (Object.keys(issues).length) {
      requestAnimationFrame(() =>
        document.getElementById(Object.keys(issues)[0])?.focus(),
      );
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setPending(true);
    try {
      // Yield for local preparation; no request, analysis or simulated progress.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      setInput(normaliseInput(draft));
    } catch {
      setFailure(
        "We could not prepare these details. Go back and review your entries, then try again.",
      );
    } finally {
      setPending(false);
    }
  }
  function back() {
    setErrors({});
    setFailure("");
    setInput(null);
    setStep(Math.max(0, step - 1));
  }
  const chosenType = businessTypes.find(
    (type) => type.id === draft.businessType,
  );
  const supplied = economicsFields.filter(
    (field) => draft.economics[field.id].trim() !== "",
  );
  return (
    <div className="wizard-layout">
      <aside className="wizard-sidebar">
        <p className="eyebrow">YOUR LOCATION CHECK</p>
        <ol className="wizard-steps">
          {steps.map((label, index) => (
            <li
              key={label}
              className={
                index === step ? "active" : index < step ? "completed" : ""
              }
              aria-current={index === step ? "step" : undefined}
            >
              <span className="step-marker" aria-hidden="true">
                {index < step ? "✓" : index + 1}
              </span>
              <span>
                {label}
                {index < step && <span className="sr-only">, completed</span>}
              </span>
            </li>
          ))}
        </ol>
        <div className="wizard-note">
          <strong>One space. Your business.</strong>
          <p>London first. No account required to explore this preview.</p>
          <p>Entries stay on this page. Reloading or leaving clears them.</p>
        </div>
      </aside>
      <section className="wizard-panel" aria-labelledby="wizard-heading">
        <p className="eyebrow">STEP {step + 1} OF 4</p>
        <h2 ref={heading} tabIndex={-1} id="wizard-heading">
          {input ? "Your details are ready." : steps[step]}
        </h2>
        {input ? (
          <div>
            <div className="availability-note" role="status">
              <strong>Reports are not available yet.</strong>
              <p>
                You have completed the preview journey. No analysis has run, no
                report has been generated, and no information has been
                submitted.
              </p>
            </div>
            <InputSummary
              address={input.address.entered}
              business={chosenType?.label ?? ""}
              suppliedCount={supplied.length}
            />
            <p className="muted">
              Your address has not been resolved or checked. You can revisit
              your entries or read about the planned report.
            </p>
            <div className="button-row">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setInput(null)}
              >
                Review entries
              </button>
              <Link className="text-link" href="/how-it-works#report">
                See what the report includes <Arrow />
              </Link>
            </div>
            <button
              type="button"
              className="reset-button"
              onClick={() => {
                setDraft(emptyDraft());
                setInput(null);
                setStep(0);
                setErrors({});
                setFailure("");
              }}
            >
              Clear entries and start again
            </button>
          </div>
        ) : (
          <form onSubmit={advance} noValidate aria-busy={pending}>
            {Object.keys(errors).length > 0 && (
              <div className="error-summary" role="alert">
                <strong>Check the highlighted entries.</strong>
                <ul>
                  {Object.entries(errors).map(([key, value]) => (
                    <li key={key}>
                      <a href={`#${key}`}>{value}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {step === 0 && (
              <div>
                <p className="muted">
                  Which commercial property are you considering? Enter the
                  street address and postcode yourself.
                </p>
                <div className="field">
                  <label htmlFor="address">
                    Property address{" "}
                    <span className="required-label">Required</span>
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    rows={3}
                    maxLength={300}
                    required
                    autoComplete="off"
                    value={draft.address}
                    onChange={(event) =>
                      setDraft({ ...draft, address: event.target.value })
                    }
                    aria-invalid={Boolean(errors.address)}
                    aria-describedby={`address-help${errors.address ? " address-error" : ""}`}
                    placeholder="Street address, London, postcode"
                  />
                  <p id="address-help" className="field-help">
                    No address search or verification is available yet. Please
                    avoid entering a home address.
                  </p>
                  {errors.address && (
                    <p className="field-error" id="address-error">
                      {errors.address}
                    </p>
                  )}
                </div>
                <div className="quiet-note">
                  Have not chosen a property? Browse the{" "}
                  <Link href="/blog">Journal</Link> for questions to take to a
                  viewing.
                </div>
              </div>
            )}
            {step === 1 && (
              <fieldset>
                <legend className="muted">
                  What are you planning to open?
                </legend>
                <div
                  className="business-options"
                  id="businessType"
                  tabIndex={-1}
                >
                  {businessTypes.map((type) => (
                    <label
                      key={type.id}
                      className={
                        draft.businessType === type.id
                          ? "business-option selected"
                          : "business-option"
                      }
                    >
                      <input
                        type="radio"
                        name="businessType"
                        required
                        value={type.id}
                        checked={draft.businessType === type.id}
                        onChange={() =>
                          setDraft({ ...draft, businessType: type.id })
                        }
                        aria-invalid={Boolean(errors.businessType)}
                        aria-describedby={
                          errors.businessType ? "businessType-error" : undefined
                        }
                      />
                      <span>
                        <strong>{type.label}</strong>
                        <span>{type.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.businessType && (
                  <p className="field-error" id="businessType-error">
                    {errors.businessType}
                  </p>
                )}
                <p className="field-help">
                  Choose the closest match for the business you have in mind.
                </p>
              </fieldset>
            )}
            {step === 2 && (
              <div>
                <p className="muted">
                  Add what you know. Every field is optional. Leave unknown
                  values blank; nothing is calculated in this preview.
                </p>
                <div className="economics-grid">
                  {economicsFields.map((field) => (
                    <div className="field" key={field.id}>
                      <label htmlFor={field.id}>{field.label}</label>
                      <div className="input-with-unit">
                        <input
                          id={field.id}
                          name={field.id}
                          type="text"
                          inputMode={field.integer ? "numeric" : "decimal"}
                          maxLength={14}
                          value={draft.economics[field.id]}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              economics: {
                                ...draft.economics,
                                [field.id]: event.target.value,
                              },
                            })
                          }
                          aria-invalid={Boolean(errors[field.id])}
                          aria-describedby={`${field.id}-unit${errors[field.id] ? ` ${field.id}-error` : ""}`}
                          placeholder="Unknown"
                        />
                        <span id={`${field.id}-unit`}>{field.unit}</span>
                      </div>
                      {errors[field.id] && (
                        <p className="field-error" id={`${field.id}-error`}>
                          {errors[field.id]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="field-help">
                  Use digits and a decimal point, without commas or currency
                  symbols. Costs are annual unless labelled otherwise; opening
                  hours are per day.
                </p>
              </div>
            )}
            {step === 3 && (
              <div>
                <p className="muted">
                  Review your details before finishing the preview.
                </p>
                <InputSummary
                  address={draft.address.trim()}
                  business={chosenType?.label ?? ""}
                  suppliedCount={supplied.length}
                />
                <div className="summary-economics">
                  {supplied.length === 0 ? (
                    <p>No economics entered. All values remain unknown.</p>
                  ) : (
                    <dl>
                      {supplied.map((field) => (
                        <div key={field.id}>
                          <dt>{field.label}</dt>
                          <dd>
                            {draft.economics[field.id]} {field.unit}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
                <div className="availability-note">
                  <strong>Analysis is not available yet.</strong>
                  <p>
                    Finish to prepare your entries on this page. We will not
                    search for data, calculate economics, create a report or
                    charge you.
                  </p>
                </div>
              </div>
            )}
            {failure && (
              <div className="error-summary" role="alert">
                {failure}
              </div>
            )}
            <div className="wizard-actions">
              {step > 0 && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={back}
                  disabled={pending}
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                className="button button-primary"
                disabled={pending}
              >
                {pending
                  ? "Preparing your entries…"
                  : step === 2
                    ? "Review details"
                    : step === 3
                      ? "Finish preview"
                      : "Continue"}
                <Arrow />
              </button>
            </div>
            {pending && (
              <p role="status" className="field-help">
                Preparing your entries locally. No analysis is running.
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
function InputSummary({
  address,
  business,
  suppliedCount,
}: {
  address: string;
  business: string;
  suppliedCount: number;
}) {
  return (
    <dl className="input-summary">
      <div>
        <dt>Property address</dt>
        <dd>
          {address}
          <small>Entered address · not verified</small>
        </dd>
      </div>
      <div>
        <dt>Business type</dt>
        <dd>{business}</dd>
      </div>
      <div>
        <dt>Optional economics</dt>
        <dd>
          {suppliedCount} of {economicsFields.length} values entered
        </dd>
      </div>
    </dl>
  );
}
