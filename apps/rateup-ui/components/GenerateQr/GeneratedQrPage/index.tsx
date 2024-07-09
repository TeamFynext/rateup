import {
  ActionIcon,
  Box,
  Center,
  Flex,
  Group,
  Loader,
  Stack,
} from "@mantine/core";
import styles from "./GeneratedQrPage.module.css";
import { useRouter } from "next/router";
import { CopyLinkComponent } from "components/Survey/ShareSurvey/ShareSurvey";
import ShareQR from "components/Survey/ShareSurvey/ShareQR";
import { useGetQrWithShortUrlId } from "backend/generateQr/generateQr.query";
import { IconRefresh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import RefreshButton from "components/Button/RefreshButton";

function GeneratedQrPage({}) {
  const router = useRouter();
  const shortUrlId = router.query.shortUrlId;

  const { isPending, isError, data } = useGetQrWithShortUrlId(shortUrlId);

  const qrUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/qr/${shortUrlId}`;
  const destinationUrl = data?.link;

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
        <Group>
          <h1 className={styles["landingPage-name-h1"]}>{data.name}</h1>
          <RefreshButton queryKeys={["generatedQr", shortUrlId as string]} />
        </Group>
        <Group className={styles["copy-link-comp-and-stats-container"]}>
          <Stack className={styles["copy-link-comp-container-div"]}>
            <CopyLinkComponent value={qrUrl} label="QR Url" />
            <CopyLinkComponent value={destinationUrl} label="Destination Url" />
          </Stack>

          <Flex className={styles["stats-container"]}>
            <h2>Stats:</h2>
            <Group className={styles["no-of-scans-div"]}>
              <h2 className={styles["no-of-scans-p"]}>No of Scans: </h2>
              <p className={styles["no-of-scans-value-p"]}>{data.noOfScans}</p>
            </Group>
          </Flex>
        </Group>

        <Box className={styles["qr-container"]}>
          <ShareQR
            url={qrUrl + "?qr=1"}
            title={data.name}
            isPublished={true}
            id={data.id}
            queryKey="qrShareSettings"
            resourceName="generateQr"
          />
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
