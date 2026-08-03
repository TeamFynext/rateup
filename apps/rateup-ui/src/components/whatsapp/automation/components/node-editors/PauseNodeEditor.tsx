// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { ContainedNumberInput, ContainedSelection } from "../editor-ui.tsx";
import { useFieldError } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// PauseNode Component
export const PauseNodeEditor: React.FC<NodeComponentProps<"pauseNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  return (
    <div className="flex flex-col gap-4">
      <ContainedNumberInput
        label="Pause Duration"
        min={1}
        value={typedData.duration?.toString()}
        onChange={(val) => handleInputChange("duration", val)}
        description="Duration to pause the automation flow"
        error={useFieldError("duration")}
      />
      <ContainedSelection
        label="Unit"
        placeholder="Select unit"
        value={typedData.unit}
        data={[
          { value: "seconds", label: "Seconds" },
          { value: "minutes", label: "Minutes" },
        ]}
        onChange={(val) => handleInputChange("unit", val)}
        allowDeselect={false}
      />
    </div>
  );
};
