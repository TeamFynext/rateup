import {
  Stack,
  Button,
  CopyButton,
  Group,
  Title,
  ActionIcon,
  Switch,
  Paper,
  Box,
  Text,
  ScrollArea,
  Center,
  Image,
  Tooltip,
  Radio,
} from "@mantine/core";
import {
  IconCheck,
  IconChevronLeft,
  IconCopy,
  IconPlayerPause,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";
import React, { useState, useEffect, useCallback } from "react";
import {
  ContainedDateTimePickerInput,
  ContainedSelection,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import {
  GridPrintGetRowsToExportParams,
  GridRowId,
  gridFilteredSortedRowIdsSelector,
  selectedGridRowsSelector,
} from "@mui/x-data-grid";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import ShareQR from "./ShareQR";
import { updateSurvey } from "../../../backend/surveys/survey.api";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDisclosure } from "@mantine/hooks";
import FormModalLayout from "../../Modal/FormModalLayout";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import { TabEnum } from "../SurveyId";
import { StatusBadge } from "../SurveyCardList";
import IFrameModal from "./IFrameModal";
import NothingFound from "../../NothingFound/NothingFound";
import TagManager from "./TagManager";
import { SurveyType } from "../../../types/enums";
import { useWaSettings } from "../../../backend/whatsapp/settings/waSettings.query";
import { getContent } from "../../../utils";
import { useForm } from "@mantine/form";
import {
  formatIsoDateStringWithTime,
  roundOffMinutesAndSeconds,
} from "../../../utils/dateTime";
import { docsPath } from "../../../utils/constants";
import InfoButton from "../../Button/InfoButton";
import { showLoadingToast } from "../../../utils/notifications";

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
  const [tag, setTag] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState(
    survey?.teams[0]?.mapId,
  );

  const [shortUrlId, setShortUrlId] = useState(survey?.teams[0]?.shortUrlId);
  const [tagsToMap, setTagsToMap] = useState<Array<string>>([]);
  const [isPublished, setIsPublished] = useState(survey?.isPublished);
  const [publishChoice, setPublishChoice] = useState<any>(PublishEnum.NOW);
  const [surveyExpiry, setSurveyExpiry] = useState<any>(ExpiryEnum.NO_EXPIRY);
  const [isScheduled, setIsScheduled] = useState(
    !survey?.isPublished && survey?.surveyPublishAt ? true : false,
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
      //TODO validate edge case: time selected should be 1hr ahead
    },
  });

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
    form.reset();
    setPublishChoice(PublishEnum.NOW);
    setSurveyExpiry(ExpiryEnum.NO_EXPIRY);
  }, [publishSettings]);

  useEffect(() => {
    if (!surveyId || !surveyTeamMapId) return;
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
          `${process.env.NEXT_PUBLIC_FRONTEND_URL}/was/${shortUrlId}${tag ? `?tag=${tag}` : ""}`,
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
          `${process.env.NEXT_PUBLIC_FRONTEND_URL}/ws/${shortUrlId}${tag ? `?tag=${tag}` : ""}`,
        );
      } else {
        setShareUrl(
          `${
            process.env.NEXT_PUBLIC_FRONTEND_URL
          }/public/survey/${surveyTeamMapId}${tag ? `?tag=${tag}` : ""}`,
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

  // let tagSelectData = survey?.teams
  //   ?.filter((ft) => ft?.mapId === surveyTeamMapId)
  //   ?.map((team) => team.tags)
  //   .reduce((acc, val) => acc.concat(val), []);
  // useEffect(() => {
  //   setTagsToMap(tagSelectData);
  // }, [survey, surveyTeamMapId]);

  const tagSelectData = survey?.teams[selectTeamDropdownState]?.tags?.map(
    (tag) => {
      return tag;
    },
  );

  useEffect(() => {
    setTag(null);
  }, [selectTeamDropdownState]);

  const getSelectedRowsToExport = ({
    apiRef,
  }: GridPrintGetRowsToExportParams): GridRowId[] => {
    const selectedRowIds = selectedGridRowsSelector(apiRef);
    if (selectedRowIds.size > 0) {
      return Array.from(selectedRowIds.keys());
    }

    return gridFilteredSortedRowIdsSelector(apiRef);
  };

  const disableShare = !(isPublished || allowUnpublishedShare);

  const handleContainedSelectionChange = useCallback(
    (value) => {
      const teamObj = survey.teams[value];
      setSurveyTeamMapId(teamObj.mapId);
      setShortUrlId(teamObj.shortUrlId);
      setSelectTeamDropdownState(value);
    },
    [survey],
  );

  const handlePublish = (event) => {
    notifications.show({
      id: "load-data",
      color: "teal",
      title: "Publishing",
      loading: true,
      message: "Please hold on while publishing your survey",
      autoClose: 3000,
    });
    surveyUpdateMutation.mutate(
      {
        isPublished: publishChoice === PublishEnum.NOW ? true : false,
        surveyPublishAt:
          publishChoice === PublishEnum.NOW
            ? new Date()
            : new Date(roundOffMinutesAndSeconds(form.values.surveyPublishAt)),
        surveyEndAt:
          surveyExpiry === ExpiryEnum.NO_EXPIRY
            ? null
            : new Date(roundOffMinutesAndSeconds(form.values.surveyEndAt)),
      },
      {
        onSuccess: () => {
          closePublishSettings();
        },
      },
    );
  };

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
            <FormModalLayout
              opened={publishSettings}
              onClose={closePublishSettings}
              title={"Publish Settings"}
              centered
              onSubmit={handlePublish}
              buttonTitle={
                publishChoice === PublishEnum.LATER
                  ? "Schedule Publish"
                  : "Publish Now"
              }
            >
              <Stack style={{ minHeight: "250px" }} mt="xl">
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
                        minDate={new Date()}
                      />
                      <Text c="red" size="xs">
                        *Time will be rounded to nearest hours.
                      </Text>
                    </Stack>
                  )}
                </Stack>
                <Stack mb="xl">
                  <Radio.Group
                    value={surveyExpiry}
                    onChange={setSurveyExpiry}
                    name="selectExpiry"
                    label="Expiry Date"
                    withAsterisk
                  >
                    <Group mt="xs">
                      <Radio
                        checked
                        label="No Expiry"
                        value={ExpiryEnum.NO_EXPIRY}
                      />
                      <Radio
                        label="Custom Date"
                        value={ExpiryEnum.CUSTOM_DATE}
                      />
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
                        minDate={new Date()}
                      />
                      <Text c="red" size="xs">
                        *Time will be rounded to nearest hours.
                      </Text>
                    </Stack>
                  )}
                </Stack>
              </Stack>
            </FormModalLayout>

            <Text>Current Status: </Text>
            {isPublished ? (
              <StatusBadge active={survey?.active} />
            ) : (
              <Text c="dark.1"> Not published! </Text>
            )}
          </Group>

          {(isPublished || survey?.surveyPublishAt) && (
            <Group>
              <Text>
                {isScheduled ? "To be Published On" : "Published On"}:{" "}
              </Text>
              <Text c={isScheduled ? "blue.7" : "dark.1"}>
                {survey?.surveyPublishAt
                  ? formatIsoDateStringWithTime(survey?.surveyPublishAt)
                  : "Nil"}
              </Text>
            </Group>
          )}

          {survey?.surveyEndAt && (
            <Group>
              <Text>End At: </Text>
              {/* TODO : Highligh ended time */}
              {/* <Text>{(survey?.surveyEndAt && !isPublished && !isScheduled) ? 'Ended at:' : 'End at' }</Text> */}

              <Text c="dark.1">
                {survey?.surveyEndAt
                  ? formatIsoDateStringWithTime(survey?.surveyEndAt)
                  : "Nil"}
              </Text>
            </Group>
          )}

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
                      <li>
                        <Text key={index} c="#fa5252">
                          {error}
                        </Text>
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

              <Group gap={2} align="flex-start" style={{ flex: 1 }}>
                <ContainedSelection
                  disabled={disableShare || tagSelectData.length === 0}
                  label="Select Tag"
                  placeholder="select a single Tag"
                  miw={150}
                  data={tagSelectData}
                  value={tag}
                  onChange={(value) => setTag(value)}
                />
                <TagManager
                  isPublished={isPublished}
                  selectTeamDropdownValue={selectTeamDropdownState}
                  teamSelectData={teamSelectData}
                  onSelectTeamDropdownChange={handleContainedSelectionChange}
                  nothingFound={NothingFound}
                  getSelectedRowsToExport={getSelectedRowsToExport}
                  tagsToMap={survey.teams[selectTeamDropdownState].tags}
                  surveyTitle={survey?.title}
                  surveyId={surveyId}
                  shareUrl={shareUrl}
                />
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

export default ShareSurvey;
