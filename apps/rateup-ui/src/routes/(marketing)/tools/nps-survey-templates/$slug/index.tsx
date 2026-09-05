import { createFileRoute, notFound } from "@tanstack/react-router";

import NpsTemplateDetail from "@/components/HomePage/pages/Tools/NpsSurveyTemplates/TemplateDetail.tsx";
import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import { getNpsTemplate } from "@/config/npsTemplates.ts";
import { buildBreadcrumbJsonLd, TOOLS_SITE_URL, toolPath } from "@/config/tools.ts";
import { rateupLogoOg } from "@/utils/constants.ts";

const SLUG = "nps-survey-templates";

export const Route = createFileRoute("/(marketing)/tools/nps-survey-templates/$slug/")({
  loader: ({ params }) => {
    const template = getNpsTemplate(params.slug);
    if (!template) throw notFound();
    return { template };
  },
  component: NpsTemplateDetailPage,
  /**
   * Metadata is derived per template rather than sitting in `pageMetadata`,
   * because every entry in `NPS_TEMPLATES` gets its own indexable page and
   * duplicating 16 near-identical blocks there would rot the moment one changes.
   */
  head: ({ params }) => {
    const template = getNpsTemplate(params.slug);
    if (!template) return {};

    const title = `${template.industry} NPS Survey Template | RateUp`;
    const description = `A ready-to-send NPS survey for ${template.industry.toLowerCase()}: the rating question, follow-ups for promoters, passives and detractors, and when to send it. No signup.`;
    const url = `${TOOLS_SITE_URL}${toolPath(SLUG)}/${template.slug}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: rateupLogoOg },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: rateupLogoOg },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "HowTo",
                "@id": `${url}#howto`,
                name: `How to run an NPS survey for ${template.industry.toLowerCase()}`,
                description,
                step: [
                  {
                    "@type": "HowToStep",
                    name: "Ask the rating question",
                    text: template.ratingQuestion,
                  },
                  {
                    "@type": "HowToStep",
                    name: "Send it at the right moment",
                    text: template.timing,
                  },
                  {
                    "@type": "HowToStep",
                    name: "Branch the follow-up by score",
                    text: `Promoters: ${template.followUps.promoter} Passives: ${template.followUps.passive} Detractors: ${template.followUps.detractor}`,
                  },
                ],
              },
              buildBreadcrumbJsonLd([
                { name: "Home", url: TOOLS_SITE_URL },
                { name: "Tools", url: `${TOOLS_SITE_URL}/tools` },
                { name: "NPS Survey Templates", url: `${TOOLS_SITE_URL}${toolPath(SLUG)}` },
                { name: template.industry, url },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function NpsTemplateDetailPage() {
  const { template } = Route.useLoaderData();

  return (
    <ToolsShell
      activeSlug={SLUG}
      title={`${template.industry} NPS survey template`}
      description={`The rating question, the three follow-ups that matter, and the moment to send it — written for ${template.industry.toLowerCase()}.`}
      crumb={{ label: template.industry }}
    >
      <NpsTemplateDetail template={template} />
    </ToolsShell>
  );
}
