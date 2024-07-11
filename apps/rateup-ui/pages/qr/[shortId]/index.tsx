import {
  useGetQrWithShortUrlIdPublic,
  useIncrementNoOfScansMutation,
} from "backend/generateQr/generateQr.query";
import { useRouter } from "next/router";
import { useEffect } from "react";

function GenerateQrRedirectionPage() {
  const router = useRouter();
  const shortId = router.query.shortId;

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
