// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { TeamSelector } from "@/components/input/TeamSelector.tsx";

import { ContainedSelection } from "../editor-ui.tsx";
import { FieldMsg, useFieldError } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// FlowNode Component
export const FlowNodeEditor: React.FC<NodeComponentProps<"flowNode"> & { flows?: DbFlow[] }> = ({
  nodeData,
  handleInputChange,
  flows,
}) => {
  const typedData = nodeData;
  return (
    <div className="flex flex-col gap-4">
      <ContainedSelection
        data={
          flows?.map((t) => ({
            label: t.name,
            value: t.dbFlowId,
          })) ?? []
        }
        label="Flow"
        allowDeselect={false}
        placeholder={`Select Flow`}
        value={typedData?.flow?.id || ""}
        onChange={(value, values) => {
          handleInputChange("flow", {
            id: value,
            name: values?.label,
          });
        }}
        flex={1}
        error={useFieldError("flow")}
      />
      {typedData?.flow?.id && (
        <>
          <TeamSelector
            value={typedData.teamId}
            onChange={(id) => {
              handleInputChange("teamId", id);
            }}
            w={"100%"}
          />
          <FieldMsg name="teamId" />
        </>
      )}
    </div>
  );
};
