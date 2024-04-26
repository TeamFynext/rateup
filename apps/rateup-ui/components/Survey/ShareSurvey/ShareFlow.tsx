import {
  Stack,
  Group,
  Title,
  Switch,
  Text,
  Button,
  Tooltip,
} from "@mantine/core";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import React, { useState, useEffect, useContext, useCallback } from "react";
import { ContainedSelection } from "../../input/ContainedInput/ContainedInput";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import ShareQR from "./ShareQR";
import { updateSurvey } from "../../../backend/surveys/survey.api";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RateupButtonSecondary } from "../../Button/RateupButtons";
import { StatusBadge } from "../SurveyCardList";
import { SurveyType, WaFlowStatus } from "../../../types/enums";
import { EditFlowContext } from "../../whatsapp/flows/FlowPage/EditFlow/EditFlowContext";
import { useUpdateSurveyMutation } from "../../../backend/surveys/surveys.query";
import { useRouter } from "next/router";
import {
  usePushToWaMutation,
  useWaFlowFromDb,
} from "../../../backend/whatsapp/flow/flow.query";
import { ShareMethods } from "./ShareMethods";
import { CopyLinkComponent } from "./ShareSurvey";
import { FlowShareMessageEditor } from "./FlowShareTemplateEditor";
import { modals } from "@mantine/modals";
import TagManager from "./TagManager";
import NothingFound from "../../NothingFound/NothingFound";
import { useWaSettings } from "../../../backend/whatsapp/settings/waSettings.query";

