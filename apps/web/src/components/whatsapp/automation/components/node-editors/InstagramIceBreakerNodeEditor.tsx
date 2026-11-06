// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { IconPlus, IconTrash } from "@tabler/icons-react";

import { Button } from "@/components/ui/button.tsx";

import { ContainedTextField } from "../editor-ui.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// Instagram Ice Breaker Node Editor
export const InstagramIceBreakerNodeEditor: React.FC<
  NodeComponentProps<"instagramIceBreakerNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Ice Breakers</p>
      <p className="text-xs text-muted-foreground">
        Add conversation starters that appear in the Instagram chat. Users can tap these to start a
        conversation.
      </p>

      {(typedData.iceBreakers || []).map((iceBreaker, index: number) => (
        <div key={index} className="flex flex-wrap items-start gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <ContainedTextField
              label="Question"
              placeholder="e.g., What are your hours?"
              value={iceBreaker.question || ""}
              onChange={(e) => {
                const newIceBreakers = [...(typedData.iceBreakers || [])];
                newIceBreakers[index] = {
                  ...newIceBreakers[index],
                  question: e.target.value,
                };
                handleInputChange("iceBreakers", newIceBreakers);
              }}
            />
            <ContainedTextField
              label="Payload (optional)"
              placeholder="Custom data for tracking"
              value={iceBreaker.payload || ""}
              onChange={(e) => {
                const newIceBreakers = [...(typedData.iceBreakers || [])];
                newIceBreakers[index] = {
                  ...newIceBreakers[index],
                  payload: e.target.value,
                };
                handleInputChange("iceBreakers", newIceBreakers);
              }}
            />
          </div>
          <Button
            aria-label="Remove"
            type="button"
            style={{ marginTop: "20px" }}
            variant="ghost"
            size="icon-sm"
            className="text-destructive"
            onClick={() => {
              const newIceBreakers = [...(typedData.iceBreakers || [])];
              newIceBreakers.splice(index, 1);
              handleInputChange("iceBreakers", newIceBreakers);
            }}
          >
            <IconTrash size={16} />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        onClick={() => {
          const newIceBreakers = [...(typedData.iceBreakers || []), { question: "", payload: "" }];
          handleInputChange("iceBreakers", newIceBreakers);
        }}
      >
        <IconPlus size={16} />
        Add Ice Breaker
      </Button>

      <p className="mt-2 text-xs text-muted-foreground">
        Note: Ice breakers are displayed to users when they first open a conversation with your
        Instagram account.
      </p>
    </div>
  );
};
