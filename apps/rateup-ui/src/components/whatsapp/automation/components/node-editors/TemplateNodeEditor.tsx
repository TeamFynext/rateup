// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { useParams } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useImmer } from "use-immer";

import { useWaAutomatedReplyById } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useMetaAssets, useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import type { WaTemplateListEntry } from "@/backend/whatsapp/whatsapp.api";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import WaTemplateFormElements, {
  NoParams,
} from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter/templateDisplayModal/templatePreview/formElements/index.tsx";
import type { WaTemplateComponent } from "@/types/global";

import { ContainedSelection } from "../editor-ui.tsx";
import { isLeadgenNodeData, useFieldError } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

export const TemplateNodeEditor: React.FC<
  NodeComponentProps<"templateNode"> & { templates?: WaTemplateListEntry[] }
> = ({ nodeData, handleInputChange, templates }) => {
  const typedData = nodeData;
  const [parameterData, setParameterData] = useImmer<WaTemplateComponent[]>(
    typedData?.parameters || [],
  );
  const templateData =
    templates?.map((t) => ({
      label: t.data?.name,
      value: t.id,
      flowId: t.data?.components?.find((c) => c.type === "BUTTONS")?.buttons?.[0]?.["flow_id"],
    })) || [];
  const selectedTemplate = templates?.find((t: { id: string }) => t.id === typedData?.template?.id);
  const params = useParams({
    strict: false,
  });

  const flowbotId = params.flowbotId as string;
  const { data: waSettings, isLoading: isSettingsLoading } = useWaSettings();
  const { data, isPending } = useWaAutomatedReplyById(flowbotId);
  const waSetting =
    waSettings &&
    (waSettings.find((w) => w.phoneId === data?.whatsappSettingsPhoneId) ?? waSettings[0]);
  const waSettingsId = data && waSetting ? waSetting.id : "";
  const { data: metaAssets, isLoading } = useMetaAssets(waSettingsId);
  const leadgenData = useMemo(() => {
    if (waSettingsId && metaAssets) {
      const leadgenNode = data?.matchData?.json?.nodes.find((node) => node.type === "leadgenNode");
      const leadgenNodeData = isLeadgenNodeData(leadgenNode?.data) ? leadgenNode.data : undefined;
      if (leadgenNodeData?.leadgenFormId?.length) {
        const leadgenForm = metaAssets?.leadgenForms.find(
          (form) => form.id === leadgenNodeData.leadgenFormId,
        );
        return {
          data: leadgenNodeData,
          formQuestions: leadgenForm!.questions,
        };
      }
    }
  }, [metaAssets, waSettingsId]);
  // Update template parameters when they change
  useEffect(() => {
    handleInputChange("parameters", parameterData);
  }, [parameterData]);

  const templateError = useFieldError("template");

  if (isPending || isLoading || isSettingsLoading) return <RateupLoader />;

  return (
    <div className="flex flex-col gap-4">
      <ContainedSelection
        data={templateData}
        label="Template"
        allowDeselect={false}
        placeholder={`Select Template`}
        value={typedData?.template?.id || ""}
        onChange={(value, values) => {
          setParameterData([]);
          handleInputChange("template", {
            id: value,
            name: values?.label,
          });
        }}
        flex={1}
        error={templateError}
      />
      {templateData?.find((t: { value: string }) => t.value === typedData?.template?.id)
        ?.flowId && (
        <TeamSelector
          value={typedData.teamId}
          onChange={(id) => {
            handleInputChange("teamId", id);
          }}
          w={"100%"}
        />
      )}
      {(selectedTemplate?.data?.components?.length ?? 0) <= 1 &&
      selectedTemplate?.data?.components?.[0]?.example === undefined ? (
        <div className="flex h-[60dvh] flex-col items-center justify-center gap-4">
          <NoParams type={"Body"} />
        </div>
      ) : (
        selectedTemplate?.data && (
          <WaTemplateFormElements
            setParameterData={setParameterData}
            template={selectedTemplate.data}
            parameters={parameterData}
            leadgenData={leadgenData}
          />
        )
      )}
    </div>
  );
};
