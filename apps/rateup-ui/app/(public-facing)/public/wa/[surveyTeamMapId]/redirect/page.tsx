"use client";

import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/navigation";

import { Box, Stack } from "@mantine/core";

import RateupLoader from "../../../../../../components/Loaders/RateupLoader";

export default function Redirect({
  tag = null,
  res,
  surveyTeamMapIdOrShortId,
}) {
  const router = useRouter();

  useEffect(() => {
    const url = tag
      ? res?.shareUrl + encodeURIComponent(`?t=${tag}`)
      : res?.shareUrl;
    if (url) router.push(url);
  }, [res?.shareUrl, router, tag]);

  return (
    <>
      <Head>
        <title>{`Rateup - Welcome to ${res?.orgName}`}</title>
        <meta
          name="description"
          content={`This is the menu of ${res?.title}`}
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Rateup" />
        <meta
          property="og:url"
          content={`https://rateup.app/wa/${surveyTeamMapIdOrShortId}`}
        />
        <meta
          property="og:title"
          content={`Rateup - Welcome to ${res?.title}`}
        />
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
      <Stack justify="center" align="center" h={"100dvh"}>
        <Box>
          <RateupLoader />
          <div>Redirecting to whatsapp...</div>
        </Box>
      </Stack>
    </>
  );
}
