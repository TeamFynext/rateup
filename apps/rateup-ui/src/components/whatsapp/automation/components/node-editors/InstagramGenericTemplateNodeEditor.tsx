// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button.tsx";

import { ContainedTextField, Select } from "../editor-ui.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// Instagram Generic Template Node Editor
export const InstagramGenericTemplateNodeEditor: React.FC<
  NodeComponentProps<"instagramGenericTemplateNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Template Elements (Cards)</p>
      <p className="text-xs text-muted-foreground">
        Create cards with images, text, and buttons for Instagram messaging
      </p>

      {(typedData.elements || []).map((element, index: number) => (
        <div
          key={index}
          className="flex flex-col gap-4 p-2"
          style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <p className="text-sm font-medium">Card {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              onClick={() => {
                const newElements = [...(typedData.elements || [])];
                newElements.splice(index, 1);
                handleInputChange("elements", newElements);
              }}
            >
              <IconX size={16} />
            </Button>
          </div>

          <ContainedTextField
            label="Title"
            placeholder="Enter card title"
            required
            value={element.title || ""}
            onChange={(e) => {
              const newElements = [...(typedData.elements || [])];
              newElements[index] = {
                ...newElements[index],
                title: e.target.value,
              };
              handleInputChange("elements", newElements);
            }}
            maxLength={80}
          />

          <ContainedTextField
            label="Subtitle"
            placeholder="Enter subtitle (optional)"
            value={element.subtitle || ""}
            onChange={(e) => {
              const newElements = [...(typedData.elements || [])];
              newElements[index] = {
                ...newElements[index],
                subtitle: e.target.value,
              };
              handleInputChange("elements", newElements);
            }}
            maxLength={80}
          />

          <ContainedTextField
            label="Image URL"
            placeholder="https://..."
            value={element.image_url || ""}
            onChange={(e) => {
              const newElements = [...(typedData.elements || [])];
              newElements[index] = {
                ...newElements[index],
                image_url: e.target.value,
              };
              handleInputChange("elements", newElements);
            }}
          />

          <p className="mt-2 text-xs font-medium">Buttons</p>
          {(element.buttons || []).map((button, btnIndex: number) => (
            <div key={btnIndex} className="flex flex-wrap items-center gap-2">
              <Select
                size="xs"
                value={button.type}
                onChange={(value) => {
                  const newElements = [...(typedData.elements || [])];
                  newElements[index]!.buttons![btnIndex]!.type = value as "web_url" | "postback";
                  handleInputChange("elements", newElements);
                }}
                data={[
                  { value: "web_url", label: "URL" },
                  { value: "postback", label: "Action" },
                ]}
                style={{ width: "100px" }}
              />
              <ContainedTextField
                flex={1}
                placeholder="Button title"
                value={button.title}
                onChange={(e) => {
                  const newElements = [...(typedData.elements || [])];
                  newElements[index]!.buttons![btnIndex]!.title = e.target.value;
                  handleInputChange("elements", newElements);
                }}
                maxLength={20}
              />
              {button.type === "web_url" && (
                <ContainedTextField
                  flex={1}
                  placeholder="URL"
                  value={button.url || ""}
                  onChange={(e) => {
                    const newElements = [...(typedData.elements || [])];
                    newElements[index]!.buttons![btnIndex]!.url = e.target.value;
                    handleInputChange("elements", newElements);
                  }}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  const newElements = [...(typedData.elements || [])];
                  newElements[index]!.buttons!.splice(btnIndex, 1);
                  handleInputChange("elements", newElements);
                }}
              >
                <IconX size={14} />
              </Button>
            </div>
          ))}
          <Button
            size="xs"
            variant="ghost"
            disabled={(element.buttons?.length ?? 0) >= 3}
            onClick={() => {
              const newElements = [...(typedData.elements || [])];
              if (!newElements[index]!.buttons) {
                newElements[index]!.buttons = [];
              }
              newElements[index].buttons.push({
                type: "postback",
                title: "",
                id: crypto.randomUUID(),
              });
              handleInputChange("elements", newElements);
            }}
          >
            + Add Button
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        disabled={typedData.elements?.length >= 10}
        onClick={() => {
          const newElements = [...(typedData.elements || []), { title: "", buttons: [] }];
          handleInputChange("elements", newElements);
        }}
      >
        + Add Card
      </Button>
    </div>
  );
};
