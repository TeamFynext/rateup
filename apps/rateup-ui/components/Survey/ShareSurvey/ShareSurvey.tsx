import React, { useCallback, useEffect, useState } from "react";

import {
  ActionIcon,
  Box,
  Button,
  Center,
  CopyButton,
  Group,
  Image,
  Paper,
  Radio,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconChevronLeft,
  IconClockPlus,
  IconCopy,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";
import {
  gridFilteredSortedRowIdsSelector,
  GridPrintGetRowsToExportParams,
  GridRowId,
  selectedGridRowsSelector,
} from "@mui/x-data-grid";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import {
  ContainedDateTimePickerInput,
  ContainedSelection,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import FormModalLayout from "../../Modal/FormModalLayout";
import NothingFound from "../../NothingFound/NothingFound";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { StatusBadge } from "../SurveyCardList";
import { TabEnum } from "../SurveyId";
import GenerateTags from "./GenerateTags";
import IFrameModal from "./IFrameModal";
import ShareQR from "./ShareQR";
import TagManager from "./TagManager";

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
      const phone = waSettings.phone?.replace("+", "").replaceAll(" ", "");
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
            : "Your survey is incomplete",
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
              ? "Survey Un-Published."
              : "Survey Published Successfully!",
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

  const getSelectedRowsToExport = ({
    apiRef,
  }: GridPrintGetRowsToExportParams): GridRowId[] => {
    const selectedRowIds = selectedGridRowsSelector(apiRef);
    if (selectedRowIds.size > 0) {
      return Array.from(selectedRowIds.keys());
    }

    return gridFilteredSortedRowIdsSelector(apiRef);
  };

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
    <Stack p={"0.3125rem"} pr={"0.625rem"}>
      <PaperLayout>
        <Group justify="space-between">
          {isScheduled ? (
            <Switch
              fw={500}
              size="lg"
              checked={isScheduled}
              onChange={(event) => {
                showLoadingToast(
                  "Hold.. your survey is getting unpublished...",
                  "load-data",
                  true,
                  "Unpublishing...",
                );
                surveyUpdateMutation.mutate({
                  isPublished: event.currentTarget.checked,
                  surveyPublishAt: null,
                  surveyEndAt: null,
                });
              }}
              label={
                <Text fw={700} fz={"lg"}>
                  Scheduled
                </Text>
              }
            />
          ) : (
            <Switch
              fw={500}
              size="lg"
              checked={isPublished}
              onChange={(event) => {
                if (!isPublished) {
                  setEditPublish(null);
                  openPublishSettings();
                } else {
                  showLoadingToast(
                    "Hold.. your survey is getting UnPublished...",
                    "load-data",
                    true,
                    "Unpublishing...",
                  );
                  surveyUpdateMutation.mutate({
                    isPublished: event.currentTarget.checked,
                    surveyPublishAt: null,
                    surveyEndAt: null,
                  });
                }
              }}
              label={
                <Text fw={700} fz={"lg"}>
                  {isPublished ? "Published" : "Publish Survey"}
                </Text>
              }
            />
          )}
          <Group>
            <Text>Current Status: </Text>
            {isPublished ? (
              <StatusBadge active={survey?.active} />
            ) : (
              <Text c="dark.1"> Not published! </Text>
            )}
          </Group>

          <Stack>
            {(isPublished || survey?.surveyPublishAt) && (
              <Group>
                <Text w={150}>
                  {isScheduled ? "To be Published On" : "Published On"}:{" "}
                </Text>
                <Text c={isScheduled ? "orange.6" : "dark.1"}>
                  {survey?.surveyPublishAt
                    ? formatIsoDateStringWithTime(survey?.surveyPublishAt)
                    : "Nil"}
                </Text>
                {isScheduled && (
                  <ActionIcon
                    size={"sm"}
                    variant="subtle"
                    onClick={() => {
                      setEditPublish("Publish");
                      openPublishSettings();
                    }}
                  >
                    <IconPencil />
                  </ActionIcon>
                )}
              </Group>
            )}

            {survey?.surveyEndAt && (
              <Group>
                <Text w={150}>End At: </Text>
                {/* TODO : Highligh ended time */}
                {/* <Text>{(survey?.surveyEndAt && !isPublished && !isScheduled) ? 'Ended at:' : 'End at' }</Text> */}

                <Text c="dark.1">
                  {survey?.surveyEndAt
                    ? formatIsoDateStringWithTime(survey?.surveyEndAt)
                    : "Nil"}
                </Text>
                <ActionIcon
                  size={"sm"}
                  variant="subtle"
                  onClick={() => {
                    setEditPublish("Expiry");
                    openPublishSettings();
                  }}
                >
                  <IconPencil />
                </ActionIcon>
              </Group>
            )}
          </Stack>
          {!survey.surveyEndAt &&
            (survey.isPublished || survey.surveyPublishAt) && (
              <Tooltip label={"Schedule survey expiry"}>
                <ActionIcon
                  size={"sm"}
                  variant="subtle"
                  onClick={() => {
                    setEditPublish("Expiry");
                    openPublishSettings();
                  }}
                >
                  <IconClockPlus />
                </ActionIcon>
              </Tooltip>
            )}
          <PubliShSettingsModal
            opened={publishSettings}
            close={closePublishSettings}
            editPublish={editPublish}
            surveyUpdateMutation={surveyUpdateMutation}
            survey={survey}
          />

          <RateupButtonSecondary
            disabled={disableShare}
            title={survey?.active ? "Pause" : "Resume"}
            leftIcon={survey?.active ? <IconPlayerPause /> : <IconPlayerPlay />}
            onClick={() =>
              surveyStatusUpdateMutation.mutate({ active: !survey?.active })
            }
          />
        </Group>
      </PaperLayout>

      <FormModalLayout
        centered
        onClose={close}
        opened={opened}
        title="Survey contains errors"
      >
        <ScrollArea.Autosize mah={400} mb="xl">
          <Box my="xl">
            {Array.isArray(errors) ? (
              errors?.map((item, index) => (
                <Paper
                  radius="lg"
                  shadow="md"
                  key={item?.id}
                  p="md"
                  style={{ marginBottom: "10px" }}
                >
                  <Title order={4}>
                    {
                      getContent(
                        Object.values(item?.title)?.[0]?.toString() ?? "",
                      ) as React.ReactNode
                    }
                  </Title>
                  <ul>
                    {item?.errors?.map((error, index) => (
                      <li key={index}>
                        <Text c="#fa5252">{error}</Text>
                      </li>
                    ))}
                  </ul>
                </Paper>
              ))
            ) : (
              <Box>
                <Text c="red">Error: {errors?.error}</Text>
              </Box>
            )}
          </Box>
        </ScrollArea.Autosize>

        <Center>
          <RateupButtonBlue
            leftIcon={<IconChevronLeft />}
            title="Back to Edit Questions"
            onClick={() => {
              close();
              setActiveTab(TabEnum.Edit);
            }}
          />
        </Center>
      </FormModalLayout>
      <PaperLayout opacity={disableShare ? 0.5 : 1}>
        <Group gap="lg">
          <Stack style={{ minWidth: 300, flex: 1 }}>
            <Title order={4}>Share Survey</Title>
            <Group>
              <ContainedSelection
                style={{ flex: 1 }}
                disabled={disableShare}
                label="Select Team"
                allowDeselect={false}
                value={selectTeamDropdownState}
                miw={150}
                data={teamSelectData}
                onChange={handleContainedSelectionChange}
              />

              <Group gap={2} align="flex-start">
                <GenerateTags
                  disabled={disableShare}
                  tagSelectData={tag}
                  setTagSelectData={setTag}
                />
                {/* <Group gap={"xs"}>
                  <TagManager
                    isPublished={isPublished}
                    selectTeamDropdownValue={selectTeamDropdownState}
                    teamSelectData={teamSelectData}
                    onSelectTeamDropdownChange={handleContainedSelectionChange}
                    nothingFound={NothingFound}
                    getSelectedRowsToExport={getSelectedRowsToExport}
                    tagsToMap={tag}
                    surveyTitle={survey?.title}
                    surveyId={surveyId}
                    shareUrl={shareUrl}
                  />
                </Group> */}
              </Group>
            </Group>
            <CopyLinkComponent value={shareUrl} disabled={disableShare} />
          </Stack>

          <Stack style={{ minWidth: 300, flex: 1 }}>
            <Title order={4} style={{ textAlign: "center" }}>
              How would you like to survey people?
            </Title>
            <Group justify="center" gap="xl">
              <ActionIcon
                disabled={disableShare}
                size="xl"
                variant="light"
                onClick={() => shareButtonAction("mail")}
                style={{ background: "none" }}
              >
                <Tooltip
                  label="Share via Email"
                  withArrow
                  color="var(--light-grey-color)"
                  position="bottom"
                  styles={{ tooltip: { color: "grey" } }}
                >
                  <Image
                    opacity={!disableShare ? 1 : 0.5}
                    alt="mail icon"
                    src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/social-media-icons/mail.svg`}
                    w={40}
                    h={40}
                    style={{ objectFit: "contain" }}
                  />
                </Tooltip>
              </ActionIcon>
              <ActionIcon
                disabled={disableShare}
                size="xl"
                variant="light"
                onClick={() => shareButtonAction("whatsapp")}
                style={{ background: "none" }}
              >
                <Tooltip
                  label="Share via WhatsApp"
                  withArrow
                  color="var(--light-grey-color)"
                  position="bottom"
                  styles={{ tooltip: { color: "grey" } }}
                >
                  <Image
                    opacity={!disableShare ? 1 : 0.5}
                    alt="whatsapp icon"
                    src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/social-media-icons/whatsapp.svg`}
                    w={40}
                    h={40}
                    style={{ objectFit: "contain" }}
                  />
                </Tooltip>
              </ActionIcon>
              <ActionIcon
                disabled={disableShare}
                size="xl"
                variant="light"
                onClick={() => shareButtonAction("fb")}
                style={{ background: "none" }}
              >
                <Tooltip
                  label="Share via Facebook"
                  withArrow
                  color="var(--light-grey-color)"
                  position="bottom"
                  styles={{ tooltip: { color: "grey" } }}
                >
                  <Image
                    opacity={!disableShare ? 1 : 0.5}
                    alt="facebook icon"
                    src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/social-media-icons/facebook.svg`}
                    w={40}
                    h={40}
                    style={{ objectFit: "contain" }}
                  />
                </Tooltip>
              </ActionIcon>
              {survey?.type === SurveyType.Web && (
                <ActionIcon
                  disabled={disableShare}
                  size="xl"
                  variant="light"
                  onClick={openIframe}
                  style={{ background: "none" }}
                >
                  <Tooltip
                    label="Embed as iframe"
                    withArrow
                    color="var(--light-grey-color)"
                    position="bottom"
                    styles={{ tooltip: { color: "grey" } }}
                  >
                    <Image
                      opacity={!disableShare ? 1 : 0.5}
                      alt="iframe icon"
                      src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/iframe-icon.png`}
                      w={40}
                      h={40}
                      style={{ objectFit: "contain" }}
                    />
                  </Tooltip>
                </ActionIcon>
              )}
            </Group>
          </Stack>
        </Group>
      </PaperLayout>
      <ShareQR
        url={shareUrl}
        sx={{ borderRadius: "1rem" }}
        title={survey?.title}
        isPublished={!disableShare}
        id={surveyId}
        queryKey={"surveyShareSettings"}
        resourceName={"survey"}
      />
      <FormModalLayout
        title="Generate IFrame"
        opened={openedIframe}
        onClose={closeIframe}
        size="lg"
        centered
      >
        <IFrameModal close={closeIframe} shareUrl={shareUrl} />
      </FormModalLayout>
    </Stack>
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
  return (
    <Group gap={"0px"} align="center">
      <ContainedTextField
        readOnly
        value={value}
        label={label}
        pr="sm"
        disabled={disabled}
        style={{
          maxWidth: "600px",
          flexGrow: 1,
        }}
      />
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Button
            variant={copied ? "outline" : "filled"}
            onClick={copy}
            rightSection={<IconCopy />}
            disabled={disabled}
            radius={buttonRadius}
            mt={label ? "md" : undefined}
          >
            {copied ? "Copied url" : "Copy url"}
          </Button>
        )}
      </CopyButton>
    </Group>
  );
};

