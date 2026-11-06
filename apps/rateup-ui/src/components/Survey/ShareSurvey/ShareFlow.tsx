import { useParams } from "@tanstack/react-router";
import { useId, useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { usePushToWaMutation, useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils";
import { SurveyType, WaFlowStatus } from "@/types/enums.ts";

import NothingFound from "../../NothingFound/NothingFound.tsx";
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
  const uid = useId();
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

  const isPublished = dbFlow?.status === WaFlowStatus.PUBLISHED;
  const disableShare = !(isPublished || allowUnpublishedShare);

  const handleContainedSelectionChange = useCallback(
    (value: string) => {
      const teamObj = survey.teams[Number(value)];
      setSurveyTeamMapId(teamObj.mapId);
      console.log(teamObj.shortUrlId);

      setShortUrlId(teamObj.shortUrlId);
      setSelectTeamDropdownState(value);
    },
    [survey],
  );
  const tagSelectData = survey?.teams[Number(selectTeamDropdownState)]?.tags?.map((tag: string) => {
    return tag;
  });

  const handleSaveToWa = () => {
    pushToWaMutation.mutate(dbFlowId);
  };

  return (
    <TooltipProvider delay={150}>
      <div className="flex flex-col gap-2.5 p-2.5 pr-4">
        <Card className="overflow-x-auto p-[30px] shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px]">
          <div className="flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger render={<span className="inline-block" />}>
                <Button
                  disabled={!dbFlow?.pendingSave || pushToWaMutation.isPending}
                  onClick={handleSaveToWa}
                >
                  {pushToWaMutation.isPending && <Spinner data-icon="inline-start" />}
                  {translations("Save to WhatsApp")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {dbFlow?.pendingSave
                  ? translations("Save your flow to WhatsApp")
                  : translations("No changes to save")}
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2">
              <span>{translations("Current Status: ")}</span>
              {isPublished ? (
                <StatusBadge active={survey?.active} />
              ) : (
                <span className="text-muted-foreground"> {translations("Not published! ")}</span>
              )}
            </div>
          </div>
        </Card>
        <Card className={cn("p-4 shadow-lg", disableShare ? "opacity-50" : "opacity-100")}>
          <div className="flex gap-5">
            <div className="flex min-w-[300px] flex-1 flex-col gap-4">
              <h4 className="text-lg font-semibold">{translations("Share Survey")}</h4>
              <div className="flex gap-3">
                <Field className="flex-1">
                  <FieldLabel htmlFor={`${uid}-field`}>{translations("Select Team")}</FieldLabel>
                  <Select
                    disabled={disableShare}
                    value={surveyTeamMapId}
                    onValueChange={(value) => setSurveyTeamMapId(value ?? "")}
                    items={teamSelectData}
                  >
                    <SelectTrigger id={`${uid}-field`} className="w-full min-w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teamSelectData?.map((team) => (
                        <SelectItem key={team.value} value={team.value}>
                          {team.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex flex-1 items-start gap-0.5">
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`${uid}-field-2`}>{translations("Select Tag")}</FieldLabel>
                    <Select
                      disabled={disableShare || tagSelectData.length === 0}
                      value={tag}
                      onValueChange={(value) => setTag(value ?? "")}
                      items={tagSelectData?.map((tagItem) => ({ value: tagItem, label: tagItem }))}
                    >
                      <SelectTrigger id={`${uid}-field-2`} className="w-full min-w-[150px]">
                        <SelectValue placeholder={translations("select a single Tag")} />
                      </SelectTrigger>
                      <SelectContent>
                        {tagSelectData?.map((tagItem: string) => (
                          <SelectItem key={tagItem} value={tagItem}>
                            {tagItem}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <TagManager
                    isPublished={true}
                    selectTeamDropdownValue={selectTeamDropdownState}
                    teamSelectData={teamSelectData}
                    onSelectTeamDropdownChange={handleContainedSelectionChange}
                    nothingFound={<NothingFound text={translations("No tags found")} />}
                    tagsToMap={survey.teams[Number(selectTeamDropdownState)].tags}
                    surveyTitle={survey?.title}
                    surveyId={surveyId}
                    shareUrl={shareUrl}
                  />
                </div>
              </div>
              <CopyLinkComponent value={shareUrl} disabled={disableShare} />
            </div>
            <ShareMethods survey={survey} disableShare={disableShare} shareUrl={shareUrl} />
          </div>
        </Card>
        <FlowShareMessageEditor
          selectedTeamCode={teamSelectData.find((t) => t.value === surveyTeamMapId)?.label ?? ""}
        />
        <ShareQR
          url={shareUrl || import.meta.env.VITE_FRONTEND_URL}
          title={survey.title}
          isPublished={!disableShare}
          id={surveyId}
          queryKey={"surveyShareSettings"}
          resourceName={"survey"}
        />
      </div>
    </TooltipProvider>
  );
};
