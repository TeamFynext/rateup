"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  useGetQrWithShortUrlIdPublic,
  useIncrementNoOfScansMutation,
} from "@/backend/generateQr/generateQr.query";

function GenerateQrRedirectionPage() {
  const params = useParams();
  const shortId = params.shortId as string;

  const { isPending, isError, data } = useGetQrWithShortUrlIdPublic(shortId);

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

export default GenerateQrRedirectionPage;
