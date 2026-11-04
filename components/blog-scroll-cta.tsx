"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icon";

export function BlogScrollCTA() {
  const anchor = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const page = anchor.current?.closest(".article-page");
    const header = page?.querySelector(".article-header");
    const article = page?.querySelector(".article-column");
    if (!page || !header || !article) return;

    let pastHeader = false;
    let reading = false;
    const competing = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === header) {
          pastHeader = entry.boundingClientRect.bottom <= 0;
        } else if (entry.target === article) {
          reading = entry.isIntersecting;
        } else if (entry.isIntersecting) {
          competing.add(entry.target);
        } else {
          competing.delete(entry.target);
        }
      }
      setVisible(pastHeader && reading && competing.size === 0);
    });

    observer.observe(header);
    observer.observe(article);
    page.querySelectorAll(".article-cta").forEach((cta) => observer.observe(cta));
    const footer = document.querySelector("body > .site-footer");
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={anchor}>
      {visible && (
        <aside className="blog-scroll-cta" aria-label="Check your own property">
          <div>
            <strong>Now check your own location.</strong>
            <small>Free · No account or card needed</small>
          </div>
          <Link className="button button-primary" href="/check-location">
            Start a Free Snapshot <Icon name="arrow" />
          </Link>
        </aside>
      )}
    </div>
  );
}
