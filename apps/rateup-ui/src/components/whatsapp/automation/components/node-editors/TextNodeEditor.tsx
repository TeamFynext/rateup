// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { IconTypography } from "@tabler/icons-react";
import { EditorContent } from "@tiptap/react";

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

import { Switch } from "../editor-ui.tsx";
import { FieldMsg, styles } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// TextNode Component
export const TextNodeEditor: React.FC<NodeComponentProps<"textNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  const bodyEditor = useWaEditor({
    content: typedData.body || "",
    placeholder: "Enter your message text here...",
    max: 4096,
    onChange: (value) => handleInputChange("body", value),
  });
  return (
    <div className={styles.editorSection}>
      <div className="text-xs font-bold text-muted-foreground">
        Message Text <span className="text-destructive">*</span>
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
                <WaTextCharacterCount editor={bodyEditor} max={4096} />
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
      <Switch
        label="Enable link preview"
        checked={typedData.previewUrl || true}
        onChange={(e) => handleInputChange("previewUrl", e.target.checked)}
        description={"Enable link preview to show URL previews in WhatsApp."}
      />
    </div>
  );
};
