import {
  Stack,
  Button,
  CopyButton,
  Group,
  Title,
  Switch,
  Text,
} from "@mantine/core";
import {
  IconCheck,
  IconChevronLeft,
  IconCopy,
  IconPlayerPause,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";
import React, { useState, useEffect, useContext } from "react";
import {
  ContainedSelection,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import ShareQR from "./ShareQR";
import { updateSurvey } from "../../../backend/surveys/survey.api";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import { StatusBadge } from "../SurveyCardList";
import { generateWaSurveyUrl } from "../../../utils/whatsapp/wa_url";
import { SurveyType, WaFlowStatus } from "../../../types/enums";
import { EditFlowContext } from "../../whatsapp/flows/FlowPage/EditFlow/EditFlowContext";
import { useUpdateSurveyMutation } from "../../../backend/surveys/surveys.query";
import { useRouter } from "next/router";
import { useWaFlowFromDb } from "../../../backend/whatsapp/flow/flow.query";
import { ShareMethods } from "./ShareMethods";
import { CopyLinkComponent } from "./ShareSurvey";
import { FlowShareTemplateEditor } from "./FlowShareTemplateEditor";
import { modals } from "@mantine/modals";

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

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!surveyId || !surveyTeamMapId) return;
    if (
      survey.type === SurveyType.WhatsApp ||
      survey.type === SurveyType.WaFlow
    ) {
      // TODO: get phone number from phone id (add phone number field)
      if (survey.getLocation) {
        // redirecting through our page to fetch ip
        setShareUrl(`${window.origin}/public/wa/${surveyTeamMapId}/redirect`);
      } else {
        setShareUrl(generateWaSurveyUrl(surveyTeamMapId));
      }
    }
  }, [surveyId, surveyTeamMapId]);

  const surveyUpdateMutation = useUpdateSurveyMutation();

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
  const disableShare = !(isPublished || allowUnpublishedShare);

  const confirmModal = () => {
    modals.openConfirmModal({
      title: "Confirm Publish",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to Publish this Flow? You{" "}
          <b>can't edit flows after </b>
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
          <Switch
            fw={500}
            size="lg"
            checked={isPublished}
            disabled={isPublished}
            onChange={confirmModal}
            label={
              <Text fw={700} fz={"lg"}>
                {isPublished ? "Published" : "Publish Survey"}
              </Text>
            }
          />
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
      <FlowShareTemplateEditor />
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
