// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { ContainedTextField } from "../editor-ui.tsx";
import { styles } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// StartNode Component
export const StartNodeEditor: React.FC<NodeComponentProps<"startNode">> = () => {
  return (
    <div className={styles.editorSection}>
      <ContainedTextField label="Start Message" disabled />
    </div>
  );
};
