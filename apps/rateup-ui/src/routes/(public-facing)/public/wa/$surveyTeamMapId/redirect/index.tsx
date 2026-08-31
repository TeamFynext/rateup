import { createFileRoute } from "@tanstack/react-router";

import { Redirect } from "@/components/(public-facing)/public/wa/Redirect.tsx";
import { rateupLogoOg } from "@/utils/constants.ts";

export const Route = createFileRoute("/(public-facing)/public/wa/$surveyTeamMapId/redirect/")({
  component: Redirect,
  head: ({ params }) => ({
    meta: [
      { title: "Rateup - Welcome" },
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "description",
        content: "This is the menu flow",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:site_name",
        content: "Rateup",
      },
      {
        property: "og:url",
        content: `https://rateup.app/wa/${params.surveyTeamMapId}`,
      },
      {
        property: "og:title",
        content: "Rateup - Welcome",
      },
      {
        property: "og:description",
        content: "This is the flow",
      },
      {
        property: "og:image",
        content: rateupLogoOg,
      },
      {
        property: "og:image:type",
        content: "image/png",
      },
      {
        property: "og:image:width",
        content: "1086",
      },
      {
        property: "og:image:height",
        content: "832",
      },
      {
        property: "og:image:alt",
        content: "Star Icon",
      },
    ],
  }),
});
