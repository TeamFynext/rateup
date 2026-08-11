import { IconFileText, IconTrash, IconUpload } from "@tabler/icons-react";
import { useRef } from "react";
import { toast } from "sonner";

import { KNOWLEDGE_FILE_ACCEPT, KNOWLEDGE_FILE_MAX_BYTES } from "@/backend/metaAgent/metaAgent.api";
import {
  useDeleteFile,
  useKnowledgeFiles,
  useSyncFiles,
  useUploadFile,
} from "@/backend/metaAgent/metaAgent.query";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

import { PanelCard } from "../shared/PanelCard";

const ALLOWED = KNOWLEDGE_FILE_ACCEPT.split(",");

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesPanel({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data: files, isLoading } = useKnowledgeFiles(waSettingsId);
  const upload = useUploadFile(waSettingsId);
  const deleteFile = useDeleteFile(waSettingsId);
  const sync = useSyncFiles(waSettingsId);
  const inputRef = useRef<HTMLInputElement>(null);

  // Meta rejects an oversized or unsupported upload after the whole body has
  // been sent; checking here fails in a millisecond instead of a minute.
  const handleFile = (file: File) => {
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED.includes(extension)) {
      toast.error(
        `${extension || "That file type"} is not supported. Allowed: ${ALLOWED.join(", ")}`,
      );
      return;
    }
    if (file.size > KNOWLEDGE_FILE_MAX_BYTES) {
      toast.error(`${formatBytes(file.size)} is over Meta's 100MB limit`);
      return;
    }
    upload.mutate(file);
  };

  return (
    <PanelCard
      title="Files"
      description={`Documents Meta indexes for the agent. ${ALLOWED.join(", ")} — up to 100MB each.`}
      count={files?.length ?? 0}
      onSync={() => sync.mutate()}
      isSyncing={sync.isPending}
      actions={
        <>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={KNOWLEDGE_FILE_ACCEPT}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <Button size="sm" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
            {upload.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <IconUpload data-icon="inline-start" />
            )}
            Upload
          </Button>
        </>
      }
    >
      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!isLoading && !files?.length && (
        <Empty className="border-none py-8">
          <EmptyTitle>No files uploaded</EmptyTitle>
          <EmptyDescription>
            Upload a price list, catalogue or policy document and the agent can answer from it.
          </EmptyDescription>
        </Empty>
      )}

      <div className="divide-y">
        {files?.map((file) => (
          <div key={file.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <IconFileText className="shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{file.fileName}</span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label={`Delete ${file.fileName}`}
              disabled={deleteFile.isPending}
              onClick={() => deleteFile.mutate(file.id)}
            >
              <IconTrash className="text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