// TODO: add tag support
export const ShareFlow = ({
  allowUnpublishedShare = false,
}: {
  allowUnpublishedShare?: boolean;
}) => {
  const { survey } = useContext(EditFlowContext);
  const router = useRouter();
  const dbFlowId = router.query.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const surveyId = survey?.id;
  const [shareUrl, setShareUrl] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState(
    survey?.teams[0]?.mapId,
  );
  const [selectTeamDropdownState, setSelectTeamDropdownState] = useState("0");
  const [tag, setTag] = useState("");
  const [shortUrlId, setShortUrlId] = useState(survey?.teams[0]?.shortUrlId);

  const queryClient = useQueryClient();
  const { data: waSettings } = useWaSettings();
  useEffect(() => {
    if (!surveyId || !surveyTeamMapId) return;
    if (
      survey.type === SurveyType.WhatsApp ||
      survey.type === SurveyType.WaFlow
    ) {
      if (!waSettings) return;
      const phone = waSettings.phone?.replace("+", "").replaceAll(" ", "");

      if (shortUrlId) {
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
    }
  }, [
    surveyId,
    surveyTeamMapId,
    tag,
    shortUrlId,
    survey?.type,
    survey?.getLocation,
    waSettings,
  ]);

  useEffect(() => {
    const short = survey?.teams?.find(
      (data) => data.mapId === surveyTeamMapId,
    )?.shortUrlId;
    if (short) {
      setShortUrlId(short);
    }
  }, [survey?.teams, surveyTeamMapId]);

  const surveyUpdateMutation = useUpdateSurveyMutation();
  const pushToWaMutation = usePushToWaMutation();

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

  const teamSelectData = survey?.teams?.map((team) => ({
    value: team?.mapId,
    label: team?.code,
  }));

  const isPublished = dbFlow.status === WaFlowStatus.PUBLISHED;
  const canPublish = !isPublished && !dbFlow.pendingSave;
  const disableShare = !(isPublished || allowUnpublishedShare);

  const handleContainedSelectionChange = useCallback(
    (value) => {
      const teamObj = survey.teams[value];
      setSurveyTeamMapId(teamObj.mapId);
      console.log(teamObj.shortUrlId);

      setShortUrlId(teamObj.shortUrlId);
      setSelectTeamDropdownState(value);
    },
    [survey],
  );
  const confirmModal = () => {
    modals.openConfirmModal({
      title: "Confirm Publish",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to Publish this Flow? You{" "}
          <b>can&apos;t edit flows after </b>
          publishing.
          <br />
          It is advised to test the flow by opening the link in before
          publishing and make sure everything is working fine.
        </Text>
      ),
      labels: { confirm: "Yes", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: handlePublish,
      onCancel: () => modals.closeAll(),
    });
  };
  const tagSelectData = survey?.teams[selectTeamDropdownState]?.tags?.map(
    (tag) => {
      return tag;
    },
  );
  // TODO: allow user to deprecate the flow.
  // TODO: implement pause & resume

  function handlePublish() {
    surveyUpdateMutation.mutate(
      {
        surveyId: survey.id,
        data: { isPublished: true },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["flow", "db"] });
        },
      },
    );
  }

  function handleSaveToWa() {
    pushToWaMutation.mutate(dbFlowId);
  }

  return (
    <Stack p={2} h={"fit-content"}>
      <PaperLayout
        p="30px"
        style={{
          boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
          overflowX: "auto",
        }}
      >
        <Group justify="space-between">
          <Group>
            <Tooltip
              label={
                dbFlow.pendingSave
                  ? "Save your flow to WhatsApp, so that you can test or share draft version before publishing."
                  : "No changes to save"
              }
            >
              <Button
                disabled={!dbFlow.pendingSave}
                onClick={handleSaveToWa}
                loading={pushToWaMutation.isPending}
              >
                Save to WhatsApp
              </Button>
            </Tooltip>
            <Tooltip
              label={
                !isPublished
                  ? dbFlow.pendingSave
                    ? "Save your flow to WhatsApp first."
                    : "Publish your flow to WhatsApp, so that you can share it."
                  : "You can`t edit flows after publishing."
              }
            >
              <div>
                {" "}
                {/* adding div since tooltip won't work when its children is an input element. TODO: fixthis */}
                <Switch
                  fw={500}
                  size="lg"
                  checked={isPublished}
                  disabled={!canPublish}
                  onChange={confirmModal}
                  label={
                    <Text fw={700} fz={"lg"}>
                      {isPublished ? "Published" : "Publish Survey"}
                    </Text>
                  }
                />
              </div>
            </Tooltip>
          </Group>
          <Group>
            <Text>Current Status: </Text>
            {isPublished ? (
              <StatusBadge active={survey?.active} />
            ) : (
              <Text c="dark.1"> Not published! </Text>
            )}
          </Group>
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
      <PaperLayout p="md" shadow="lg" opacity={disableShare ? 0.5 : 1}>
        <Group gap="lg">
          <Stack style={{ minWidth: 300, flex: 1 }} p="md">
            <Title order={4}>Share Survey</Title>
            <Group>
              <ContainedSelection
                style={{ flex: 1 }}
                disabled={disableShare}
                label="Select Team"
                allowDeselect={false}
                miw={150}
                value={surveyTeamMapId}
                data={teamSelectData}
                onChange={setSurveyTeamMapId}
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
                  isPublished={true}
                  selectTeamDropdownValue={selectTeamDropdownState}
                  teamSelectData={teamSelectData}
                  onSelectTeamDropdownChange={handleContainedSelectionChange}
                  nothingFound={NothingFound}
                  getSelectedRowsToExport={null}
                  tagsToMap={survey.teams[selectTeamDropdownState].tags}
                  surveyTitle={survey?.title}
                  surveyId={surveyId}
                  shareUrl={shareUrl}
                />
              </Group>
            </Group>
            <CopyLinkComponent value={shareUrl} disabled={disableShare} />
          </Stack>
          <ShareMethods
            survey={survey}
            disableShare={disableShare}
            shareUrl={shareUrl}
          />
        </Group>
      </PaperLayout>
      <FlowShareMessageEditor
        selectedTeamCode={
          teamSelectData.find((t) => t.value === surveyTeamMapId)?.label
        }
      />
      <ShareQR
        url={shareUrl}
        sx={{ borderRadius: "0.5rem" }}
        title={survey.title}
        isPublished={!disableShare}
        id={surveyId}
        queryKey={"surveyShareSettings"}
        resourceName={"survey"}
      />
    </Stack>
  );
};
