"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "./icon";
import { selectResources, type ResourceSummary } from "@/lib/content/search";
type Resource = ResourceSummary & { card: ReactNode };
export function ResourceBrowser({ items }: { items: Resource[] }) {
  const [input, setInput] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("recent");
  const categories = [...new Set(items.map((p) => p.category))];
  const matches = selectResources(items, query, category, sort);
  function search(e: FormEvent) {
    e.preventDefault();
    setQuery(input);
  }
  function clear() {
    setInput("");
    setQuery("");
    setCategory("");
  }
  return (
    <section
      className="resource-browser"
      aria-labelledby="resource-results-heading"
    >
      <form className="resource-search" onSubmit={search} role="search">
        <label className="sr-only" htmlFor="resource-query">
          Search resources
        </label>
        <Icon name="search" />
        <input
          id="resource-query"
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={200}
          placeholder="Search guides and articles"
        />
        <button className="button button-primary" type="submit">
          Search
        </button>
      </form>
      <div className="resource-controls">
        <div
          className="filter-chips"
          role="group"
          aria-label="Resource categories"
        >
          <button
            className="filter-chip"
            type="button"
            aria-pressed={!category}
            onClick={() => setCategory("")}
          >
            All resources
          </button>
          {categories.map((c) => (
            <button
              className="filter-chip"
              type="button"
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="resource-sort">
          <label htmlFor="resource-sort">Sort by</label>
          <select
            id="resource-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Most recent</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>
      <div className="resource-result-heading">
        <h2 id="resource-results-heading">Explore the resources</h2>
        <p role="status" aria-live="polite">
          {matches.length} {matches.length === 1 ? "article" : "articles"}
          {query ? ` matching “${query}”` : ""}
        </p>
      </div>
      {matches.length ? (
        <div className="post-grid">
          {matches.map((p) => (
            <div key={p.id}>{p.card}</div>
          ))}
        </div>
      ) : (
        <div className="simple-panel">
          <h3>No articles match this selection.</h3>
          <p>Try a broader search or browse all published resources.</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={clear}
          >
            Clear filters
          </button>
        </div>
      )}
      {(query || category) && matches.length > 0 && (
        <button className="text-link" type="button" onClick={clear}>
          Clear filters
        </button>
      )}
    </section>
  );
}
