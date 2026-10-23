"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import { Wordmark, Arrow } from "./ui";
import { Icon, type IconName } from "./icon";
import {createBrowserSupabase} from "@/lib/supabase/browser";
import type {PublicSupabaseConfig} from "@/lib/supabase/config";
import {observeAccountIdentity} from "@/lib/auth/navigation";
import { formatPrice, site } from "@/lib/site-config";

const links: {href: string; label: string; icon: IconName; detail: string}[] = [
  {href: "/how-it-works", label: "How it works", icon: "evidence", detail: "From an address to a clearer decision"},
  {href: "/pricing", label: "Pricing", icon: "cost", detail: `Start free. Go deeper for ${formatPrice(site.pricing.fullReport)}`},
  {href: "/sample-report", label: "Sample Report", icon: "document", detail: "Explore an illustrative example"},
];
const resources: {href: string; label: string; icon: IconName; detail: string}[] = [
  {href: "/blog", label: "Guides & articles", icon: "document", detail: "Practical reading before the lease"},
  {href: "/methodology", label: "Methodology", icon: "shield", detail: "How evidence informs a decision"},
  {href: "/contact", label: "Help & contact", icon: "help", detail: "Find the right next step"},
];

export function SiteHeader({authConfig=null}:{authConfig?:PublicSupabaseConfig|null}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false), [resourceOpen, setResourceOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const [signedIn,setSignedIn]=useState(false);
  useEffect(()=>{
    if(!authConfig)return;
    const client=createBrowserSupabase(authConfig);
    return observeAccountIdentity(client.auth,setSignedIn);
  },[authConfig]);
  const accountHref=signedIn?'/account':'/login';
  const accountLabel=signedIn?'Account':'Sign in';
  const accountIcon:IconName=signedIn?'demand':'login';
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1100px)");
    const resize = () => { if (desktop.matches) setOpen(false); else setResourceOpen(false); };
    desktop.addEventListener("change", resize);
    return () => desktop.removeEventListener("change", resize);
  }, []);
  if (pathname.startsWith("/reports/") || pathname.startsWith("/dev/report")) return null;
  const current = (href: string) => pathname.startsWith(href) ? "page" as const : undefined;
  const close = () => { setOpen(false); setResourceOpen(false); };
  return <header className="site-header"><div className="header-inner">
    <Link href="/" aria-label="SiteFit home" onClick={close}><Wordmark /></Link>
    <nav className="public-nav" aria-label="Main navigation">
      {links.map(l => <Link key={l.href} href={l.href} aria-current={current(l.href)}>{l.label}</Link>)}
      <Popover.Root open={resourceOpen} onOpenChange={setResourceOpen}>
        <Popover.Trigger className="resource-toggle">Resources <Icon name="down" /></Popover.Trigger>
        <Popover.Portal><Popover.Positioner sideOffset={12} className="brand-resource-positioner">
          <Popover.Popup className="brand-resource-popup" aria-label="Resources">
            {resources.map(l => <Link key={l.href} href={l.href} aria-current={current(l.href)} onClick={close}><Icon name={l.icon}/><span><b>{l.label}</b><small>{l.detail}</small></span><Icon name="external"/></Link>)}
          </Popover.Popup>
        </Popover.Positioner></Popover.Portal>
      </Popover.Root>
      <Link href={accountHref} className="login-link" aria-current={current(accountHref)}><Icon name={accountIcon}/> {accountLabel}</Link>
      <Link href="/check-location" className="nav-cta">Check a Location <Arrow /></Link>
    </nav>
    <Dialog.Root open={open} onOpenChange={(next, details) => { setInstant(details.event instanceof KeyboardEvent || (details.event instanceof MouseEvent && details.event.detail === 0)); setOpen(next); }}>
      <Dialog.Trigger className="menu-toggle" aria-label="Open navigation menu">Menu <Icon name="menu"/></Dialog.Trigger>
      <Dialog.Portal><Dialog.Backdrop className="brand-menu-backdrop" data-instant={instant || undefined}/>
        <Dialog.Popup className="brand-menu-popup" data-instant={instant || undefined}>
          <div className="brand-menu-top"><Link href="/" aria-label="SiteFit home" onClick={close}><Wordmark/></Link><Dialog.Close className="brand-icon-button" aria-label="Close navigation menu"><Icon name="close"/></Dialog.Close></div>
          <Dialog.Title className="sr-only">SiteFit navigation</Dialog.Title>
          <Dialog.Description className="brand-menu-label">Check the location before you sign.</Dialog.Description>
          <nav aria-label="Mobile navigation" className="brand-mobile-links">
            {links.map(l => <Link key={l.href} href={l.href} aria-current={current(l.href)} onClick={close}><span className="brand-nav-icon"><Icon name={l.icon}/></span><span><b>{l.label}</b><small>{l.detail}</small></span><Arrow/></Link>)}
            <span className="brand-menu-label">EXPLORE SITEFIT</span>
            {resources.map(l => <Link key={l.href} href={l.href} aria-current={current(l.href)} onClick={close}><span className="brand-nav-icon"><Icon name={l.icon}/></span><span><b>{l.label}</b></span><Icon name="external"/></Link>)}
          </nav>
          <div className="brand-menu-actions"><Link href={accountHref} className="button button-secondary" aria-current={current(accountHref)} onClick={close}><Icon name={accountIcon}/> {accountLabel}</Link><Link href="/check-location" className="button button-primary" onClick={close}>Check a Location <Arrow/></Link></div>
          <div className="brand-menu-legal"><Link href="/privacy" onClick={close}>Privacy</Link><Link href="/terms" onClick={close}>Terms</Link></div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  </div></header>;
}
