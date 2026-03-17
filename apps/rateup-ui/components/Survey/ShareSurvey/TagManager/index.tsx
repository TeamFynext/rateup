"use client";

import { useCallback, useRef, useState } from "react";

import domtoimage from "dom-to-image-more";
import { saveAs } from "file-saver";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Tags,
} from "lucide-react";
import { useExtracted } from "next-intl";

import { useGetShareSettings } from "../../../../backend/surveyShareSettings/surveyShareSettings.query";
import { ContainedSelection } from "../../../input/ContainedInput/ContainedInput";
import Heading from "../../../styled/Heading/Heading";
import { Badge } from "../../../ui/badge";
import { Button } from "../../../ui/button";
import { Checkbox } from "../../../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog";
import { Input } from "../../../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui/tooltip";
import Preview from "../Preview/Preview";

function TagManager({
  isPublished,
  selectTeamDropdownValue,
  teamSelectData,
  onSelectTeamDropdownChange,
  nothingFound,
  getSelectedRowsToExport,
  tagsToMap,
  surveyTitle,
  surveyId,
  shareUrl,
}) {
  const [isAllQrDownloadProcessing, setIsAllQrDownloadProcessing] =
    useState(false);
  const [tagManagerOpened, setTagManagerOpened] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const dataGridCompRef = useRef(null);
  const translations = useExtracted();

  const downloadFiles = useCallback(
    async (domNodeArr) => {
      const promises = [];
      domNodeArr.forEach(async (qrDomNode) => {
        const { tagname } = qrDomNode.dataset;
        const fileName = `${surveyTitle}-${tagname}-qr`;
        const scale = 6;
        const promise = domtoimage.toBlob(qrDomNode, {
          width: qrDomNode?.clientWidth * scale,
          height: qrDomNode?.clientHeight * scale,
          style: {
            transform: "scale(" + scale + ")",
            transformOrigin: "top left",
          },
        });
        const blobFileNamePromise = promise.then((blob) => {
          return {
            blob,
            fileName,
          };
        });
        promises.push(blobFileNamePromise);
      });
      try {
        const fileBlobAndFileNameObjsArr = await Promise.all(promises);
        fileBlobAndFileNameObjsArr.forEach((blobAndFileNameObj) => {
          const { blob, fileName } = blobAndFileNameObj;
          saveAs(blob, fileName);
        });
      } catch (err) {
        console.log("download files failed.");
        return {
          success: false,
          message: translations("failed to download files"),
        };
      }
      return {
        success: true,
        message: translations("successfully downloaded files"),
      };
    },
    [surveyTitle],
  );

  const handleDownloadAllQrs = useCallback(async () => {
    const qrPreviewContainerClassName = `.preview-container`;
    const dataGridCompDomNode = dataGridCompRef.current;
    if (dataGridCompDomNode) {
      const allQrsPreviewContainerDomNodes =
        dataGridCompDomNode.querySelectorAll(qrPreviewContainerClassName);
      setIsAllQrDownloadProcessing(true);
      const { success, message } = await downloadFiles(
        allQrsPreviewContainerDomNodes,
      );
      setIsAllQrDownloadProcessing(false);
    }
  }, []);

  const shareSettings = useGetShareSettings(
    "surveyShareSettings",
    "survey",
    surveyId,
  );

  const settingsData = shareSettings.data
    ? shareSettings.data
    : {
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
        <TooltipTrigger asChild>
          <Button
            disabled={!isPublished}
            onClick={() => setTagManagerOpened(true)}
            variant="outline"
            size="icon"
          >
            <Tags className="h-4 w-4" />
          </Button>
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
              <ContainedSelection
                disabled={!isPublished}
                label={translations("Select Team")}
                allowDeselect={false}
                miw={150}
                value={selectTeamDropdownValue}
                data={teamSelectData}
                onChange={onSelectTeamDropdownChange}
              />
            </div>
            <DialogTitle>{translations("Manage URL Tags")}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            <Button
              onClick={handleDownloadAllQrs}
              disabled={isAllQrDownloadProcessing}
            >
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
                            <Badge
                              variant="secondary"
                              className="text-base px-4 py-2"
                            >
                              {tag}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <Input
                                readOnly
                                value={url}
                                className="flex-1 max-w-md"
                              />
                              <Button
                                variant={
                                  copiedUrl === url ? "default" : "outline"
                                }
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
                <span className="text-sm text-muted-foreground">
                  Rows per page:
                </span>
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
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
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
