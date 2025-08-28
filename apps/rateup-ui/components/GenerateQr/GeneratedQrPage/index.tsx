"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  Box,
  Button,
  Center,
  CopyButton,
  Flex,
  Group,
  Loader,
  Stack,
  TextInput,
} from "@mantine/core";
import { useThrottledCallback } from "@mantine/hooks";
import { IconCopy, IconDeviceFloppy, IconEdit } from "@tabler/icons-react";
import {
  useGetQrWithShortUrlId,
  useUpdateQrMutation,
} from "backend/generateQr/generateQr.query";
import RefreshButton from "components/Button/RefreshButton";
import ShareQR from "components/Survey/ShareSurvey/ShareQR";
import { CopyLinkComponent } from "components/Survey/ShareSurvey/ShareSurvey";
import { useTranslations } from "next-intl";

import styles from "./GeneratedQrPage.module.css";

function GeneratedQrPage({}) {
  const params = useParams();
  const shortUrlId = params.shortUrlId as string;

  const translations = useTranslations();
  const { isPending, isError, data } = useGetQrWithShortUrlId(shortUrlId);
  const updateQrMutation = useUpdateQrMutation(shortUrlId);

  const qrUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/qr/${shortUrlId}`;
  const [destinationUrl, setDestinationUrl] = useState(data?.link);
  const [isDestinationUrlEditable, setIsDestinationUrlEditable] =
    useState(false);
  const destinationUrlFromApi = data?.link || "";
  const isDestinationUrlFromApiAndDestinationUrlSame =
    destinationUrlFromApi === destinationUrl;
  const [isSaving, setIsSaving] = useState(false);

  const destinationUrlInputRef = useRef(null);
  let componentToBeRendered = null;

  const onDestinationUrlInputChange = (e) => {
    setDestinationUrl(e.target.value);
  };

  const handleSaveDestinationUrl = async () => {
    try {
      if (!isDestinationUrlFromApiAndDestinationUrlSame) {
        setIsSaving(true);
        await updateQrMutation.mutateAsync({
          shortUrlId,
          link: destinationUrl,
        });
        setIsDestinationUrlEditable(false);
        setIsSaving(false);
      }
    } catch (err) {
      setDestinationUrl(data?.link || "");
      setIsDestinationUrlEditable(false);
    }
  };

  const handleEditSaveBtnClick = () => {
    setIsDestinationUrlEditable(true);
    destinationUrlInputRef.current?.focus();
    handleSaveDestinationUrl();
  };

  useEffect(() => {
    setDestinationUrl(data?.link);
  }, [data]);

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
        <p>{translations("Unable to get data, please try again later")}</p>
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
            <Group className={styles["destination-link-input-root-div"]}>
              <TextInput
                ref={destinationUrlInputRef}
                className={styles["destination-url-text-input"]}
                label={translations("Destination Url")}
                value={destinationUrl}
                onChange={onDestinationUrlInputChange}
                readOnly={!isDestinationUrlEditable}
                onBlur={() => {
                  handleSaveDestinationUrl();
                  setIsDestinationUrlEditable(false);
                }}
              />
              <Button
                className={`${styles["destination-input-edit-btn"]}`}
                rightSection={
                  isDestinationUrlFromApiAndDestinationUrlSame ? (
                    <IconEdit size={"1.5rem"} />
                  ) : (
                    <IconDeviceFloppy size={"1.5rem"} />
                  )
                }
                onClick={handleEditSaveBtnClick}
                loading={isSaving}
              >
                {isDestinationUrlFromApiAndDestinationUrlSame
                  ? translations("Edit")
                  : translations("Save")}
              </Button>
            </Group>

            <CopyLinkComponent value={qrUrl} label={translations("QR Url")} />
          </Stack>

          <Flex className={styles["stats-container"]}>
            <h2>{translations("Stats:")}</h2>
            <Group className={styles["no-of-scans-div"]}>
              <h2 className={styles["no-of-scans-p"]}>
                {translations("No of Scans: ")}
              </h2>
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
