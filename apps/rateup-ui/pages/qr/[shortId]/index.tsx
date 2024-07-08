import { Anchor, Box, Center, Image, Loader, Stack } from "@mantine/core";
import {
  useGetQrWithShortUrlIdPublic,
  useIncrementNoOfScansMutation,
} from "backend/generateQr/generateQr.query";
import Link from "next/link";
import { useRouter } from "next/router";
import { imagesPath } from "utils/constants";
import styles from "./qr.module.css";
import { useEffect } from "react";

function GenerateQrRedirectionPage() {
  const router = useRouter();
  const shortId = router.query.shortId;

  const { isPending, isError, data } = useGetQrWithShortUrlIdPublic(shortId);

  const incrementNoOfScansMutation = useIncrementNoOfScansMutation();

  useEffect(() => {
    if (data) {
      const destinationUrl = data.link;
      const searchParams = new URL(destinationUrl).searchParams;
      if (searchParams.has("qr")) {
        incrementNoOfScansMutation.mutate(shortId);
      }
      window.location.replace(data.link);
    }
  }, [data]);

  let componentToBeRendered = null;

  if (isPending) {
    componentToBeRendered = (
      <Center w={"100%"} h={"100%"}>
        <Loader type="bars" />
      </Center>
    );
  }

  if (isError) {
    componentToBeRendered = (
      <Center w={"100%"} h={"100%"}>
        <p>Something went wrong, please try again later.</p>
      </Center>
    );
  }

  if (data) {
    componentToBeRendered = (
      <p className={styles["redirection-text-p"]}>
        <span>Redirecting, please wait...</span>
        <Anchor href={`${data.link}`} underline="always">
          please click here, if you are not redirected automatically.
        </Anchor>
      </p>
    );
  }

  return (
    <Stack className={styles["qr-redirection-page-root-div"]}>
      <Link href="/">
        <Image w={80} src={`${imagesPath}/rateup-logo-blue-text.svg`} />
      </Link>
      <Box className={styles["content-container"]}>{componentToBeRendered}</Box>
    </Stack>
  );
}

export default GenerateQrRedirectionPage;
