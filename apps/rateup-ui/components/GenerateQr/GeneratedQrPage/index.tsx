"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import {
  useGetQrWithShortUrlId,
  useUpdateQrMutation,
} from "backend/generateQr/generateQr.query";
import ShareQR from "components/Survey/ShareSurvey/ShareQR";
import { Copy, Edit, ExternalLink, Sparkles, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";

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
      <div className="w-full h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (isError) {
    componentToBeRendered = (
      <div className="w-full h-screen flex items-center justify-center">
        <p>{translations("Unable to get data, please try again later")}</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (data) {
    componentToBeRendered = (
      <div className="flex flex-col gap-8 items-center relative">
        <div className="w-full p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <h1 className="text-base font-semibold">{data?.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-lg border">
                <span className="text-xs font-medium">
                  {translations("Editor Mode")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* main */}
        <div className="flex items-center justify-between px-10 min-w-6xl shadow-sm border rounded-xl py-2 gap-10">
          <div className="flex flex-col gap-4 w-full py-4">
            {/* Destination URL */}
            <div className="group">
              <Label
                htmlFor="destination-url"
                className="text-xs font-semibold flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4 text-primary" />
                {translations("Destination URL")}
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
                className="text-xs font-semibold mb-1 flex items-center gap-1"
              >
                <Copy className="w-4 h-4 text-primary" />
                {translations("QR URL")}
              </Label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Input
                    id="qr-url"
                    value={qrUrl}
                    readOnly
                    className="flex-1 h-8 text-xs"
                  />
                </div>
                <Button
                  onClick={handleCopy}
                  className="bg-primary px-3 h-8 min-w-32 rounded-lg text-xs shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  {copied ? translations("Copied") : translations("Copy URL")}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="px-4 py-2.5 rounded-xl border-2 shadow-md min-w-[120px]">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-primary" />
                <div className="text-[11px] font-semibold uppercase">
                  {translations("Statistics")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs mb-0.5 font-medium">
                  {translations("Total Scans")}
                </div>
                <div className="text-2xl font-bold text-primary">
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

  return <div>{componentToBeRendered}</div>;
}

export default GeneratedQrPage;
