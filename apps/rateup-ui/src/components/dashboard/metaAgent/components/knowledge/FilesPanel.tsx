import { FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { useRef } from "react";

import {
  useDeleteFile,
  useKnowledgeFiles,
  useSyncFiles,
  useUploadFile,
} from "@/backend/metaAgent/metaAgent.query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export function FilesPanel({ waSettingsId }: { waSettingsId: string }) {
  const { data: files, isLoading } = useKnowledgeFiles(waSettingsId);
  const upload = useUploadFile(waSettingsId);
  const deleteFile = useDeleteFile(waSettingsId);
  const sync = useSyncFiles(waSettingsId);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Files ({files?.length ?? 0})</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
          >
            <RefreshCw data-icon="inline-start" className={sync.isPending ? "animate-spin" : ""} />
            Sync
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
          <Button size="sm" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
            <Upload data-icon="inline-start" />
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {!isLoading && !files?.length && (
          <Empty className="border-none py-8">
            <EmptyTitle>No files uploaded</EmptyTitle>
            <EmptyDescription>PDF, DOC, PNG, JPG, CSV, or XLSX up to 100MB.</EmptyDescription>
          </Empty>
        )}
        <div className="divide-y">
          {files?.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{file.fileName}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                disabled={deleteFile.isPending}
                onClick={() => deleteFile.mutate(file.id)}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
