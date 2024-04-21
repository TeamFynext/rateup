import { useRouter } from "next/router";
import { useWaShareUrl } from "../../../../backend/whatsapp/whatsapp.query";

export default function Redirect({ shortId = null, tag = null }) {
  const router = useRouter();

  const surveyTeamMapIdOrShortId: string = shortId
    ? shortId
    : (router.query.surveyTeamMapId as string);

  const { data: res, isLoading } = useWaShareUrl(surveyTeamMapIdOrShortId);

  if (isLoading) return <div>Redirecting to whatsapp...</div>;

  const url = tag
    ? res?.shareUrl + encodeURIComponent(`?t=${tag}`)
    : res?.shareUrl;
  if (url) {
    router.push(url);
  }
}
