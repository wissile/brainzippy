/**
 * JSON-LD builders. Only types that describe the page truthfully are emitted (see docs/SEO_STRATEGY.md
 * for which ones Google supports as rich results and which are schema.org convention only).
 */
import { SITE, absoluteUrl } from "./entity";
import type { Crumb } from "./types";
import type { Faq } from "./content/faq";
import type { Guide } from "./content/guides";
import { REFERENCES } from "./content/references";

const ORG_ID = `${SITE.origin}/#organization`;
const SITE_ID = `${SITE.origin}/#website`;

export const organization = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE.name,
  url: absoluteUrl("/"),
  logo: absoluteUrl(SITE.logoPath),
  description: SITE.definition,
  email: SITE.email,
});

export const website = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": SITE_ID,
  name: SITE.name,
  url: absoluteUrl("/"),
  inLanguage: "en",
  publisher: { "@id": ORG_ID },
});

export const breadcrumbList = (trail: readonly Crumb[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
});

export const faqPage = (items: readonly Faq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export const article = (g: Guide, path: string, image: string) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: g.title,
  description: g.description,
  image: [absoluteUrl(image)],
  datePublished: g.published,
  dateModified: g.updated,
  inLanguage: "en",
  mainEntityOfPage: absoluteUrl(path),
  author: { "@type": "Organization", "@id": ORG_ID, name: SITE.name, url: absoluteUrl("/about") },
  publisher: { "@id": ORG_ID },
  citation: g.refs.map((k) => REFERENCES[k].url),
});

/** schema.org LearningResource: no Google rich result; kept because it states the page's facts in a machine-readable way. */
export const learningResource = (o: { name: string; description: string; path: string; ages: readonly [number, number]; teaches: readonly string[]; image: string }) => ({
  "@context": "https://schema.org",
  "@type": "LearningResource",
  name: o.name,
  description: o.description,
  url: absoluteUrl(o.path),
  image: absoluteUrl(o.image),
  learningResourceType: "Educational game",
  educationalLevel: `Ages ${o.ages[0]}–${o.ages[1]}`,
  typicalAgeRange: `${o.ages[0]}-${o.ages[1]}`,
  teaches: o.teaches,
  inLanguage: "en",
  interactivityType: "active",
  provider: { "@id": ORG_ID },
});
