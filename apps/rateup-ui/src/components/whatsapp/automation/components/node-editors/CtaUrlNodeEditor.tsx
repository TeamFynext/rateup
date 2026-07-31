// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { EditorContent } from "@tiptap/react";
import { TypeOutline } from "lucide-react";

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
import { FieldMsg, useFieldError } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// CtaUrlNode Component
export const CtaUrlNodeEditor: React.FC<NodeComponentProps<"ctaUrlNode">> = ({
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

      <div className="text-xs font-bold text-muted-foreground">
        Body Text <span className="text-red-500">*</span>
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
                      <TypeOutline className="h-5 w-5" />
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

      <div className="text-xs font-bold text-muted-foreground">Footer (optional)</div>
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
                      <TypeOutline className="h-5 w-5" />
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

      <ContainedTextField
        label="Button Text"
        placeholder="Enter button text"
        required
        value={typedData?.display_text || ""}
        onChange={(e) => {
          handleInputChange("display_text", e.target.value);
        }}
        maxLength={20}
        description="Button text shown (max 20 characters)"
        error={useFieldError("display_text")}
      />

      <ContainedTextField
        label="URL"
        placeholder="Enter the URL"
        required
        value={typedData?.url || ""}
        type="url"
        onChange={(e) => {
          handleInputChange("url", e.target.value);
        }}
        description="The URL that will open when the button is clicked"
        error={useFieldError("url")}
      />
    </div>
  );
};
