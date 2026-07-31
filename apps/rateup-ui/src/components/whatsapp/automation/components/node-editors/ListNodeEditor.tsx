// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { IconX } from "@tabler/icons-react";
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
import type { ListRow, NodeComponentProps } from "./shared.tsx";

// ListNode Component
export const ListNodeEditor: React.FC<NodeComponentProps<"listNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  const bodyEditor = useWaEditor({
    content: typedData.body || "",
    placeholder: "Enter message text...",
    max: 4096,
    onChange: (value) => handleInputChange("body", value),
  });
  const footerEditor = useWaEditor({
    content: typedData.footer || "",
    placeholder: "Enter footer text...",
    max: 60,
    onChange: (value) => handleInputChange("footer", value),
  });
  const getTotalRowCount = (sections: Array<{ rows?: ListRow[] }> = []) => {
    return sections.reduce((count, section) => {
      return count + (section.rows?.length || 0);
    }, 0);
  };
  return (
    <div className="flex flex-col gap-2">
      <ContainedTextField
        onChange={(e) => handleInputChange("header", e?.target?.value)}
        value={typedData.header || ""}
        placeholder="Enter header text..."
        label="Header Text"
        maxLength={60}
      />
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
                <WaTextCharacterCount editor={bodyEditor} max={4096} />
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
        value={typedData.button || ""}
        onChange={(e) => handleInputChange("button", e.target.value)}
        maxLength={20}
        description="Button text shown at the bottom of the list (max 20 characters)"
        error={useFieldError("button")}
      />

      <p className="mt-2 font-medium">Sections</p>
      <p className="text-xs text-muted-foreground">
        Interactive list messages support up to 10 sections, with up to 10 rows across all sections
        combined
      </p>
      <FieldMsg name="sections" />

      {(typedData.sections || []).map((section, sectionIndex: number) => (
        <div
          key={sectionIndex}
          className={`${styles.sectionContainer} my-2 flex flex-col gap-4 p-2`}
        >
          <ContainedTextField
            label={`Section ${sectionIndex + 1} Title`}
            placeholder="Enter section title"
            value={section.title || ""}
            onChange={(e) => {
              const newSections = [...(typedData.sections || [])];
              newSections[sectionIndex] = {
                ...newSections[sectionIndex],
                title: e.target.value,
              };
              handleInputChange("sections", newSections);
            }}
            maxLength={24}
            description="Max 24 characters"
            rightSection={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                onClick={() => {
                  const newSections = [...(typedData.sections || [])];
                  newSections.splice(sectionIndex, 1);
                  handleInputChange("sections", newSections);
                }}
              >
                <IconX size={16} />
              </Button>
            }
          />

          <p className="text-sm font-medium">Rows</p>
          {(section.rows || []).map((row, rowIndex: number) => (
            <div key={rowIndex} className={`${styles.rowContainer} flex flex-col gap-2 p-2`}>
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    const newSections = [...(typedData.sections || [])];
                    newSections[sectionIndex].rows.splice(rowIndex, 1);
                    handleInputChange("sections", newSections);
                  }}
                >
                  <IconX size={14} />
                </Button>
              </div>
              <ContainedTextField
                label="Title"
                placeholder="Enter row title"
                value={row.title || ""}
                onChange={(e) => {
                  const newSections = [...(typedData.sections || [])];
                  newSections[sectionIndex].rows[rowIndex] = {
                    ...newSections[sectionIndex].rows[rowIndex],
                    title: e.target.value,
                  };
                  handleInputChange("sections", newSections);
                }}
                maxLength={24}
                description="Max 24 characters"
              />
              <ContainedTextField
                label="Description (optional)"
                placeholder="Enter row description"
                value={row.description || ""}
                onChange={(e) => {
                  const newSections = [...(typedData.sections || [])];
                  newSections[sectionIndex].rows[rowIndex] = {
                    ...newSections[sectionIndex].rows[rowIndex],
                    description: e.target.value,
                  };
                  handleInputChange("sections", newSections);
                }}
                maxLength={72}
                description="Max 72 characters"
              />
            </div>
          ))}
          <Button
            variant="ghost"
            size="xs"
            disabled={getTotalRowCount(typedData.sections || []) >= 10}
            onClick={() => {
              const newSections = [...(typedData.sections || [])];
              if (!newSections[sectionIndex].rows) {
                newSections[sectionIndex].rows = [];
              }
              newSections[sectionIndex].rows.push({
                id: `row-${Date.now()}`,
                title: "",
                description: "",
              });
              handleInputChange("sections", newSections);
            }}
          >
            + Add Row
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        disabled={(typedData.sections?.length ?? 0) >= 10}
        onClick={() => {
          const newSections = [
            ...(typedData.sections || []),
            // NOTE: seeds `rows`, while the catalog section shape and the editor
            // above both use `productItems` — see the migration notes.
            { title: "", rows: [] as string[] },
          ];
          handleInputChange("sections", newSections);
        }}
        className="mt-2"
      >
        + Add Section
      </Button>
    </div>
  );
};
