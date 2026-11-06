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

/**
 * The graph a product landing emits: SoftwareApplication, FAQ, breadcrumb and WebPage.
 *
 * No `aggregateRating`: Google's review-snippet policy requires the reviews to be visible on the
 * page itself. The offer points at `/pricing` because plan prices come from the API.
 */
export function productPage({
  path,
  name,
  title,
  description,
  subCategory,
  featureList,
  faqs,
}: Readonly<{
  path: string;
  /** The product's name in the breadcrumb and `SoftwareApplication`, e.g. "WhatsApp Loyalty". */
  name: string;
  /** The `WebPage` name; the page's `<title>` without the brand suffix. */
  title: string;
  description: string;
  subCategory: string;
  featureList: readonly string[];
  faqs: readonly { question: string; answer: string }[];
}>): JsonLdObject {
  return graph(
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE_URL}${path}#software`,
      name: `RateUp ${name}`,
      url: `${BASE_URL}${path}`,
      description,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: subCategory,
      operatingSystem: "Web, Android, iOS",
      featureList,
      offers: {
        "@type": "Offer",
        url: `${BASE_URL}/pricing`,
        availability: "https://schema.org/InStock",
      },
      publisher,
    },
    faqPage(faqs),
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Products", path: "/products/whatsapp-business-api" },
      { name, path },
    ]),
    webPage(path, title, description),
  );
}
