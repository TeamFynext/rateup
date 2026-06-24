import { Button, Group, Stack, Text, Title, Tooltip } from "@mantine/core";
import { useParams } from "@tanstack/react-router";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { usePushToWaMutation, useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { SurveyType, WaFlowStatus } from "@/types/enums.ts";

import { ContainedSelection } from "../../input/ContainedInput/ContainedInput.tsx";
import NothingFound from "../../NothingFound/NothingFound.tsx";
import PaperLayout from "../../styled/Layouts/PaperLayout.tsx";
import { EditFlowContext } from "../../whatsapp/flows/FlowPage/EditFlow/EditFlowContext.ts";
import { StatusBadge } from "../SurveyCardList.tsx";
import { FlowShareMessageEditor } from "./FlowShareTemplateEditor.tsx";
import { ShareMethods } from "./ShareMethods.tsx";
import ShareQR from "./ShareQR/index.tsx";
import { CopyLinkComponent } from "./ShareSurvey.tsx";
import TagManager from "./TagManager/index.tsx";

// TODO: add tag support
export const ShareFlow = ({
  allowUnpublishedShare = false,
}: {
  allowUnpublishedShare?: boolean;
}) => {
  const { survey } = useContext(EditFlowContext);
  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;

  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const surveyId = survey?.id;
  const [shareUrl, setShareUrl] = useState("");
  const [surveyTeamMapId, setSurveyTeamMapId] = useState(survey?.teams[0]?.mapId);
  const [selectTeamDropdownState, setSelectTeamDropdownState] = useState("0");
  const [tag, setTag] = useState("");
  const [shortUrlId, setShortUrlId] = useState(survey?.teams[0]?.shortUrlId);

  const { data: waSettings } = useWaSettings();
  useEffect(() => {
    if (!surveyId || !surveyTeamMapId) return;
    if (survey.type === SurveyType.WhatsApp || survey.type === SurveyType.WaFlow) {
      if (!waSettings) return;

      if (shortUrlId) {
        setShareUrl(
          `${import.meta.env.VITE_FRONTEND_URL}/was/${shortUrlId}${tag ? `?tag=${tag}` : ""}`,
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
  }, [surveyId, surveyTeamMapId, tag, shortUrlId, survey?.type, survey?.getLocation, waSettings]);

  useEffect(() => {
    const short = survey?.teams?.find((data) => data.mapId === surveyTeamMapId)?.shortUrlId;
    if (short) {
      setShortUrlId(short);
    }
  }, [survey?.teams, surveyTeamMapId]);

  const pushToWaMutation = usePushToWaMutation();
  const { t: translations } = useTranslation();

  const teamSelectData = survey?.teams?.map((team) => ({
    value: team?.mapId,
    label: team?.code,
  }));

  const isPublished = dbFlow.status === WaFlowStatus.PUBLISHED;
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
  const tagSelectData = survey?.teams[selectTeamDropdownState]?.tags?.map((tag) => {
    return tag;
  });

  const handleSaveToWa = () => {
    pushToWaMutation.mutate(dbFlowId);
  };

  return (
    <Stack p={10} pr={16}>
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
                  ? translations("Save your flow to WhatsApp")
                  : translations("No changes to save")
              }
            >
              <Button
                disabled={!dbFlow.pendingSave}
                onClick={handleSaveToWa}
                loading={pushToWaMutation.isPending}
              >
                {translations("Save to WhatsApp")}
              </Button>
            </Tooltip>
          </Group>
          <Group>
            <Text>{translations("Current Status: ")}</Text>
            {isPublished ? (
              <StatusBadge active={survey?.active} />
            ) : (
              <Text c="dark.1"> {translations("Not published! ")}</Text>
            )}
          </Group>
        </Group>
      </PaperLayout>
      <PaperLayout p="md" shadow="lg" opacity={disableShare ? 0.5 : 1}>
        <Group gap="lg">
          <Stack style={{ minWidth: 300, flex: 1 }} p="md">
            <Title order={4}>{translations("Share Survey")}</Title>
            <Group>
              <ContainedSelection
                style={{ flex: 1 }}
                disabled={disableShare}
                label={translations("Select Team")}
                allowDeselect={false}
                miw={150}
                value={surveyTeamMapId}
                data={teamSelectData}
                onChange={setSurveyTeamMapId}
              />
              <Group gap={2} align="flex-start" style={{ flex: 1 }}>
                <ContainedSelection
                  disabled={disableShare || tagSelectData.length === 0}
                  label={translations("Select Tag")}
                  placeholder={translations("select a single Tag")}
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
                  tagsToMap={survey.teams[selectTeamDropdownState].tags}
                  surveyTitle={survey?.title}
                  surveyId={surveyId}
                  shareUrl={shareUrl}
                />
              </Group>
            </Group>
            <CopyLinkComponent value={shareUrl} disabled={disableShare} />
          </Stack>
          <ShareMethods survey={survey} disableShare={disableShare} shareUrl={shareUrl} />
        </Group>
      </PaperLayout>
      <FlowShareMessageEditor
        selectedTeamCode={teamSelectData.find((t) => t.value === surveyTeamMapId)?.label}
      />
      <ShareQR
        url={shareUrl || import.meta.env.VITE_FRONTEND_URL}
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
