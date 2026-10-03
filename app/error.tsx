"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-wrap narrow-page">
      <p className="eyebrow">PAGE UNAVAILABLE</p>
      <h1>We could not load this page.</h1>
      <p role="alert">
        Please try again. Your location entries may need to be re-entered if the
        page reloads.
      </p>
      <button type="button" className="button button-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
