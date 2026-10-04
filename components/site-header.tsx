"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Wordmark } from "./ui";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/sample-report", label: "Sample Report" },
];
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          menu.current?.focus();
        }
      }}
    >
      <div className="header-inner">
        <Link href="/" aria-label="SiteFit home" onClick={() => setOpen(false)}>
          <Wordmark />
        </Link>
        <button
          type="button"
          className="menu-toggle"
          ref={menu}
          aria-expanded={open}
          aria-controls="public-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
          <span aria-hidden="true">{open ? "×" : "☰"}</span>
        </button>
        <nav
          id="public-navigation"
          aria-label="Main navigation"
          className={open ? "public-nav is-open" : "public-nav"}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname.startsWith(link.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="login-link"
            aria-current={pathname === "/login" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            Login
          </Link>
          <Link
            href="/check-location"
            className="nav-cta"
            onClick={() => setOpen(false)}
          >
            Check a Location <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
