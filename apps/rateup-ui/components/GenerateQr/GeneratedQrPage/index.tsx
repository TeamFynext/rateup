import { Box, Center, Flex, Group, Loader, Stack } from "@mantine/core";
import styles from "./GeneratedQrPage.module.css";
import { useRouter } from "next/router";
import { CopyLinkComponent } from "components/Survey/ShareSurvey/ShareSurvey";
import ShareQR from "components/Survey/ShareSurvey/ShareQR";

function GeneratedQrPage({}) {
  const router = useRouter();
  const shortId = router.query.shortId;

  // const { isPending, isError, data } = useGetLandingPageWithShortId(shortUrlId);
  const { isPending, isError, data } = {
    isPending: false,
    isError: false,
    data: {
      id: "d4f76a44-3f55-4a4e-80d2-f987af4b5ef8",
      name: "ZTest",
      createdAt: "2024-06-28T14:53:21.234Z",
      shortId: "pbtnMT9K",
      noOfScans: 4000,
      link: "https://www.speedtest.net/",
      shareSettings: null,
    },
  };

  const qrUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/qr/${shortId}`;
  const destinationUrl = data.link;

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
        <p>Unable to get data, please try again later.</p>
      </Center>
    );
  }

  if (data) {
    componentToBeRendered = (
      <Stack className={styles["generated-qr-page-div"]}>
        <h1 className={styles["landingPage-name-h1"]}>{data.name}</h1>
        <Group className={styles["copy-link-comp-and-stats-container"]}>
          <Stack className={styles["copy-link-comp-container-div"]}>
            <CopyLinkComponent value={qrUrl} label="QR Url" />
            <CopyLinkComponent value={destinationUrl} label="Destination Url" />
          </Stack>

          {/* <Flex className={styles["stats-container"]}>
            <h2>Stats</h2>
            <Group className={styles["no-of-scans-div"]}>
              <h2 className={styles["no-of-scans-p"]}>No of Scans: </h2>
              <p className={styles["no-of-scans-value-p"]}>{data.noOfScans}</p>
            </Group>
          </Flex> */}
        </Group>

        <Box className={styles["qr-container"]}>
          <ShareQR url={qrUrl} title={data.name} isPublished={true} />
        </Box>
      </Stack>
    );
  }

  return (
    <Stack className={styles["generated-qr-page-root-div"]}>
      {componentToBeRendered}
    </Stack>
  );
}

export default GeneratedQrPage;
