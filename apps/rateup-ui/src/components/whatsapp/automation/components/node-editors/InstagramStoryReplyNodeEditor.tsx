// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { ContainedTextField, Switch } from "../editor-ui.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// Instagram Story Reply Node Editor
export const InstagramStoryReplyNodeEditor: React.FC<
  NodeComponentProps<"instagramStoryReplyNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;

  return (
    <div className="flex flex-col gap-2">
      <Switch
        label="Story Mention"
        description="Enable if this is a response to a story mention"
        checked={typedData.story_mention || false}
        onChange={(e) => handleInputChange("story_mention", e.currentTarget.checked)}
      />

      <ContainedTextField
        label="Reply Text"
        placeholder="Enter your reply message"
        required
        value={typedData.text || ""}
        onChange={(e) => handleInputChange("text", e.target.value)}
      />

      <p className="text-xs text-muted-foreground">
        This node will send a message in response to Instagram story replies or mentions
      </p>
    </div>
  );
};
