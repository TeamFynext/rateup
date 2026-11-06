import { createFileRoute } from "@tanstack/react-router";

import { Redirect } from "@/components/(public-facing)/public/wa/Redirect.tsx";
import { optionalString } from "@/utils/search.ts";

export const Route = createFileRoute("/(public-facing)/was/$shortId/")({
  validateSearch: (search: Record<string, unknown>): { tag?: string } => ({
    tag: optionalString(search.tag),
  }),
  loaderDeps: ({ search: { tag } }) => ({ tag }),
  loader: async ({ params, deps: { tag } }) => {
    const surveyTeamMapIdOrShortId = params.shortId;

    // Imported here: route options land in the client entry, and this brings axios.
    const { getShareUrlFromSurveyTeamMapId } = await import("@/backend/whatsapp/whatsapp.api");
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
  const { data, tag } = Route.useLoaderData();

  return <Redirect tag={tag} res={data} />;
}
