import type { ReactNode } from "react";

export interface Crumb {
  name: string;
  path: string;
}

export interface PageDef {
  /** Canonical path without trailing slash ("/" for the home page). */
  path: string;
  title: string;
  description: string;
  /** ISO date of the last meaningful content change (sitemap <lastmod>). */
  updated: string;
  breadcrumbs: readonly Crumb[];
  jsonLd: readonly object[];
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: "website" | "article";
  bodyClass?: string;
  render: () => ReactNode;
}

export interface SiteAssets {
  css: string;
  js: string;
  preloadFont: string;
}

export interface RenderedPage {
  path: string;
  /** Output file relative to the client build directory. */
  file: string;
  html: string;
  updated: string;
}
