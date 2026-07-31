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

import { ContainedTextField } from "../editor-ui.tsx";
import { FieldMsg, styles, useFieldError } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// InputNode Component
export const InputNodeEditor: React.FC<
  NodeComponentProps<
    "textInputNode" | "numberInputNode" | "emailInputNode" | "phoneInputNode" | "dateInputNode"
  >
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;
  const questionEditor = useWaEditor({
    content: typedData.question || "",
    placeholder: "Enter your question text here...",
    max: 4096,
    onChange: (value) => handleInputChange("question", value),
  });
  return (
    <div className={styles.editorSection}>
      <div className="text-xs font-bold text-muted-foreground">
        Question Text <span className="text-red-500">*</span>
      </div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={questionEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={questionEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={questionEditor} max={4096} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={questionEditor} />
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
      <FieldMsg name="question" />

      <ContainedTextField
        label="Save Answer to Variable"
        value={typedData.variableName || ""}
        onChange={(e) => handleInputChange("variableName", e.target.value)}
        placeholder="Variable name (e.g., user_email)"
        error={useFieldError("variableName")}
      />

      {/* <FieldLabel htmlFor="validation">Validation (optional)</FieldLabel>
      <input
        id="validation"
        type="text"
        value={typedData.validation || ""}
        onChange={(e) => handleInputChange("validation", e.target.value)}
        placeholder="Regex pattern or validation rule"
      /> */}
    </div>
  );
};
