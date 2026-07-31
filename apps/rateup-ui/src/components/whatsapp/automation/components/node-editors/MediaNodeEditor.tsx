// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import {
  IconDeviceFloppy,
  IconFile,
  IconMusic,
  IconPhoto,
  IconUpload,
  IconVideo,
} from "@tabler/icons-react";
import { EditorContent } from "@tiptap/react";
import { FileWarningIcon, RefreshCwIcon, TypeOutline, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { FileConverter } from "@/components/whatsapp/flow-v2/input/DataSource.tsx";
import { deleteUploadedFiles, getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";

import type { NodeType, NodeTypeMap } from "../../types/node-types.ts";
import { ContainedTextField, FileButton } from "../editor-ui.tsx";
import { FieldMsg, useFieldError } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// MediaNode Component
export const MediaNodeEditor: React.FC<
  NodeComponentProps<
    "documentNode" | "imageNode" | "videoNode" | "audioNode" | "buttonNode" | "ctaUrlNode"
  > & { nodeType: NodeType; disableCaption?: boolean }
> = ({ nodeData, handleInputChange, nodeType, disableCaption = false }) => {
  const typedData = nodeData;
  const captionEditor = useWaEditor({
    content: typedData.caption || "",
    placeholder: "Enter caption...",
    max: 1024,
    onChange: (value) => handleInputChange("caption", value),
  });
  const [media, setMedia] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const { t: translations } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const resetRef = useRef<() => void>(null);
  const filenameError = useFieldError("filename");

  const clearFile = async (skip = false) => {
    if (!skip && (!file || typeof file !== "string")) {
      setFile(null);
      return;
    }
    await deleteUploadedFiles({
      fileKeyArray: [{ Key: skip ? typedData?.link : file }],
    });
    setFile(null);
    if (skip) {
      handleInputChange("link", null); // Clear the link in parent component
    }
    resetRef.current?.();
  };

  // Define file size limits based on media type
  const getFileSizeLimit = () => {
    switch (nodeType) {
      case "imageNode":
        return 5 * 1024 * 1024;
      case "videoNode":
        return 16 * 1024 * 1024;
      case "audioNode":
        return 16 * 1024 * 1024;
      case "documentNode":
        return 100 * 1024 * 1024;
      default:
        return 0.3 * 1024 * 1024;
    }
  };

  const getFileSizeLimitText = () => {
    switch (nodeType) {
      case "imageNode":
        return "5MB";
      case "videoNode":
        return "16MB";
      case "audioNode":
        return "16MB";
      case "documentNode":
        return "100MB";
      default:
        return "300KB";
    }
  };

  const handleFileChange = async (file: File) => {
    try {
      if (!file) return;
      if (file.size > getFileSizeLimit()) {
        toast.error(`size warning: Max file size is ${getFileSizeLimitText()}`, {
          id: "file-size",
        });
        return setMediaError(`size warning: Max ${getFileSizeLimitText()}`);
      }
      setMediaError("");
      const base64String = await FileConverter.fileToBase64(file, true);
      setMedia(base64String);
      setFile(file);
    } catch (error) {
      toast.error(translations("Error converting file to Base64:") + JSON.stringify(error), {
        id: "file-converting",
      });
    }
  };

  const uploadFileData = async () => {
    try {
      if (!file) return;
      setLoading(true);
      clearFile();
      const publicMediaLink = await uploadFile(file);
      setMedia(null);
      handleInputChange("link", publicMediaLink);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast.error(
        typeof error === "string"
          ? error
          : translations("Error uploading file to server:") + JSON.stringify(error),
        {
          id: "upload-file",
        },
      );
    }
  };
  const getAcceptType = () => {
    switch (nodeType) {
      case "imageNode":
        return "image/jpeg,image/png";
      case "videoNode":
        return "video/3gpp,video/mp4";
      case "audioNode":
        return "audio/aac,audio/amr,audio/mpeg,audio/mp4,audio/ogg";
      case "documentNode":
        return "text/plain,application/vnd.ms-excel,.docx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf";
      default:
        return "";
    }
  };

  const MediaIcon =
    nodeType === "imageNode"
      ? IconPhoto
      : nodeType === "videoNode"
        ? IconVideo
        : nodeType === "audioNode"
          ? IconMusic
          : IconFile;
  const isImage = nodeType === "imageNode";
  const previewSrc = media || (typedData?.link ? getFileUrlFromKey(typedData.link) : undefined);
  const hasMedia = !!file || !!typedData?.link;
  const showCard = hasMedia || loading;
  const canPreview = !!previewSrc && !loading && !mediaError;
  const state: "idle" | "uploading" | "error" | "done" = mediaError
    ? "error"
    : loading
      ? "uploading"
      : hasMedia
        ? "done"
        : "idle";

  return (
    <div className="flex flex-col gap-2.5">
      {!showCard ? (
        <FileButton resetRef={resetRef} onChange={handleFileChange} accept={getAcceptType()}>
          {(props) => (
            <button type="button" onClick={props.onClick} className="w-full text-left">
              <Attachment state="idle" className="w-full cursor-pointer">
                <AttachmentMedia>
                  <IconUpload />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>Select a file</AttachmentTitle>
                  <AttachmentDescription>Max size {getFileSizeLimitText()}</AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            </button>
          )}
        </FileButton>
      ) : (
        <Dialog>
          <Attachment state={state} className="w-full">
            <AttachmentMedia variant={isImage ? "image" : "icon"}>
              {loading ? (
                <Spinner />
              ) : mediaError ? (
                <FileWarningIcon />
              ) : isImage && previewSrc ? (
                <img src={previewSrc} alt="Media preview" />
              ) : (
                <MediaIcon />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{file?.name || "Uploaded file"}</AttachmentTitle>
              <AttachmentDescription>
                {loading
                  ? "Uploading…"
                  : mediaError
                    ? "Upload failed"
                    : canPreview
                      ? "Click to preview"
                      : file
                        ? "Not uploaded yet"
                        : `Uploaded · max ${getFileSizeLimitText()}`}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              {!loading && (
                <FileButton
                  resetRef={resetRef}
                  onChange={handleFileChange}
                  accept={getAcceptType()}
                >
                  {(props) => (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <AttachmentAction aria-label="Replace file" onClick={props.onClick}>
                            <RefreshCwIcon />
                          </AttachmentAction>
                        }
                      />
                      <TooltipContent>Replace file</TooltipContent>
                    </Tooltip>
                  )}
                </FileButton>
              )}
              {!loading && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <AttachmentAction
                        aria-label="Remove file"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => clearFile(!!typedData?.link)}
                      >
                        <XIcon />
                      </AttachmentAction>
                    }
                  />
                  <TooltipContent>Remove file</TooltipContent>
                </Tooltip>
              )}
            </AttachmentActions>
            {canPreview && (
              <DialogTrigger render={<AttachmentTrigger aria-label="Preview media" />} />
            )}
          </Attachment>
          {canPreview && (
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="truncate pr-6">{file?.name || "Preview"}</DialogTitle>
              </DialogHeader>
              {isImage ? (
                <img
                  src={previewSrc}
                  alt="Media preview"
                  className="max-h-[70vh] w-full rounded-lg object-contain"
                />
              ) : nodeType === "videoNode" ? (
                <video src={previewSrc} controls className="max-h-[70vh] w-full rounded-lg" />
              ) : nodeType === "audioNode" ? (
                <audio src={previewSrc} controls className="w-full" />
              ) : (
                <iframe
                  src={previewSrc}
                  title="Document preview"
                  className="h-[70vh] w-full rounded-lg border border-border"
                />
              )}
            </DialogContent>
          )}
        </Dialog>
      )}

      <FieldMsg name="link" />

      {mediaError && <p className="text-center text-xs text-destructive">{mediaError}</p>}

      {file && (
        <Button onClick={uploadFileData} disabled={loading}>
          {loading ? <Spinner /> : <IconDeviceFloppy />}
          {loading ? "Uploading..." : "Upload"}
        </Button>
      )}
      {nodeType !== "audioNode" && !disableCaption && (
        <>
          <div className="text-xs font-bold text-muted-foreground">Caption (optional)</div>
          <div className="flex items-start space-x-2 pb-0">
            <div className="flex-1">
              <ToolbarProvider editor={captionEditor!}>
                <TooltipProvider>
                  <EditorContent
                    editor={captionEditor}
                    style={{
                      backgroundColor: "var(--accent)",
                      borderRadius: "5px",
                      maxHeight: "200px",
                      minHeight: "120px",
                    }}
                    className="overflow-y-auto rounded-xl"
                  />
                  <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                    <WaTextCharacterCount editor={captionEditor} max={1024} />
                  </div>
                  <div className="flex flex-wrap p-2">
                    <div className="mt-1 flex items-center">
                      <InsertEmoji editor={captionEditor} />
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
        </>
      )}
      {nodeType === "documentNode" && (
        <ContainedTextField
          mt={"sm"}
          label={"FileName (optional)"}
          value={(typedData as NodeTypeMap["documentNode"]).filename || ""}
          onChange={(e) =>
            (handleInputChange as unknown as (key: "filename", value: string) => void)(
              "filename",
              e.target.value,
            )
          }
          maxLength={1024}
          placeholder="Enter FileName..."
          description={"Supports FileName with maximum 1024 characters."}
          error={filenameError}
        />
      )}
    </div>
  );
};
