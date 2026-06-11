import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import { getShareUrlFromSurveyTeamMapId } from "@/backend/whatsapp/whatsapp.api";
import { Redirect } from "@/components/(public-facing)/public/wa/Redirect.tsx";

export const Route = createFileRoute("/(public-facing)/was/$shortId/")({
  validateSearch: z.object({
    tag: z.string().optional(),
  }),
  loaderDeps: ({ search: { tag } }) => ({ tag }),
  loader: async ({ params, deps: { tag } }) => {
    const surveyTeamMapIdOrShortId = params.shortId
      ? params.shortId
      : (params as any).surveyTeamMapId;

    const data = await getShareUrlFromSurveyTeamMapId(surveyTeamMapIdOrShortId);

    return {
      data,
      surveyTeamMapIdOrShortId,
      tag: typeof tag === "string" ? tag : null,
    };
  },
  component: Was,
});

function Was() {
  const { data, surveyTeamMapIdOrShortId, tag } = Route.useLoaderData();

  return (
    <Redirect
      tag={tag}
      res={data}
      surveyTeamMapIdOrShortId={surveyTeamMapIdOrShortId}
    />
  );
}
