import { useRouter } from "next/router";

function GenerateQrRedirectionPage() {
  const router = useRouter();
  const shortId = router.query.shortId;

  return <h1>QR link redirection page {`${shortId}`}</h1>;
}

export default GenerateQrRedirectionPage;
