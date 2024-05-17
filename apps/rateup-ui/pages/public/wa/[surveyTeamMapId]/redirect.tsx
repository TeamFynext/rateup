import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useWaShareUrl } from "../../../../backend/whatsapp/whatsapp.query";

export default function Redirect({ shortId = null, tag = null }) {
  const router = useRouter();

  const surveyTeamMapIdOrShortId: string = shortId
    ? shortId
    : (router.query.surveyTeamMapId as string);

  const { data: res, isPending } = useWaShareUrl(surveyTeamMapIdOrShortId);

  useEffect(() => {
    if (!isPending && res?.shareUrl) {
      const url = tag
        ? res.shareUrl + encodeURIComponent(`?t=${tag}`)
        : res.shareUrl;
      if (url) router.push(url);
    }
  }, [isPending, res?.shareUrl, router, tag]);
  if (isPending) return <div>Redirecting to whatsapp...</div>;

  return (
    <Head>
      <title>{`Rateup - Welcome to ${res?.title}`}</title>

      <meta name="description" content={`This is the menu of ${res?.title}`} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Rateup" />
      <meta
        property="og:url"
        content={`https://rateup.app/wa/${surveyTeamMapIdOrShortId}`}
      />
      <meta property="og:title" content={`Rateup - Welcome to ${res?.title}`} />
      <meta
        property="og:description"
        content={`This is the flow of ${res?.title}`}
      />
      <meta
        property="og:image"
        content="https://djd7kjh9uwow0.cloudfront.net/images/rateup_logo.png"
      />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1086" />
      <meta property="og:image:height" content="832" />
      <meta property="og:image:alt" content="Star Icon" />
    </Head>
  );
}
