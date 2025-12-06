"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  Box,
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
import {
  ArrowLeft,
  Copy,
  Edit,
  ExternalLink,
  Palette,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import styles from "./GeneratedQrPage.module.css";

function GeneratedQrPages({}) {
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

  // if (data) {
  //   componentToBeRendered = (
  //     <Stack className={styles["generated-qr-page-div"]}>
  //       <Group>
  //         <h1 className={styles["landingPage-name-h1"]}>{data.name}</h1>
  //         <RefreshButton queryKeys={["generatedQr", shortUrlId as string]} />
  //       </Group>
  //       <Group className={styles["copy-link-comp-and-stats-container"]}>
  //         <Stack className={styles["copy-link-comp-container-div"]}>
  //           <Group className={styles["destination-link-input-root-div"]}>
  //             <TextInput
  //               ref={destinationUrlInputRef}
  //               className={styles["destination-url-text-input"]}
  //               label={translations("Destination Url")}
  //               value={destinationUrl}
  //               onChange={onDestinationUrlInputChange}
  //               readOnly={!isDestinationUrlEditable}
  //               onBlur={() => {
  //                 handleSaveDestinationUrl();
  //                 setIsDestinationUrlEditable(false);
  //               }}
  //             />
  //             <Button
  //               className={`${styles["destination-input-edit-btn"]}`}
  //               rightSection={
  //                 isDestinationUrlFromApiAndDestinationUrlSame ? (
  //                   <IconEdit size={"1.5rem"} />
  //                 ) : (
  //                   <IconDeviceFloppy size={"1.5rem"} />
  //                 )
  //               }
  //               onClick={handleEditSaveBtnClick}
  //               loading={isSaving}
  //             >
  //               {isDestinationUrlFromApiAndDestinationUrlSame
  //                 ? translations("Edit")
  //                 : translations("Save")}
  //             </Button>
  //           </Group>

  //           <CopyLinkComponent value={qrUrl} label={translations("QR Url")} />
  //         </Stack>

  //         <Flex className={styles["stats-container"]}>
  //           <h2>{translations("Stats:")}</h2>
  //           <Group className={styles["no-of-scans-div"]}>
  //             <h2 className={styles["no-of-scans-p"]}>
  //               {translations("No of Scans: ")}
  //             </h2>
  //             <p className={styles["no-of-scans-value-p"]}>{data.noOfScans}</p>
  //           </Group>
  //         </Flex>
  //       </Group>

  //       <Box className={styles["qr-container"]}>
  //         <ShareQR
  //           url={qrUrl + "?qr=1"}
  //           title={data.name}
  //           isPublished={true}
  //           id={data.id}
  //           queryKey="qrShareSettings"
  //           resourceName="generateQr"
  //         />
  //       </Box>
  //     </Stack>
  //   );
  // }

  return (
    <Stack className={styles["generated-qr-page-root-div"]}>
      {componentToBeRendered}
    </Stack>
  );
}

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
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (data) {
    componentToBeRendered = (
      <div className="flex flex-col gap-8 items-center">
        <div className="w-full border-b shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <h1 className="text-base font-semibol">{data?.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 bg-blue-50 dark:bg-transparent rounded-lg border border-blue-200">
                <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400">
                  Editor Mode
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* main */}
        <div className="flex items-center justify-between px-10 min-w-6xl shadow-sm border rounded-xl py-2 gap-10">
          <div className="flex-1 space-y-2">
            {/* Destination URL */}
            <div className="group">
              <Label
                htmlFor="destination-url"
                className="text-[10px] font-semibold flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3 text-primary" />
                Destination URL
              </Label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Input
                    id="destination-url"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    disabled={!isDestinationUrlEditable}
                    className="flex-1 h-8 text-xs disabled:opacity-50"
                  />
                </div>
                <Button
                  onClick={handleEditSaveBtnClick}
                  className="bg-primary px-3 h-8 min-w-32 rounded-lg text-xs shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  {isDestinationUrlFromApiAndDestinationUrlSame
                    ? "Edit"
                    : "Save"}
                </Button>
              </div>
            </div>

            {/* QR URL */}
            <div className="group">
              <Label
                htmlFor="qr-url"
                className="text-[10px] font-semibold mb-1 text-gray-700 flex items-center gap-1"
              >
                <Copy className="w-3 h-3 text-[#2E5BFF]" />
                QR URL
              </Label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Input
                    id="qr-url"
                    value={qrUrl}
                    readOnly
                    className="flex-1 h-8 bg-gradient-to-r from-gray-50 to-blue-50/30 border-gray-300 text-xs font-mono"
                  />
                </div>
                <Button
                  onClick={handleCopy}
                  className="bg-gradient-to-r from-[#2E5BFF] to-[#2549d8] hover:from-[#2549d8] hover:to-[#1e3db8] text-white px-3 h-8 min-w-32 rounded-lg text-xs shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  {copied ? "Copied" : "Copy URL"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="bg-gradient-to-br from-blue-50 via-blue-50/50 to-purple-50/30 px-4 py-2.5 rounded-xl border-2 border-blue-200/50 shadow-md min-w-[120px]">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-[#2E5BFF]" />
                <div className="text-[9px] font-semibold text-gray-700 uppercase tracking-wide">
                  Statistics
                </div>
              </div>
              <div className="text-center">
                <div className="text-[9px] text-gray-600 mb-0.5 font-medium">
                  Total Scans
                </div>
                <div className="text-2xl font-bold bg-gradient-to-br from-[#2E5BFF] to-[#2549d8] bg-clip-text text-transparent">
                  {data?.noOfScans}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-xl shadow-sm p-4 min-w-6xl">
          <ShareQR
            url={qrUrl + "?qr=1"}
            title={data.name}
            isPublished={true}
            id={data.id}
            queryKey="qrShareSettings"
            resourceName="generateQr"
          />
        </div>
      </div>
    );
  }

  return (
    <Stack className={styles["generated-qr-page-root-div"]}>
      {componentToBeRendered}
    </Stack>
  );
}

export default GeneratedQrPage;
