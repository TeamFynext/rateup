import { createFileRoute } from "@tanstack/react-router";

import { getShareUrlFromSurveyTeamMapId } from "@/backend/whatsapp/whatsapp.api";

import { Redirect } from "@/components/(public-facing)/public/wa/Redirect.tsx";

export const Route = createFileRoute("/(public-facing)/was/$shortId/")({
  loader: async ({ params, location }) => {
    const surveyTeamMapIdOrShortId = params.shortId
      ? params.shortId
      : (params as any).surveyTeamMapId;

    const data = await getShareUrlFromSurveyTeamMapId(surveyTeamMapIdOrShortId);
    const maybeTag = (location.search as Record<string, unknown> | undefined)
      ?.tag;

    return {
      data,
      surveyTeamMapIdOrShortId,
      tag: typeof maybeTag === "string" ? maybeTag : null,
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
