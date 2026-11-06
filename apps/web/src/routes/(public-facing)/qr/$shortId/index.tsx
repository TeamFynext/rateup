import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

import {
  useGetQrWithShortUrlIdPublic,
  useIncrementNoOfScansMutation,
} from "@/backend/generateQr/generateQr.query";
import { safeHttpUrl } from "@/utils/safeRedirectUrl.ts";

export const Route = createFileRoute("/(public-facing)/qr/$shortId/")({
  component: GenerateQrRedirectionPage,
});

function GenerateQrRedirectionPage(): null {
  const params = useParams({
    strict: false,
  });
  const shortId = params.shortId as string;

  const { data } = useGetQrWithShortUrlIdPublic(shortId);

  const incrementNoOfScansMutation = useIncrementNoOfScansMutation();

  const incrementNoOfScans = async () => {
    if (data) {
      const currentWindowUrl = window.location.href;
      // The API validates the scheme on save; this guards rows stored before that (or any
      // other path) from turning the short link into a `javascript:` / `data:` navigation.
      const destinationUrl = safeHttpUrl(data.link);
      const searchParams = new URL(currentWindowUrl).searchParams;
      if (searchParams.has("qr")) {
        await incrementNoOfScansMutation.mutateAsync(shortId);
      }
      if (destinationUrl) window.location.replace(destinationUrl);
    }
  };

  useEffect(() => {
    incrementNoOfScans();
  }, [data]);

  return null;
}
