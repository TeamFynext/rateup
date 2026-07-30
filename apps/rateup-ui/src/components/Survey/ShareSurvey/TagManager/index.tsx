import { toBlob } from "html-to-image";
import { Check, ChevronLeft, ChevronRight, Copy, Download, Tags } from "lucide-react";
import { useId, useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useGetShareSettings } from "@/backend/surveyShareSettings/surveyShareSettings.query";
import type { QrLogoPanelState } from "@/components/Survey/ShareSurvey/ShareQR/LogoTabPanel/index.tsx";
import { initialLogoTabPanelState } from "@/components/Survey/ShareSurvey/ShareQR/LogoTabPanel/LogoTabPanelReducer.tsx";
import { downloadBlob } from "@/utils/downloadBlob.ts";

import Heading from "../../../styled/Heading/Heading.tsx";
import { Badge } from "../../../ui/badge.tsx";
import { Button } from "../../../ui/button.tsx";
import { Checkbox } from "../../../ui/checkbox.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../ui/dialog.tsx";
import { Field, FieldLabel } from "../../../ui/field.tsx";
import { Input } from "../../../ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../ui/table.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui/tooltip.tsx";
import Preview from "../Preview/Preview.tsx";

function TagManager({
  isPublished,
  selectTeamDropdownValue,
  teamSelectData,
  onSelectTeamDropdownChange,
  nothingFound,
  tagsToMap,
  surveyTitle,
  surveyId,
  shareUrl,
}: {
  isPublished: boolean;
  selectTeamDropdownValue: string;
  teamSelectData: Array<{ value: string; label: string }>;
  onSelectTeamDropdownChange: (value: string) => void;
  nothingFound: ReactNode;
  tagsToMap: string[];
  surveyTitle: string;
  surveyId: string;
  shareUrl: string;
}) {
  const uid = useId();
  const [isAllQrDownloadProcessing, setIsAllQrDownloadProcessing] = useState(false);
  const [tagManagerOpened, setTagManagerOpened] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const dataGridCompRef = useRef<HTMLDivElement | null>(null);
  const { t: translations } = useTranslation();

  const downloadFiles = useCallback(
    async (domNodeArr: HTMLElement[]) => {
      try {
        const results = [];

        for (const qrDomNode of domNodeArr) {
          const { tagname } = qrDomNode.dataset;
          const fileName = `${surveyTitle}-${tagname}-qr`;

          const blob = await toBlob(qrDomNode, {
            cacheBust: true,
            pixelRatio: 4,
          });

          if (blob) {
            results.push({ blob, fileName });
          }
        }

        results.forEach(({ blob, fileName }) => {
          downloadBlob(blob, fileName);
        });

        return {
          success: true,
          message: translations("successfully downloaded files"),
        };
      } catch (err) {
        console.error("Download failed:", err);

        return {
          success: false,
          message: translations("failed to download files"),
        };
      }
    },
    [surveyTitle],
  );

  const handleDownloadAllQrs = useCallback(async () => {
    const qrPreviewContainerClassName = `.preview-container`;
    const dataGridCompDomNode = dataGridCompRef.current;
    if (dataGridCompDomNode) {
      const allQrsPreviewContainerDomNodes = dataGridCompDomNode.querySelectorAll(
        qrPreviewContainerClassName,
      );
      setIsAllQrDownloadProcessing(true);
      await downloadFiles([...allQrsPreviewContainerDomNodes] as HTMLElement[]);
      setIsAllQrDownloadProcessing(false);
    }
  }, []);

  const shareSettings = useGetShareSettings("surveyShareSettings", "survey", surveyId);

  const settingsData: QrLogoPanelState = shareSettings.data
    ? shareSettings.data
    : {
        ...initialLogoTabPanelState,
        logoSize: 50,
        logoBorderRadius: 50,
      };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const toggleRowSelection = (tag: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === tagsToMap.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(tagsToMap));
    }
  };

  // Pagination
  const totalPages = Math.ceil(tagsToMap.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTags = tagsToMap.slice(startIndex, endIndex);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              disabled={!isPublished}
              onClick={() => setTagManagerOpened(true)}
              variant="outline"
              size="icon"
            />
          }
        >
          <Tags className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{translations("Manage URL Tags")}</p>
        </TooltipContent>
      </Tooltip>
      <Dialog open={tagManagerOpened} onOpenChange={setTagManagerOpened}>
        <DialogContent className="min-w-4xl max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="space-y-4">
            <div className="flex justify-between items-center">
              <Heading subtitle="URL Taggers" />
              <Field className="min-w-38">
                <FieldLabel htmlFor={`${uid}-field`}>{translations("Select Team")}</FieldLabel>
                <Select
                  items={teamSelectData}
                  value={selectTeamDropdownValue ?? ""}
                  onValueChange={(value) => onSelectTeamDropdownChange(value ?? "")}
                  disabled={!isPublished}
                >
                  <SelectTrigger id={`${uid}-field`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teamSelectData.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <DialogTitle>{translations("Manage URL Tags")}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            <Button onClick={handleDownloadAllQrs} disabled={isAllQrDownloadProcessing}>
              {isAllQrDownloadProcessing ? (
                <>Processing...</>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {translations("Download all QRs")}
                </>
              )}
            </Button>

            <div className="border rounded-lg" ref={dataGridCompRef}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRows.size === tagsToMap.length}
                        onCheckedChange={toggleAllRows}
                      />
                    </TableHead>
                    <TableHead className="text-center">Tag</TableHead>
                    <TableHead className="text-center">URL</TableHead>
                    <TableHead className="text-center">QR code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTags.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        {nothingFound}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTags.map((tag) => {
                      const url = `${shareUrl}?tag=${tag}`;
                      return (
                        <TableRow key={tag}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(tag)}
                              onCheckedChange={() => toggleRowSelection(tag)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-base px-4 py-2">
                              {tag}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <Input readOnly value={url} className="flex-1 max-w-md" />
                              <Button
                                variant={copiedUrl === url ? "default" : "outline"}
                                size="icon"
                                onClick={() => handleCopyUrl(url)}
                              >
                                {copiedUrl === url ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-center ">
                            <Preview
                              url={url}
                              isSurveyPublished={isPublished}
                              surveyTitle={surveyTitle}
                              customAttrForDownloadedQrFileName={tag}
                              logoTabPanelState={settingsData}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TagManager;
