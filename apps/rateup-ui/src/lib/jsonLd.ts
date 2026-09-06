import type { JsonLdObject } from "@/lib/metadata.ts";
import { BASE_URL } from "@/lib/metadata.ts";
import { rateupLogoOg } from "@/utils/constants.ts";

/**
 * Schema.org builders shared by the marketing pages.
 *
 * The FAQ and breadcrumb graphs are built from the same arrays the page renders, so the markup
 * can never claim an answer the page does not show — which is the thing Google penalises.
 */

export const ORGANIZATION_ID = `${BASE_URL}#organization`;

export const organizationRef: JsonLdObject = { "@id": ORGANIZATION_ID };

export const publisher: JsonLdObject = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "RateUp",
  url: BASE_URL,
  logo: { "@type": "ImageObject", url: rateupLogoOg },
};

export function faqPage(faqs: readonly { question: string; answer: string }[]): JsonLdObject {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function breadcrumbList(crumbs: readonly { name: string; path: string }[]): JsonLdObject {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${BASE_URL}${crumb.path}`,
    })),
  };
}

export function webPage(path: string, name: string, description: string): JsonLdObject {
  return {
    "@type": "WebPage",
    "@id": `${BASE_URL}${path}#webpage`,
    url: `${BASE_URL}${path}`,
    name,
    description,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${BASE_URL}#website`,
      url: BASE_URL,
      name: "RateUp",
    },
    publisher: organizationRef,
  };
}

/** Wraps the parts of a page's graph in the single `@graph` each page emits. */
export function graph(...nodes: JsonLdObject[]): JsonLdObject {
  return { "@context": "https://schema.org", "@graph": nodes };
}
