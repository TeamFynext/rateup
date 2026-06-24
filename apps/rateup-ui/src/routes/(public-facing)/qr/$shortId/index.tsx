import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

import {
  useGetQrWithShortUrlIdPublic,
  useIncrementNoOfScansMutation,
} from "@/backend/generateQr/generateQr.query";

export const Route = createFileRoute("/(public-facing)/qr/$shortId/")({
  component: GenerateQrRedirectionPage,
});

function GenerateQrRedirectionPage() {
  const params = useParams({
    strict: false,
  });
  const shortId = params.shortId as string;

  const { data } = useGetQrWithShortUrlIdPublic(shortId);

  const incrementNoOfScansMutation = useIncrementNoOfScansMutation();

  const incrementNoOfScans = async () => {
    if (data) {
      const currentWindowUrl = window.location.href;
      const destinationUrl = data.link;
      const searchParams = new URL(currentWindowUrl).searchParams;
      if (searchParams.has("qr")) {
        await incrementNoOfScansMutation.mutateAsync(shortId);
      }
      window.location.replace(destinationUrl);
    }
  };

  useEffect(() => {
    incrementNoOfScans();
  }, [data]);

  return null;
}
