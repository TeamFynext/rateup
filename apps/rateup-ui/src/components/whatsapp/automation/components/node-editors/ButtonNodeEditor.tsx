// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { IconTypography, IconX } from "@tabler/icons-react";
import { EditorContent } from "@tiptap/react";
import { useRef } from "react";

import InsertEmoji from "@/components/RichTextEditor/InsertEmoji/index.tsx";
import { WaTextCharacterCount } from "@/components/RichTextEditor/wa-editor/character-count.tsx";
import { useWaEditor } from "@/components/RichTextEditor/wa-editor/use-wa-editor.ts";
import { BlockquoteToolbar } from "@/components/tiptap/toolbars/blockquote.tsx";
import { BoldToolbar } from "@/components/tiptap/toolbars/bold.tsx";
import { BulletListToolbar } from "@/components/tiptap/toolbars/bullet-list.tsx";
import { CodeToolbar } from "@/components/tiptap/toolbars/code.tsx";
import { ItalicToolbar } from "@/components/tiptap/toolbars/italic.tsx";
import { OrderedListToolbar } from "@/components/tiptap/toolbars/ordered-list.tsx";
import { RedoToolbar } from "@/components/tiptap/toolbars/redo.tsx";
import { StrikeThroughToolbar } from "@/components/tiptap/toolbars/strikethrough.tsx";
import { ToolbarProvider } from "@/components/tiptap/toolbars/toolbar-provider.tsx";
import { UndoToolbar } from "@/components/tiptap/toolbars/undo.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";

import { ContainedSelection, ContainedTextField } from "../editor-ui.tsx";
import { MediaNodeEditor } from "./MediaNodeEditor.tsx";
import { FieldMsg, styles, useFieldError } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// ButtonNode Component
export const ButtonNodeEditor: React.FC<NodeComponentProps<"buttonNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  const bodyEditor = useWaEditor({
    content: typedData.body || "",
    placeholder: "Enter message text...",
    max: 1024,
    onChange: (value) => handleInputChange("body", value),
  });
  const footerEditor = useWaEditor({
    content: typedData.footer || "",
    placeholder: "Enter footer text...",
    max: 60,
    onChange: (value) => handleInputChange("footer", value),
  });
  const newButtonRef = useRef<HTMLInputElement | null>(null);
  const headerError = useFieldError("header");

  const getType = () => {
    switch (typedData.headerType) {
      case "text":
        return "textNode";
      case "image":
        return "imageNode";
      case "video":
        return "videoNode";
      case "document":
        return "documentNode";
      default:
        return "textNode";
    }
  };

  const addNewButton = () => {
    if (typedData.buttons?.length >= 3) return;
    const newButtons = [...(typedData.buttons || []), { id: `button-${Date.now()}`, title: "" }];
    handleInputChange("buttons", newButtons);

    // Focus will be set after render via useEffect
    setTimeout(() => {
      if (newButtonRef.current) {
        newButtonRef.current.focus();
      }
    }, 0);
  };

  return (
    <div className="flex flex-col gap-2">
      <ContainedSelection
        label="Header Type"
        placeholder="Select header type"
        data={[
          { value: "text", label: "Text" },
          { value: "image", label: "Image" },
          { value: "video", label: "Video" },
          { value: "document", label: "Document" },
        ]}
        value={typedData.headerType}
        onChange={(value) => {
          handleInputChange("headerType", value);
        }}
        description="Type of header content to display"
      />

      {typedData.headerType === "text" ? (
        <ContainedTextField
          onChange={(e) => handleInputChange("header", e.target.value)}
          value={typedData.header || ""}
          placeholder="Enter header text..."
          label="Header Text"
          maxLength={60}
          error={headerError}
        />
      ) : (
        typedData.headerType && (
          <MediaNodeEditor
            handleInputChange={handleInputChange}
            nodeData={typedData}
            nodeType={getType()}
            disableCaption={true}
          />
        )
      )}

      {/* Body - Required */}
      <div className="text-xs font-bold text-muted-foreground">
        Body Text (Required) <span className="text-red-500">*</span>
      </div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={bodyEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={bodyEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={bodyEditor} max={1024} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={bodyEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <IconTypography className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>
      <FieldMsg name="body" />

      <div className="text-xs font-bold text-muted-foreground">Footer Text</div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={footerEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={footerEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={footerEditor} max={60} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={footerEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <IconTypography className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>

      {/* Buttons - At least one required */}
      <p className="mt-2 text-sm">Buttons (At least one required)</p>
      <FieldMsg name="buttons" />

      {(typedData.buttons || []).map((button, index: number) => (
        <div key={index} className={styles.optionRow}>
          <ContainedTextField
            flex={1}
            type="text"
            value={typeof button === "object" ? button.title || "" : button}
            onChange={(e) => {
              const newButtons = [...(typedData.buttons || [])];
              if (typeof button === "object") {
                newButtons[index] = {
                  ...newButtons[index],
                  title: e.target.value,
                };
              } else {
                newButtons[index] = {
                  id: `button-${Date.now()}`,
                  title: e.target.value,
                };
              }
              handleInputChange("buttons", newButtons);
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                index === typedData.buttons.length - 1 &&
                typedData.buttons.length < 3
              ) {
                e.preventDefault();
                addNewButton();
              }
            }}
            placeholder={`Button ${index + 1} title`}
            maxLength={20}
            description="Max 20 characters"
            rightSection={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  const newButtons = [...(typedData.buttons || [])];
                  newButtons.splice(index, 1);
                  handleInputChange("buttons", newButtons);
                }}
              >
                <IconX size={16} />
              </Button>
            }
            ref={index === typedData.buttons?.length - 1 ? newButtonRef : null}
          />
        </div>
      ))}
      <Button disabled={typedData.buttons?.length >= 3} onClick={addNewButton}>
        + Add Button
      </Button>
    </div>
  );
};
