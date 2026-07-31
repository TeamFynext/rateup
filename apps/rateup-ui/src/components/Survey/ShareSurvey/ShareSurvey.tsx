import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, ChevronLeft, Copy, Pause, Pencil, Play } from "lucide-react";
import { useId } from "react";
import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { updateSurvey } from "@/backend/surveys/survey.api";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import type { SurveyUpdateMutation } from "@/components/Survey/Settings/updateSettings.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import type { RequestPayload } from "@/types/api.ts";
import { SurveyType } from "@/types/enums.ts";
import { formatIsoDateStringWithTime, roundOffMinutesAndSeconds } from "@/utils/dateTime.ts";
import { getContent } from "@/utils/index.ts";

import { StatusBadge } from "../SurveyCardList.tsx";
import { TabEnum } from "../SurveyId.tsx";
import GenerateTags from "./GenerateTags.tsx";
import IFrameModal from "./IFrameModal.tsx";
import ShareQR from "./ShareQR/index.tsx";

enum PublishEnum {
  NOW = "NOW",
  LATER = "LATER",
}

enum ExpiryEnum {
  NO_EXPIRY = "NO_EXPIRY",
  CUSTOM_DATE = "CUSTOM_DATE",
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const ShareSurvey = ({
  survey,
  setActiveTab,
  allowUnpublishedShare = false,
}: {
  survey: Survey;
  setActiveTab: (tab: TabEnum) => void;
  allowUnpublishedShare?: boolean;
}) => {
  const uid = useId();
  const surveyId = survey?.id;
  const [shareUrl, setShareUrl] = useState("");
  const [tag, setTag] = useState<string[]>([]);
  const [surveyTeamMapId, setSurveyTeamMapId] = useState(survey?.teams[0]?.mapId);
  const [shortUrlId, setShortUrlId] = useState(survey?.teams[0]?.shortUrlId);
  const [isPublished, setIsPublished] = useState(survey?.isPublished);
  const [isScheduled, setIsScheduled] = useState(
    !!(!survey?.isPublished && survey?.surveyPublishAt),
  );
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [openedIframe, setOpenedIframe] = useState(false);
  const [publishSettings, setPublishSettings] = useState(false);

  const [errors, setErrors] = useState<Array<any> | { error: string } | null>(null);
  const { t: translations } = useTranslation();
  const [selectTeamDropdownState, setSelectTeamDropdownState] = useState("0");
  const [editPublish, setEditPublish] = useState<"Publish" | "Expiry" | "" | false | null>(null);

  // TODO: since flow has a different share page (ShareFlow.tsx), remove the whatsapp related code
  const isWhatsapp = survey?.type === SurveyType.WhatsApp || survey?.type === SurveyType.WaFlow;
  const { data: waSettings } = useWaSettings(isWhatsapp);

  useEffect(() => {
    setIsScheduled(!survey?.isPublished && survey?.surveyPublishAt ? true : false);
  }, [survey]);

  useEffect(() => {
    if (!surveyId || !surveyTeamMapId) return;
    const tagString = tag?.length > 0 ? `?tag=${tag.join(",")}` : "";
    if (survey.type === SurveyType.WhatsApp || survey.type === SurveyType.WaFlow) {
      if (!waSettings) return;
      const phone = waSettings?.[0]?.phone?.replace("+", "").replaceAll(" ", "");
      if (!phone) setShareUrl("Configure WhatsApp settings to get share link");
      if (shortUrlId) {
        setShareUrl(`${import.meta.env.VITE_FRONTEND_URL}/was/${shortUrlId}${tagString}`);
      } else {
        if (survey.getLocation) {
          setShareUrl(`${window.origin}/public/wa/${surveyTeamMapId}/redirect`);
        } else {
          throw new Error("Not implemented");
        }
      }
    } else {
      if (shortUrlId) {
        setShareUrl(`${import.meta.env.VITE_FRONTEND_URL}/ws/${shortUrlId}${tagString}`);
      } else {
        setShareUrl(
          `${import.meta.env.VITE_FRONTEND_URL}/public/survey/${surveyTeamMapId}${tagString}`,
        );
      }
    }
  }, [surveyId, surveyTeamMapId, tag, shortUrlId, waSettings]);

  const surveyUpdateMutation = useMutation({
    mutationFn: (data: RequestPayload) => updateSurvey(surveyId, data),
    onSuccess: (data) => {
      if (data?.data?.status === "failed") {
        setIsPublished(false);
        toast.error(
          data?.data?.error ? data?.data?.error : translations("Your survey is incomplete"),
          { id: "load-data" },
        );
        setErrors(data?.data?.data);
        setOpened(true);
      } else {
        if (data?.data?.action === "unpublish") setIsPublished(false);
        if (data?.data?.action === "publish") setIsPublished(true);
        toast.success(
          data?.data?.action === "unpublish"
            ? translations("Survey Un-Published.")
            : translations("Survey Published Successfully!"),
          { id: "load-data" },
        );
        queryClient.invalidateQueries({ queryKey: ["surveys"] });
        queryClient.invalidateQueries({ queryKey: ["survey", survey.id] });
      }
    },
  });

  const surveyStatusUpdateMutation = useMutation({
    mutationFn: (data: RequestPayload) => updateSurvey(survey.id, data),
    onSuccess: () => {
      toast.success("Survey status Updated!", { id: "survey" });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["survey", survey.id] });
    },
  });

  function shareButtonAction(btn: "fb" | "mail" | "whatsapp") {
    switch (btn) {
      case "fb":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`);
        break;
      case "mail":
        window.open(
          `mailto:?subject=Survey&body=Take a minute to complete the survey: \n ${survey?.title} \n${shareUrl} \n\n`,
        );
        break;
      case "whatsapp":
        const waShareUrl = encodeURIComponent(shareUrl);
        window.open(
          `https://web.whatsapp.com/send?text=Take a minute to complete the survey: \n${waShareUrl}`,
        );
        break;
      default:
        break;
    }
  }

  const teamSelectData = survey?.teams?.map((team, index) => ({
    value: index.toString(),
    label: team?.code,
  }));

  const disableShare = !(isPublished || isScheduled || allowUnpublishedShare);

  const handleContainedSelectionChange = useCallback(
    (value: string) => {
      const teamObj = survey.teams[Number(value)];
      setSurveyTeamMapId(teamObj.mapId);
      setShortUrlId(teamObj.shortUrlId);
      setSelectTeamDropdownState(value);
    },
    [survey],
  );

  return (
    <TooltipProvider>
      <div className="min-h-full overflow-auto bg-muted p-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-8">
          {/* Publish Status Card */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  {isScheduled ? (
                    <div className="flex items-center gap-3">
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
                          <Switch
                            checked={isScheduled}
                            onCheckedChange={(checked) => {
                              toast.loading(
                                translations("Hold.. your survey is getting unpublished..."),
                                { id: "load-data" },
                              );
                              surveyUpdateMutation.mutate({
                                isPublished: checked,
                                surveyPublishAt: null,
                                surveyEndAt: null,
                              });
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          {isScheduled
                            ? translations("Click here to unschedule the survey")
                            : translations("Click here to schedule the Survey")}
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-base font-medium">{translations("Scheduled")}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
                          <Switch
                            checked={isPublished}
                            onCheckedChange={(checked) => {
                              if (!isPublished) {
                                setEditPublish(null);
                                setPublishSettings(true);
                              } else {
                                toast.loading(
                                  translations("Hold.. your survey is getting UnPublished..."),
                                  { id: "load-data" },
                                );
                                surveyUpdateMutation.mutate({
                                  isPublished: checked,
                                  surveyPublishAt: null,
                                  surveyEndAt: null,
                                });
                              }
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          {isPublished
                            ? translations("Click here to unpublish the survey")
                            : translations("Click here to Publish the Survey")}
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-base font-semibold">
                        {isPublished ? translations("Published") : translations("Publish Survey")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {translations("Current Status:")}
                  </span>
                  {isPublished ? (
                    <StatusBadge active={survey?.active} />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {translations("Not published!")}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  {(isPublished || survey?.surveyPublishAt) && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-36 text-muted-foreground">
                        {isScheduled
                          ? translations("To be Published On")
                          : translations("Published On")}
                        :
                      </span>
                      <span className={isScheduled ? "text-orange-500" : "text-foreground"}>
                        {survey?.surveyPublishAt
                          ? formatIsoDateStringWithTime(survey?.surveyPublishAt)
                          : "Nil"}
                      </span>
                      {isScheduled && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6"
                          onClick={() => {
                            setEditPublish("Publish");
                            setPublishSettings(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                  {survey?.surveyEndAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-36 text-muted-foreground">{translations("End At:")}</span>
                      <span>
                        {survey?.surveyEndAt
                          ? formatIsoDateStringWithTime(survey?.surveyEndAt)
                          : "Nil"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6"
                        onClick={() => {
                          setEditPublish("Expiry");
                          setPublishSettings(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!survey.surveyEndAt && (survey.isPublished || survey.surveyPublishAt) && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditPublish("Expiry");
                              setPublishSettings(true);
                            }}
                          />
                        }
                      >
                        <CalendarClock className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent>{translations("Schedule survey expiry")}</TooltipContent>
                    </Tooltip>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!isPublished}
                    onClick={() => surveyStatusUpdateMutation.mutate({ active: !survey?.active })}
                  >
                    {survey?.active ? (
                      <>
                        <Pause data-icon="inline-start" />
                        {translations("Pause")}
                      </>
                    ) : (
                      <>
                        <Play data-icon="inline-start" />
                        {translations("Resume")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <PubliShSettingsModal
            opened={publishSettings}
            close={() => setPublishSettings(false)}
            editPublish={editPublish}
            surveyUpdateMutation={surveyUpdateMutation}
            survey={survey}
          />

          {/* Errors modal */}
          <Dialog open={opened} onOpenChange={(v) => !v && setOpened(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translations("Survey contains errors")}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[400px]">
                <div className="flex flex-col gap-3 py-4">
                  {Array.isArray(errors) ? (
                    errors?.map((item) => (
                      <div key={item?.id} className="rounded-xl border bg-card p-4 shadow-sm">
                        <h4 className="mb-2 text-sm font-semibold">
                          {
                            getContent(
                              Object.values(item?.title)?.[0]?.toString() ?? "",
                            ) as React.ReactNode
                          }
                        </h4>
                        <ul className="list-disc space-y-1 pl-4 text-sm text-red-500">
                          {item?.errors?.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-red-500">
                      {translations("Error: ")}
                      {errors?.error}
                    </p>
                  )}
                </div>
              </ScrollArea>
              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    setOpened(false);
                    setActiveTab(TabEnum.Edit);
                  }}
                >
                  <ChevronLeft data-icon="inline-start" />
                  {translations("Back to Edit Questions")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Share Link + Social Card */}
          <Card className={disableShare ? "pointer-events-none opacity-50" : ""}>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Left: URL + team selector */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-sm font-semibold">{translations("Share Survey")}</h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel htmlFor={`${uid}-label`} className="text-sm">
                        {translations("Select Team")}
                      </FieldLabel>
                      <Select
                        value={selectTeamDropdownState}
                        onValueChange={(value) => handleContainedSelectionChange(value ?? "")}
                        disabled={disableShare}
                        items={teamSelectData}
                      >
                        <SelectTrigger id={`${uid}-label`} className="min-w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {teamSelectData?.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <GenerateTags
                      disabled={disableShare}
                      tagSelectData={tag}
                      setTagSelectData={setTag}
                    />
                  </div>
                  <CopyLinkComponent value={shareUrl} disabled={disableShare} />
                </div>

                {/* Right: Social share */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-center text-sm font-semibold">
                    {translations("How would you like to survey people?")}
                  </h4>
                  <div className="flex flex-wrap justify-center gap-6">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            disabled={disableShare}
                            onClick={() => shareButtonAction("mail")}
                            className="rounded-lg p-2 transition-colors hover:bg-muted disabled:cursor-not-allowed"
                          />
                        }
                      >
                        <img
                          alt="mail icon"
                          src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/social-media-icons/mail.svg`}
                          className="size-10 object-contain"
                          style={{ opacity: disableShare ? 0.5 : 1 }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>Share via Email</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            disabled={disableShare}
                            onClick={() => shareButtonAction("whatsapp")}
                            className="rounded-lg p-2 transition-colors hover:bg-muted disabled:cursor-not-allowed"
                          />
                        }
                      >
                        <img
                          alt="whatsapp icon"
                          src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/social-media-icons/whatsapp.svg`}
                          className="size-10 object-contain"
                          style={{ opacity: disableShare ? 0.5 : 1 }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>{translations("Share via WhatsApp")}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            disabled={disableShare}
                            onClick={() => shareButtonAction("fb")}
                            className="rounded-lg p-2 transition-colors hover:bg-muted disabled:cursor-not-allowed"
                          />
                        }
                      >
                        <img
                          alt="facebook icon"
                          src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/social-media-icons/facebook.svg`}
                          className="size-10 object-contain"
                          style={{ opacity: disableShare ? 0.5 : 1 }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>{translations("Share via Facebook")}</TooltipContent>
                    </Tooltip>

                    {survey?.type === SurveyType.Web && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              disabled={disableShare}
                              onClick={() => setOpenedIframe(true)}
                              className="rounded-lg p-2 transition-colors hover:bg-muted disabled:cursor-not-allowed"
                            />
                          }
                        >
                          <img
                            alt="iframe icon"
                            src={`${import.meta.env.VITE_FRONTEND_URL}/images/iframe-icon.png`}
                            className="size-10 object-contain"
                            style={{ opacity: disableShare ? 0.5 : 1 }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>{translations("Embed as iframe")}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Card */}
          <Card>
            <CardContent className="pt-5">
              {shareUrl && (
                <ShareQR
                  url={shareUrl}
                  title={survey?.title}
                  isPublished={!disableShare}
                  id={surveyId}
                  queryKey={"surveyShareSettings"}
                  resourceName={"survey"}
                />
              )}
            </CardContent>
          </Card>

          {/* IFrame modal */}
          <Dialog open={openedIframe} onOpenChange={(v) => !v && setOpenedIframe(false)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{translations("Generate IFrame")}</DialogTitle>
              </DialogHeader>
              <IFrameModal close={() => setOpenedIframe(false)} shareUrl={shareUrl} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
};

interface CopyLinkComponentProps {
  value: string;
  disabled?: boolean;
  label?: string;
}
export const CopyLinkComponent = ({
  value,
  disabled = false,
  label = "",
}: CopyLinkComponentProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <div className="flex items-center">
        <Input
          readOnly
          value={value}
          disabled={disabled}
          className="flex-1 rounded-r-none border-r-0 font-mono text-xs text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button
          variant={copied ? "secondary" : "default"}
          onClick={handleCopy}
          disabled={disabled}
          className="shrink-0 rounded-l-none"
        >
          <Copy data-icon="inline-start" />
          {copied ? "Copied!" : "Copy URL"}
        </Button>
      </div>
    </div>
  );
};

const PubliShSettingsModal = ({
  opened,
  close,
  editPublish,
  surveyUpdateMutation,
  survey,
}: {
  opened: boolean;
  close: () => void;
  editPublish: "Publish" | "Expiry" | "" | false | null;
  surveyUpdateMutation: SurveyUpdateMutation;
  survey: Survey;
}) => {
  const uid = useId();
  const { t: translations } = useTranslation();
  const [publishChoice, setPublishChoice] = useState<PublishEnum>(PublishEnum.NOW);
  const [surveyExpiry, setSurveyExpiry] = useState<ExpiryEnum>(ExpiryEnum.NO_EXPIRY);

  const { register, getValues, setValue, reset, watch } = useForm({
    defaultValues: {
      surveyPublishAt: toDatetimeLocal(
        new Date(new Date(new Date().setMinutes(0, 0, 0)).setDate(new Date().getDate() + 1)),
      ),
      surveyEndAt: toDatetimeLocal(
        new Date(new Date(new Date().setMinutes(0, 0, 0)).setDate(new Date().getDate() + 5)),
      ),
    },
  });

  const surveyPublishAt = watch("surveyPublishAt");

  const handlePublish = () => {
    toast.loading(translations("Please hold on while publishing your survey"), {
      id: "load-data",
    });
    const values = getValues();
    const data =
      editPublish === "Publish"
        ? {
            isPublished: publishChoice === PublishEnum.NOW,
            surveyPublishAt:
              publishChoice === PublishEnum.NOW
                ? new Date()
                : new Date(roundOffMinutesAndSeconds(new Date(values.surveyPublishAt))),
          }
        : editPublish === "Expiry"
          ? {
              surveyEndAt:
                surveyExpiry === ExpiryEnum.NO_EXPIRY
                  ? null
                  : new Date(roundOffMinutesAndSeconds(new Date(values.surveyEndAt))),
            }
          : {
              isPublished: publishChoice === PublishEnum.NOW,
              surveyPublishAt:
                publishChoice === PublishEnum.NOW
                  ? new Date()
                  : new Date(roundOffMinutesAndSeconds(new Date(values.surveyPublishAt))),
              surveyEndAt:
                surveyExpiry === ExpiryEnum.NO_EXPIRY
                  ? null
                  : new Date(roundOffMinutesAndSeconds(new Date(values.surveyEndAt))),
            };

    surveyUpdateMutation.mutate(data, {
      onSuccess: () => {
        reset();
        close();
      },
    });
  };

  useEffect(() => {
    if (editPublish === "Publish") {
      setPublishChoice(PublishEnum.LATER);
      setValue("surveyPublishAt", toDatetimeLocal(new Date(survey?.surveyPublishAt ?? "")));
    } else if (editPublish === "Expiry") {
      if (survey?.surveyEndAt) {
        setSurveyExpiry(ExpiryEnum.CUSTOM_DATE);
        setValue("surveyEndAt", toDatetimeLocal(new Date(survey?.surveyEndAt ?? "")));
      } else {
        setSurveyExpiry(ExpiryEnum.NO_EXPIRY);
      }
    }
  }, [editPublish, survey]);

  const minPublishAt = toDatetimeLocal(new Date(new Date().getTime() + 60 * 60 * 1000));
  const minEndAt = toDatetimeLocal(
    publishChoice === PublishEnum.LATER && surveyPublishAt
      ? new Date(new Date(surveyPublishAt).getTime() + 60 * 60 * 1000)
      : new Date(new Date().getTime() + 2 * 60 * 60 * 1000),
  );

  const buttonTitle =
    editPublish === "Expiry"
      ? translations("Update Expiry")
      : publishChoice === PublishEnum.LATER
        ? editPublish
          ? translations("Update Publish Schedule")
          : translations("Schedule Publish")
        : translations("Publish Now");

  return (
    <Dialog
      open={opened}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          close();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translations("Publish Settings")}</DialogTitle>
        </DialogHeader>

        <FieldSet className="mt-4 min-h-[250px]">
          {(!editPublish || editPublish === "Publish") && (
            <div className="flex flex-col gap-3">
              <FieldLegend id="publish-legend" variant="label">
                {translations("Publish")} <span className="text-destructive">*</span>
              </FieldLegend>
              <RadioGroup
                aria-labelledby="publish-legend"
                value={publishChoice}
                onValueChange={(v) => setPublishChoice(v as PublishEnum)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={PublishEnum.NOW} id="publish-now" />
                  <FieldLabel htmlFor="publish-now">{translations("Now")}</FieldLabel>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={PublishEnum.LATER} id="publish-later" />
                  <FieldLabel htmlFor="publish-later">{translations("Schedule Later")}</FieldLabel>
                </div>
              </RadioGroup>
              {publishChoice === PublishEnum.LATER && (
                <div className="flex flex-col gap-2">
                  <Field>
                    <FieldLabel htmlFor={`${uid}-label-4`}>
                      {translations("Publish Survey At")}{" "}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id={`${uid}-label-4`}
                      type="datetime-local"
                      min={minPublishAt}
                      {...register("surveyPublishAt")}
                    />
                  </Field>
                  <p className="text-xs text-red-500">
                    * {translations("*Time will be rounded to nearest hours")}
                    <br />*{" "}
                    {translations("Publish time must be at least 1 hour ahead of current time.")}
                  </p>
                </div>
              )}
            </div>
          )}

          {(!editPublish || editPublish === "Expiry") && (
            <FieldSet>
              <FieldLegend id="expiry-legend" variant="label">
                {translations("Expiry Date")} <span className="text-destructive">*</span>
              </FieldLegend>
              <RadioGroup
                aria-labelledby="expiry-legend"
                value={surveyExpiry}
                onValueChange={(v) => setSurveyExpiry(v as ExpiryEnum)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={ExpiryEnum.NO_EXPIRY} id="expiry-none" />
                  <FieldLabel htmlFor="expiry-none">{translations("No Expiry")}</FieldLabel>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={ExpiryEnum.CUSTOM_DATE} id="expiry-custom" />
                  <FieldLabel htmlFor="expiry-custom">{translations("Custom Date")}</FieldLabel>
                </div>
              </RadioGroup>
              {surveyExpiry === ExpiryEnum.CUSTOM_DATE && (
                <div className="flex flex-col gap-2">
                  <Field>
                    <FieldLabel htmlFor={`${uid}-label-7`}>
                      {translations("End Survey At")}
                    </FieldLabel>
                    <Input
                      id={`${uid}-label-7`}
                      type="datetime-local"
                      min={minEndAt}
                      {...register("surveyEndAt")}
                    />
                  </Field>
                  <p className="text-xs text-red-500">
                    * {translations("End date must be after the publish date.")}
                  </p>
                </div>
              )}
            </FieldSet>
          )}
        </FieldSet>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              close();
            }}
            disabled={surveyUpdateMutation.isPending}
          >
            {translations("Cancel")}
          </Button>
          <Button onClick={handlePublish} disabled={surveyUpdateMutation.isPending}>
            {surveyUpdateMutation.isPending && <Spinner data-icon="inline-start" />}
            {buttonTitle}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareSurvey;
