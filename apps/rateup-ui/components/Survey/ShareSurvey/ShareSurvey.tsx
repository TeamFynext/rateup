"use client";

import React, { useCallback, useEffect, useState } from "react";

import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconBrandFacebook,
  IconBrandWhatsapp,
  IconCheck,
  IconChevronLeft,
  IconClockPlus,
  IconCode,
  IconCopy,
  IconMail,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconShare,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { updateSurvey } from "../../../backend/surveys/survey.api";
import { useWaSettings } from "../../../backend/whatsapp/settings/waSettings.query";
import { SurveyType } from "../../../types/enums";
import { getContent } from "../../../utils";
import {
  formatIsoDateStringWithTime,
  roundOffMinutesAndSeconds,
} from "../../../utils/dateTime";
import { showLoadingToast } from "../../../utils/notifications";
import {
  ContainedDateTimePickerInput,
  ContainedSelection,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import FormModalLayout from "../../Modal/FormModalLayout";
import { StatusBadge } from "../SurveyCardList";
import { TabEnum } from "../SurveyId";
import GenerateTags from "./GenerateTags";
import IFrameModal from "./IFrameModal";
import ShareQR from "./ShareQR";

enum PublishEnum {
  NOW = "NOW",
  LATER = "LATER",
}

enum ExpiryEnum {
  NO_EXPIRY = "NO_EXPIRY",
  CUSTOM_DATE = "CUSTOM_DATE",
}
const ShareSurvey = ({
  survey,
  setActiveTab,
  allowUnpublishedShare = false,
}: {
  survey: Survey;
  setActiveTab: (tab: any) => void;
  allowUnpublishedShare?: boolean;
}) => {
  const surveyId = survey?.id;
  const [shareUrl, setShareUrl] = useState("");
  const [tag, setTag] = useState([]);
  const [surveyTeamMapId, setSurveyTeamMapId] = useState(
    survey?.teams[0]?.mapId,
  );

  const [shortUrlId, setShortUrlId] = useState(survey?.teams[0]?.shortUrlId);
  const [isPublished, setIsPublished] = useState(survey?.isPublished);
  const [isScheduled, setIsScheduled] = useState(
    !!(!survey?.isPublished && survey?.surveyPublishAt),
  );
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [openedIframe, { open: openIframe, close: closeIframe }] =
    useDisclosure(false);
  const [
    publishSettings,
    { open: openPublishSettings, close: closePublishSettings },
  ] = useDisclosure(false);

  const [errors, setErrors] = useState<Array<any> | { error: string } | null>(
    null,
  );
  const translations = useTranslations();
  const [selectTeamDropdownState, setSelectTeamDropdownState] = useState("0");
  const [editPublish, setEditPublish] = useState(null);

  // TODO: since flow has a different share page (ShareFlow.tsx), remove the whatsapp related code
  const isWhatsapp =
    survey?.type === SurveyType.WhatsApp || survey?.type === SurveyType.WaFlow;
  const { data: waSettings } = useWaSettings(isWhatsapp);

  useEffect(() => {
    setIsScheduled(
      !survey?.isPublished && survey?.surveyPublishAt ? true : false,
    );
  }, [survey]);

  useEffect(() => {
    if (!surveyId || !surveyTeamMapId) return;
    const tagString = tag?.length > 0 ? `?tag=${tag.join(",")}` : "";
    if (
      survey.type === SurveyType.WhatsApp ||
      survey.type === SurveyType.WaFlow
    ) {
      if (!waSettings) return;
      const phone = waSettings?.[0]?.phone
        ?.replace("+", "")
        .replaceAll(" ", "");
      if (!phone) setShareUrl("Configure WhatsApp settings to get share link");
      if (shortUrlId) {
        // TODO: get phone number from phone id (add phone number field)
        setShareUrl(
          `${process.env.NEXT_PUBLIC_FRONTEND_URL}/was/${shortUrlId}${tagString}`,
        );
      } else {
        // TODO: get phone number from phone id (add phone number field)
        if (survey.getLocation) {
          // redirecting through our page to fetch ip
          setShareUrl(`${window.origin}/public/wa/${surveyTeamMapId}/redirect`);
        } else {
          throw new Error("Not implemented");
        }
      }
    } else {
      if (shortUrlId) {
        setShareUrl(
          `${process.env.NEXT_PUBLIC_FRONTEND_URL}/ws/${shortUrlId}${tagString}`,
        );
      } else {
        setShareUrl(
          `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${surveyTeamMapId}${tagString}`,
        );
      }
    }
  }, [surveyId, surveyTeamMapId, tag, shortUrlId, waSettings]);

  const surveyUpdateMutation = useMutation({
    mutationFn: (data: any) => updateSurvey(surveyId, data),
    onSuccess: (data) => {
      if (data?.data?.status === "failed") {
        setIsPublished(false);

        notifications.update({
          id: "load-data",
          color: "red",
          title: "Failed..!",
          loading: false,
          message: data?.data?.error
            ? data?.data?.error
            : translations("Your survey is incomplete"),
          icon: <IconX size="1rem" />,
          autoClose: 3000,
        });
        setErrors(data?.data?.data);
        open();
      } else {
        data?.data?.action === "unpublish" && setIsPublished(false);
        data?.data?.action === "publish" && setIsPublished(true);

        notifications.update({
          id: "load-data",
          color: "teal",
          title: "Success",
          loading: false,
          message:
            data?.data?.action === "unpublish"
              ? translations("Survey Un-Published.")
              : translations("Survey Published Successfully!"),
          icon: <IconCheck size="1rem" />,
          autoClose: 3000,
        });
        queryClient.invalidateQueries({ queryKey: ["surveys"] });
        queryClient.invalidateQueries({ queryKey: ["survey", survey.id] });
      }
    },
  });

  const surveyStatusUpdateMutation = useMutation({
    mutationFn: (data: any) => updateSurvey(survey.id, data),
    onSuccess: () => {
      notifications.show({
        id: "survey",
        message: "Survey status Updated!",
        autoClose: true,
      });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["survey", survey.id] });
    },
  });

  function shareButtonAction(btn) {
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
    (value) => {
      const teamObj = survey.teams[value];
      setSurveyTeamMapId(teamObj.mapId);
      setShortUrlId(teamObj.shortUrlId);
      setSelectTeamDropdownState(value);
    },
    [survey],
  );

  return (
    <div className="flex flex-col gap-4 w-full max-h-[80vh]">
      <div className="border rounded-xl p-4 w-full">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* LEFT: Publish / Schedule */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-1">
            {isScheduled ? (
              <div className="flex items-center justify-between gap-4 w-full">
                <div className="flex flex-col gap-1">
                  <Label className="text-base sm:text-lg font-medium">
                    {translations("Scheduled")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {translations("Click here to unschedule the survey")}
                  </p>
                </div>

                <Switch
                  checked={isScheduled}
                  onCheckedChange={(checked) => {
                    showLoadingToast(
                      translations("Hold your survey is getting unpublished"),
                      "load-data",
                      true,
                      "Unpublishing...",
                    );

                    surveyUpdateMutation.mutate({
                      isPublished: checked,
                      surveyPublishAt: null,
                      surveyEndAt: null,
                    });
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 w-full">
                <div className="flex flex-col gap-1">
                  <Label className="text-base sm:text-lg font-bold">
                    {isPublished
                      ? translations("Published")
                      : translations("Publish Survey")}
                  </Label>

                  <p className="text-sm text-muted-foreground">
                    {isPublished
                      ? translations("Click here to unpublish the survey")
                      : translations("Click here to Publish the Survey")}
                  </p>
                </div>

                <Switch
                  checked={isPublished}
                  onCheckedChange={(checked) => {
                    if (!isPublished) {
                      openPublishSettings();
                    } else {
                      showLoadingToast(
                        translations("Hold your survey is getting UnPublished"),
                        "load-data",
                        true,
                        "Unpublishing...",
                      );

                      surveyUpdateMutation.mutate({
                        isPublished: checked,
                        surveyPublishAt: null,
                        surveyEndAt: null,
                      });
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* STATUS */}
          <div className="flex items-center gap-1 flex-wrap">
            <p className="text-sm">{translations("Current Status:")}</p>
            {isPublished ? (
              <StatusBadge active={survey?.active} />
            ) : (
              <p className="text-sm">{translations("Not published")}</p>
            )}
          </div>

          {/* DATES */}
          <div className="flex flex-col gap-2 text-sm">
            {(isPublished || survey?.surveyPublishAt) && (
              <div className="flex items-center gap-1 flex-wrap">
                <p>
                  {isScheduled
                    ? translations("To be Published On")
                    : translations("Published On")}
                  :
                </p>

                <p className="bg-yellow-100 px-2 py-1 rounded-sm">
                  {survey?.surveyPublishAt
                    ? formatIsoDateStringWithTime(survey?.surveyPublishAt)
                    : "Nil"}
                </p>

                {isScheduled && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditPublish("Publish");
                      openPublishSettings();
                    }}
                  >
                    <IconPencil />
                  </Button>
                )}
              </div>
            )}

            {survey?.surveyEndAt && (
              <div className="flex items-center gap-1 flex-wrap">
                <p>{translations("End At:")}</p>
                <p className="bg-red-100 px-2 py-1 rounded-sm">
                  {formatIsoDateStringWithTime(survey?.surveyEndAt)}
                </p>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditPublish("Expiry");
                    openPublishSettings();
                  }}
                >
                  <IconPencil />
                </Button>
              </div>
            )}
          </div>

          {/* ADD EXPIRY */}
          {!survey.surveyEndAt &&
            (survey.isPublished || survey.surveyPublishAt) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditPublish("Expiry");
                        openPublishSettings();
                      }}
                    >
                      <IconClockPlus />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{translations("Schedule survey expiry")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

          {/* PAUSE / RESUME */}
          <Button
            className="flex items-center justify-center gap-1 rounded-xl min-w-28 w-full sm:w-auto"
            variant="outline"
            disabled={disableShare}
            onClick={() =>
              surveyStatusUpdateMutation.mutate({ active: !survey?.active })
            }
          >
            {survey?.active ? <IconPlayerPause /> : <IconPlayerPlay />}
            <span>
              {survey?.active ? translations("Pause") : translations("Resume")}
            </span>
          </Button>

          {/* MODAL */}
          <PubliShSettingsModal
            opened={publishSettings}
            close={closePublishSettings}
            editPublish={editPublish}
            surveyUpdateMutation={surveyUpdateMutation}
            survey={survey}
          />
        </div>
      </div>

      <FormModalLayout
        centered
        onClose={close}
        opened={opened}
        title={translations("Survey contains errors")}
      >
        <ScrollArea className="max-h-[400px] mb-6">
          <div className="my-6">
            {Array.isArray(errors) ? (
              errors.map((item) => (
                <div key={item?.id} className="mb-3 rounded-xl shadow-md">
                  <div className="p-4">
                    <h4 className="text-lg font-semibold mb-2">
                      {
                        getContent(
                          Object.values(item?.title)?.[0]?.toString() ?? "",
                        ) as React.ReactNode
                      }
                    </h4>

                    <ul className="list-disc pl-5 space-y-1">
                      {item?.errors?.map((error: string, index: number) => (
                        <li key={index} className="text-red-500 text-sm">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
            ) : (
              <div>
                <p className="text-red-500">
                  {translations("Error: ")}
                  {errors?.error}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-center">
          <Button
            className="flex items-center justify-center gap-1"
            onClick={() => {
              close();
              setActiveTab(TabEnum.Edit);
            }}
          >
            <IconChevronLeft />
            <span>{translations("Back to Edit Questions")}</span>
          </Button>
        </div>
      </FormModalLayout>
      <div
        className={`${disableShare ? "opacity-50" : "opacity-100"} border rounded-xl`}
      >
        <div className="w-full">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* LEFT: Share Survey */}
            <div className="flex flex-col gap-4 w-full">
              <div className="border-b">
                <div className="flex items-center gap-1 p-4">
                  <IconShare className="w-4 h-4 text-primary" />
                  <h2 className="text-base font-semibold">
                    {translations("Share Survey")}
                  </h2>
                </div>
              </div>

              {/* Team + Tags */}
              <div className="flex flex-col gap-4 w-full p-4 max-w-4xl">
                <div className="flex flex-col sm:flex-row gap-4">
                  <ContainedSelection
                    style={{ flex: 1 }}
                    disabled={disableShare}
                    label={translations("Select Team")}
                    allowDeselect={false}
                    value={selectTeamDropdownState}
                    miw={150}
                    data={teamSelectData}
                    onChange={handleContainedSelectionChange}
                  />

                  <div className="flex items-start">
                    <GenerateTags
                      disabled={disableShare}
                      tagSelectData={tag}
                      setTagSelectData={setTag}
                    />
                  </div>
                </div>

                {/* Copy Link */}
                <CopyLinkComponent value={shareUrl} disabled={disableShare} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`${disableShare ? "opacity-50" : "opacity-100"} border p-4 rounded-xl`}
      >
        <div className="flex items-center justify-between gap-3 w-full lg:w-auto">
          <h2 className="text-sm">
            {translations("How would you like to survey people?")}
          </h2>

          <div className="flex flex-wrap justify-start sm:justify-center gap-6">
            {/* Email */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={disableShare}
                  onClick={() => shareButtonAction("mail")}
                  className="bg-transparent"
                >
                  <IconMail />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {translations("Share via Email")}
              </TooltipContent>
            </Tooltip>

            {/* WhatsApp */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={disableShare}
                  onClick={() => shareButtonAction("whatsapp")}
                  className="bg-transparent"
                >
                  <IconBrandWhatsapp />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {translations("Share via WhatsApp")}
              </TooltipContent>
            </Tooltip>

            {/* Facebook */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={disableShare}
                  onClick={() => shareButtonAction("fb")}
                  className="bg-transparent"
                >
                  <IconBrandFacebook />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {translations("Share via Facebook")}
              </TooltipContent>
            </Tooltip>

            {/* Iframe */}
            {survey?.type === SurveyType.Web && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={disableShare}
                    onClick={openIframe}
                    className="bg-transparent"
                  >
                    <IconCode />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {translations("Embed as iframe")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
      {shareUrl && (
        <div className="border rounded-xl">
          <ShareQR
            url={shareUrl}
            title={survey?.title}
            isPublished={!disableShare}
            id={surveyId}
            queryKey={"surveyShareSettings"}
            resourceName={"survey"}
          />
        </div>
      )}
      <FormModalLayout
        title={translations("Generate IFrame")}
        opened={openedIframe}
        onClose={closeIframe}
        size="lg"
        centered
      >
        <IFrameModal close={closeIframe} shareUrl={shareUrl} />
      </FormModalLayout>
    </div>
  );
};

interface CopyLinkComponentProps {
  value: string;
  disabled?: boolean;
  label?: string;
  buttonRadius?: string | number;
}
export const CopyLinkComponent = ({
  value,
  disabled = false,
  label = "",
  buttonRadius = "md",
}: CopyLinkComponentProps) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center">
      <ContainedTextField
        readOnly
        value={value}
        label={label}
        pr="sm"
        disabled={disabled}
        style={{
          maxWidth: "900px",
          flexGrow: 1,
        }}
      />

      <Button
        variant={copied ? "outline" : "default"}
        onClick={handleCopy}
        disabled={disabled}
        className="flex items-center gap-2 w-28"
      >
        {copied ? (
          <>
            <IconCheck className="h-4 w-4" />
            Copied url
          </>
        ) : (
          <>
            <IconCopy className="h-4 w-4" />
            Copy url
          </>
        )}
      </Button>
    </div>
  );
};

const PubliShSettingsModal = ({
  opened,
  close,
  editPublish,
  surveyUpdateMutation,
  survey,
}) => {
  const translations = useTranslations();
  const [publishChoice, setPublishChoice] = useState<any>(PublishEnum.NOW);
  const [surveyExpiry, setSurveyExpiry] = useState<any>(ExpiryEnum.NO_EXPIRY);
  const form = useForm({
    initialValues: {
      surveyPublishAt: new Date(
        new Date(new Date().setMinutes(0, 0, 0)).setDate(
          new Date().getDate() + 1,
        ),
      ),
      surveyEndAt: new Date(
        new Date(new Date().setMinutes(0, 0, 0)).setDate(
          new Date().getDate() + 5,
        ),
      ),
    },
    validate: {
      surveyPublishAt: (value) => {
        const minPublishDate = new Date(new Date().getTime() + 60 * 60 * 1000);
        const publishDate = form.values.surveyPublishAt;
        return value < publishDate
          ? translations("End date must be after the publish date")
          : null;
      },
      surveyEndAt: (value) => {
        const minEndDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
        return surveyExpiry === ExpiryEnum.CUSTOM_DATE && value < minEndDate
          ? translations(
              "End date must be at least 2 hours ahead of current time",
            )
          : null;
      },
    },
  });
  const handlePublish = (event) => {
    notifications.show({
      id: "load-data",
      color: "teal",
      title: translations("Publishing"),
      loading: true,
      message: translations("Please hold on while publishing your survey"),
      autoClose: 3000,
    });
    const data =
      editPublish === "Publish"
        ? {
            isPublished: publishChoice === PublishEnum.NOW,
            surveyPublishAt:
              publishChoice === PublishEnum.NOW
                ? new Date()
                : new Date(
                    roundOffMinutesAndSeconds(form.values.surveyPublishAt),
                  ),
          }
        : editPublish === "Expiry"
          ? {
              surveyEndAt:
                surveyExpiry === ExpiryEnum.NO_EXPIRY
                  ? null
                  : new Date(
                      roundOffMinutesAndSeconds(form.values.surveyEndAt),
                    ),
            }
          : {
              isPublished: publishChoice === PublishEnum.NOW,
              surveyPublishAt:
                publishChoice === PublishEnum.NOW
                  ? new Date()
                  : new Date(
                      roundOffMinutesAndSeconds(form.values.surveyPublishAt),
                    ),
              surveyEndAt:
                surveyExpiry === ExpiryEnum.NO_EXPIRY
                  ? null
                  : new Date(
                      roundOffMinutesAndSeconds(form.values.surveyEndAt),
                    ),
            };

    surveyUpdateMutation.mutate(data, {
      onSuccess: () => {
        form.reset();
        close();
      },
    });
  };

  useEffect(() => {
    if (editPublish === "Publish") {
      setPublishChoice(PublishEnum.LATER);
      form.setFieldValue("surveyPublishAt", new Date(survey?.surveyPublishAt));
    } else if (editPublish === "Expiry") {
      if (survey?.surveyEndAt) {
        setSurveyExpiry(ExpiryEnum.CUSTOM_DATE);
        form.setFieldValue("surveyEndAt", new Date(survey?.surveyEndAt));
      } else {
        setSurveyExpiry(ExpiryEnum.NO_EXPIRY);
      }
    }
  }, [editPublish, survey]);

  return (
    <FormModalLayout
      opened={opened}
      onClose={() => {
        form.reset();
        close();
      }}
      title={translations("Publish Settings")}
      centered
      onSubmit={handlePublish}
      buttonTitle={
        editPublish === "Expiry"
          ? translations("Update Expiry")
          : publishChoice === PublishEnum.LATER
            ? editPublish
              ? translations("Update Publish Schedule")
              : translations("Schedule Publish")
            : translations("Publish Now")
      }
      includeCancelButton
    >
      <div className="min-h-[250px] mt-6 space-y-6">
        {(!editPublish || editPublish === "Publish") && (
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label className="font-medium">
                {translations("Publish")}{" "}
                <span className="text-red-500">*</span>
              </Label>

              <RadioGroup
                value={publishChoice}
                onValueChange={setPublishChoice}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={PublishEnum.NOW} id="publish-now" />
                  <Label htmlFor="publish-now">Now</Label>
                </div>

                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value={PublishEnum.LATER}
                    id="publish-later"
                  />
                  <Label htmlFor="publish-later">
                    {translations("Schedule Later")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {publishChoice === PublishEnum.LATER && (
              <div className="space-y-2">
                <ContainedDateTimePickerInput
                  valueFormat="DD MMM YYYY - hh mm A"
                  dropdownType="modal"
                  placeholder={translations("Date")}
                  label={translations("Publish Survey At")}
                  {...form.getInputProps("surveyPublishAt")}
                  minDate={
                    new Date(
                      new Date().setMinutes(new Date().getMinutes() + 60),
                    )
                  }
                />

                <p className="text-xs text-red-500">
                  * {translations("*Time will be rounded to nearest hours ")}
                  <br />*{" "}
                  {translations(
                    "Publish time must be at least 1 hour ahead of current time",
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {(!editPublish || editPublish === "Expiry") && (
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label className="font-medium">
                {translations("Expiry Date")}{" "}
                <span className="text-red-500">*</span>
              </Label>

              <RadioGroup
                value={surveyExpiry}
                onValueChange={setSurveyExpiry}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={ExpiryEnum.NO_EXPIRY} id="no-expiry" />
                  <Label htmlFor="no-expiry">{translations("No Expiry")}</Label>
                </div>

                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value={ExpiryEnum.CUSTOM_DATE}
                    id="custom-expiry"
                  />
                  <Label htmlFor="custom-expiry">
                    {translations("Custom Date")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {surveyExpiry === ExpiryEnum.CUSTOM_DATE && (
              <div className="space-y-2">
                <ContainedDateTimePickerInput
                  dropdownType="modal"
                  valueFormat="DD MMM YYYY - hh mm A"
                  placeholder={translations("Date")}
                  label={translations("End Survey At")}
                  {...form.getInputProps("surveyEndAt")}
                  minDate={
                    publishChoice === PublishEnum.LATER
                      ? new Date(
                          new Date(form.values.surveyPublishAt).getTime() +
                            60 * 60 * 1000,
                        )
                      : new Date(
                          new Date().setMinutes(new Date().getMinutes() + 120),
                        )
                  }
                />

                <p className="text-xs text-red-500">
                  * {translations("End date must be after the publish date")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </FormModalLayout>
  );
};

export default ShareSurvey;
