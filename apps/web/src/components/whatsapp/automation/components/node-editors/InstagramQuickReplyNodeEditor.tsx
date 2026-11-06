// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { Button } from "@rateup/ui/components/button";
import { IconX } from "@tabler/icons-react";

import { useChannelLimits } from "../../chatbotPlatformContext.ts";
import { ContainedTextField } from "../editor-ui.tsx";
import { FieldMsg, useFieldError } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// Instagram Quick Reply Node Editor
export const InstagramQuickReplyNodeEditor: React.FC<
  NodeComponentProps<"instagramQuickReplyNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;
  const limits = useChannelLimits();
  const textError = useFieldError("text");

  return (
    <div className="flex flex-col gap-2">
      <ContainedTextField
        label="Message Text"
        placeholder="Enter your message"
        required
        value={typedData.text || ""}
        onChange={(e) => handleInputChange("text", e.target.value)}
        maxLength={limits.text}
        error={textError}
      />

      <p className="mt-2 text-sm font-medium">Quick Replies</p>
      <p className="text-xs text-muted-foreground">
        Add up to {limits.quickReplies.max} quick reply buttons
      </p>
      <FieldMsg name="quick_replies" />

      {(typedData.quick_replies || []).map((reply, index: number) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <ContainedTextField
            flex={1}
            placeholder="Reply text"
            value={reply.title || ""}
            onChange={(e) => {
              const newReplies = [...(typedData.quick_replies || [])];
              newReplies[index] = {
                ...newReplies[index],
                title: e.target.value,
              };
              handleInputChange("quick_replies", newReplies);
            }}
            maxLength={limits.quickReplies.title}
          />
          <ContainedTextField
            flex={1}
            placeholder="Payload (optional)"
            value={reply.payload || ""}
            onChange={(e) => {
              const newReplies = [...(typedData.quick_replies || [])];
              newReplies[index] = {
                ...newReplies[index],
                payload: e.target.value,
              };
              handleInputChange("quick_replies", newReplies);
            }}
          />
          <Button
            aria-label="Remove"
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              const newReplies = [...(typedData.quick_replies || [])];
              newReplies.splice(index, 1);
              handleInputChange("quick_replies", newReplies);
            }}
          >
            <IconX size={14} />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        disabled={(typedData.quick_replies?.length ?? 0) >= limits.quickReplies.max}
        onClick={() => {
          const newReplies = [
            ...(typedData.quick_replies || []),
            {
              content_type: "text" as const,
              title: "",
              id: crypto.randomUUID(),
            },
          ];
          handleInputChange("quick_replies", newReplies);
        }}
      >
        + Add Quick Reply
      </Button>
    </div>
  );
};
