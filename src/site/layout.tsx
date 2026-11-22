import type { ReactNode } from "react";
import { SITE, absoluteUrl } from "./entity";
import type { PageDef, SiteAssets } from "./types";

const fullTitle = (t: string) => (t.includes(SITE.name) ? t : `${t} | ${SITE.name}`);

/** Serialise JSON-LD safely inside a <script> element. */
export const jsonLdText = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");

export function Logo() {
  return (
    <a className="logo" href="/" aria-label="BrainZippy home">
      <span className="logo-b">Brain</span>
      <span className="logo-z">Zippy</span>
      <svg viewBox="0 0 40 60" width="18" height="27" aria-hidden="true">
        <path d="M24 2 L6 34 H20 L14 58 L34 22 H20 Z" fill="#FFD43B" stroke="#2B2140" strokeWidth="4" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" fill="currentColor" />
  </svg>
);

/** The child's way in. /hello runs first-time onboarding; site.js points returning players at /map. */
export function PlayLink({ big = false, label = "Play" }: { big?: boolean; label?: string }) {
  return (
    <a className={big ? "play play-big" : "play"} href="/hello" data-play="" data-testid={big ? "site-play" : undefined}>
      <PlayIcon />
      <span>{label}</span>
    </a>
  );
}

const NAV = [
  { href: "/games", label: "Games" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/guides", label: "Guides" },
  { href: "/for-parents", label: "Parents" },
  { href: "/for-teachers", label: "Teachers" },
  { href: "/research", label: "Research" },
];

function Header({ path }: { path: string }) {
  return (
    <header className="site-header">
      <div className="wrap header-row">
        <Logo />
        <PlayLink />
      </div>
      <nav className="wrap site-nav" aria-label="Main">
        <ul>
          {NAV.map((n) => (
            <li key={n.href}>
              <a href={n.href} aria-current={path === n.href || path.startsWith(`${n.href}/`) ? "page" : undefined}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <p className="footer-brand">{SITE.name}</p>
          <p>{SITE.short}</p>
          <p>No ads, no chat, no third-party trackers.</p>
          <p>Contact: <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
        </div>
        <nav aria-label="Footer">
          <ul>
            <li><a href="/about">About</a></li>
            <li><a href="/faq">FAQ</a></li>
            {SITE.billing && <li><a href="/pricing">Pricing</a></li>}
            <li><a href="/for-parents">For parents</a></li>
            <li><a href="/for-teachers">For teachers</a></li>
            <li><a href="/research">Research</a></li>
            <li><a href="/guides">Parent guides</a></li>
            <li><a href="/games">All games</a></li>
            <li><a href="/libraries/math">Maths games</a></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

export function Breadcrumbs({ trail }: { trail: PageDef["breadcrumbs"] }) {
  if (trail.length < 2) return null;
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        {trail.map((c, i) => (
          <li key={c.path}>{i === trail.length - 1 ? <span aria-current="page">{c.name}</span> : <a href={c.path}>{c.name}</a>}</li>
        ))}
      </ol>
    </nav>
  );
}

export function Document({ page, assets, children }: { page: PageDef; assets: SiteAssets; children: ReactNode }) {
  const url = absoluteUrl(page.path);
  const image = absoluteUrl(page.ogImage ?? SITE.defaultOgImage);
  const title = fullTitle(page.title);
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={page.description} />
        <link rel="canonical" href={url} />
        <meta name="theme-color" content="#8FD3FF" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preload" href={assets.preloadFont} as="font" type="font/woff2" crossOrigin="" />
        <style dangerouslySetInnerHTML={{ __html: assets.css }} />
        <meta property="og:site_name" content={SITE.name} />
        <meta property="og:type" content={page.ogType ?? "website"} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={page.ogImageAlt ?? `${SITE.name}: ${page.title}`} />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.title} />
        <meta name="twitter:description" content={page.description} />
        <meta name="twitter:image" content={image} />
        {page.ogType === "article" && <meta property="article:modified_time" content={page.updated} />}
        {page.jsonLd.map((o, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(o) }} />
        ))}
        <script src={assets.js} defer />
      </head>
      <body className={page.bodyClass}>
        <a className="skip" href="#main">Skip to content</a>
        <Header path={page.path} />
        <main id="main">
          <div className="wrap">
            <Breadcrumbs trail={page.breadcrumbs} />
          </div>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
