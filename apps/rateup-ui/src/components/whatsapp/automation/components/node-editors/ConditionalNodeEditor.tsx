// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { ContainedTextField } from "../editor-ui.tsx";
import { styles, useFieldError } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// ConditionalNode Component
export const ConditionalNodeEditor: React.FC<NodeComponentProps<"conditionalNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  return (
    <div className={styles.editorSection}>
      <ContainedTextField
        label="Condition"
        value={typedData.condition || ""}
        onChange={(e) => handleInputChange("condition", e.target.value)}
        placeholder="Enter condition (e.g., {variable} == 'value')"
        error={useFieldError("condition")}
      />
      <div className={styles.conditionalHelp}>
        <h4>Condition Examples:</h4>
        <ul>
          <li>{"{name} == 'John'"}</li>
          <li>{"{age} > 18"}</li>
          <li>{"{response} includes 'yes'"}</li>
        </ul>
      </div>
    </div>
  );
};