const PubliShSettingsModal = ({
  opened,
  close,
  editPublish,
  surveyUpdateMutation,
  survey,
}) => {
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
          ? "End date must be after the publish date."
          : null;
      },
      surveyEndAt: (value) => {
        const minEndDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
        return surveyExpiry === ExpiryEnum.CUSTOM_DATE && value < minEndDate
          ? "End date must be at least 2 hours ahead of current time."
          : null;
      },
    },
  });
  const handlePublish = (event) => {
    notifications.show({
      id: "load-data",
      color: "teal",
      title: "Publishing",
      loading: true,
      message: "Please hold on while publishing your survey",
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
      title={"Publish Settings"}
      centered
      onSubmit={handlePublish}
      buttonTitle={
        editPublish === "Expiry"
          ? "Update Expiry"
          : publishChoice === PublishEnum.LATER
            ? editPublish
              ? "Update Publish Schedule"
              : "Schedule Publish"
            : "Publish Now"
      }
      includeCancelButton
    >
      <Stack style={{ minHeight: "250px" }} mt="xl">
        {(!editPublish || editPublish === "Publish") && (
          <Stack mb="xl">
            <Radio.Group
              value={publishChoice}
              onChange={setPublishChoice}
              name="selectPublish"
              label="Publish"
              withAsterisk
            >
              <Group mt="xs">
                <Radio checked label="Now" value={PublishEnum.NOW} />
                <Radio label="Schedule Later" value={PublishEnum.LATER} />
              </Group>
            </Radio.Group>
            {publishChoice === PublishEnum.LATER && (
              <Stack>
                <ContainedDateTimePickerInput
                  valueFormat="DD MMM YYYY - hh mm A"
                  dropdownType="modal"
                  placeholder={"Date"}
                  label={"Publish Survey At"}
                  withAsterisk
                  {...form.getInputProps("surveyPublishAt")}
                  minDate={
                    new Date(
                      new Date().setMinutes(new Date().getMinutes() + 60),
                    )
                  }
                />
                <Text c="red" size="xs">
                  * Time will be rounded to nearest hours. <br />* Publish time
                  must be at least 1 hour ahead of current time.
                </Text>
              </Stack>
            )}
          </Stack>
        )}

        {(!editPublish || editPublish === "Expiry") && (
          <Stack mb="xl">
            <Radio.Group
              value={surveyExpiry}
              onChange={setSurveyExpiry}
              name="selectExpiry"
              label="Expiry Date"
              withAsterisk
            >
              <Group mt="xs">
                <Radio checked label="No Expiry" value={ExpiryEnum.NO_EXPIRY} />
                <Radio label="Custom Date" value={ExpiryEnum.CUSTOM_DATE} />
              </Group>
            </Radio.Group>

            {surveyExpiry === ExpiryEnum.CUSTOM_DATE && (
              <Stack>
                <ContainedDateTimePickerInput
                  dropdownType="modal"
                  valueFormat="DD MMM YYYY - hh mm A"
                  placeholder={"Date"}
                  label={"End Survey At"}
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
                <Text c="red" size="xs">
                  * End date must be after the publish date.
                </Text>
              </Stack>
            )}
          </Stack>
        )}
      </Stack>
    </FormModalLayout>
  );
};

export default ShareSurvey;
