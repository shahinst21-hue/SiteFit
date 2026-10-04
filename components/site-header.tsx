"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Wordmark, Arrow } from "./ui";
const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/sample-report", label: "Sample Report" },
];
export function SiteHeader() {
  const [open, setOpen] = useState(false),
    [resources, setResources] = useState(false);
  const menu = useRef<HTMLButtonElement>(null),
    resourceToggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  function close() {
    setOpen(false);
    setResources(false);
  }
  return (
    <header
      className="site-header"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (resources) {
            setResources(false);
            resourceToggle.current?.focus();
          } else {
            setOpen(false);
            menu.current?.focus();
          }
        }
      }}
    >
      <div className="header-inner">
        <Link href="/" aria-label="SiteFit home" onClick={close}>
          <Wordmark />
        </Link>
        <button
          className="menu-toggle"
          type="button"
          ref={menu}
          aria-expanded={open}
          aria-controls="public-navigation"
          onClick={() => {
            setOpen(!open);
            setResources(false);
          }}
        >
          {open ? "Close" : "Menu"}
          <span aria-hidden="true">{open ? "×" : "☰"}</span>
        </button>
        <nav
          id="public-navigation"
          aria-label="Main navigation"
          className={open ? "public-nav is-open" : "public-nav"}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname.startsWith(l.href) ? "page" : undefined}
              onClick={close}
            >
              {l.label}
            </Link>
          ))}
          <div className="nav-resources">
            <button
              type="button"
              ref={resourceToggle}
              className="resource-toggle"
              aria-expanded={resources}
              aria-controls="resource-links"
              onClick={() => setResources(!resources)}
            >
              Resources <span aria-hidden="true">⌄</span>
            </button>
            <div
              id="resource-links"
              className="resource-links"
              hidden={!resources}
            >
              <Link
                href="/blog"
                onClick={close}
                aria-current={pathname.startsWith("/blog") ? "page" : undefined}
              >
                Guides & articles
                <span>Practical reading before the lease</span>
              </Link>
              <Link href="/methodology" onClick={close}>
                Methodology<span>How evidence informs a decision</span>
              </Link>
            </div>
          </div>
          <Link
            href="/login"
            className="login-link"
            aria-current={pathname === "/login" ? "page" : undefined}
            onClick={close}
          >
            Sign in
          </Link>
          <Link href="/check-location" className="nav-cta" onClick={close}>
            Check a Location <Arrow />
          </Link>
        </nav>
      </div>
    </header>
  );
}
