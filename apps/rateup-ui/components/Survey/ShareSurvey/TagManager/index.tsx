"use client";

import { useCallback, useRef, useState } from "react";

import {
  ActionIcon,
  Badge,
  Button,
  CopyButton,
  Group,
  Stack,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconTags,
} from "@tabler/icons-react";
import { DataGrid } from "@mui/x-data-grid";
import domtoimage from "dom-to-image-more";
import { saveAs } from "file-saver";
import { useTranslations } from "next-intl";

import { useGetShareSettings } from "../../../../backend/surveyShareSettings/surveyShareSettings.query";
import {
  ContainedSelection,
  ContainedTextField,
} from "../../../input/ContainedInput/ContainedInput";
import FormModalLayout from "../../../Modal/FormModalLayout";
import Heading from "../../../styled/Heading/Heading";
import Preview from "../Preview/Preview";
import previewStyles from "../Preview/Preview.module.css";
import CustomGridToolbar from "./CustomGridToolbar/CustomGridToolbar";
import styles from "./TagManager.module.css";

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
  const dataGridCompRef = useRef(null);
  const translations = useTranslations();
  const [tagManagerOpened, { open: openTagManager, close: closeTagManager }] =
    useDisclosure(false);

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
    const qrPreviewContainerClassName = `.${previewStyles["preview-container"]}`;
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

  const settingsData = shareSettings.data ? shareSettings.data : {};

  return (
    <>
      <Tooltip label={translations("Manage URL Tags")} position="right-start">
        <ActionIcon
          disabled={!isPublished}
          onClick={openTagManager}
          variant="outline"
        >
          <IconTags />
        </ActionIcon>
      </Tooltip>

      <FormModalLayout
        centered
        size="xl"
        onClose={closeTagManager}
        opened={tagManagerOpened}
        title={translations("Manage URL Tags")}
        customHeader={
          <Group justify="space-between" px={"lg"}>
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
          </Group>
        }
      >
        <Stack h={500}>
          <Button
            className={styles["download-all-qrs-btn"]}
            onClick={handleDownloadAllQrs}
            rightSection={<IconDownload size={14} />}
            loading={isAllQrDownloadProcessing}
          >
            {translations("Download all QRs")}
          </Button>

          <DataGrid
            ref={dataGridCompRef}
            rowHeight={200}
            initialState={{
              pagination: { paginationModel: { pageSize: 5 } },
            }}
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10, 20]}
            slots={{
              toolbar: CustomGridToolbar,
              noRowsOverlay: nothingFound,
            }}
            slotProps={{
              toolbar: {
                printOptions: {
                  getRowsToExport: getSelectedRowsToExport,
                },
              },
            }}
            density="comfortable"
            showCellVerticalBorder
            showColumnVerticalBorder
            disableDensitySelector
            checkboxSelection
            columns={[
              {
                field: "col1",
                align: "center",
                headerName: "Tag",
                flex: 1,
                renderCell: (params) => (
                  <Badge size="xl" variant="light">
                    {params.value}
                  </Badge>
                ),
              },
              {
                field: "col2",
                flex: 1,
                align: "center",
                headerName: "URL",
                renderCell: (params) => (
                  <Group gap={1}>
                    <ContainedTextField
                      style={{ flex: 1 }}
                      readOnly
                      value={params.value}
                    />
                    <CopyButton value={params.value}>
                      {({ copied, copy }) => (
                        <ActionIcon
                          variant={copied ? "filled" : "outline"}
                          size={"sm"}
                          onClick={copy}
                        >
                          {copied ? <IconCheck /> : <IconCopy />}
                        </ActionIcon>
                      )}
                    </CopyButton>
                  </Group>
                ),
                minWidth: 200,
              },
              {
                disableExport: true,
                field: "col3",
                flex: 1,
                align: "center",
                headerName: "QR code",
                minWidth: 200,
                renderCell: (params) => (
                  <Group gap={1} className={styles["qr-code-container"]}>
                    <Preview
                      url={params.row?.col3}
                      isSurveyPublished={isPublished}
                      surveyTitle={surveyTitle}
                      customAttrForDownloadedQrFileName={params.row.col1}
                      logoTabPanelState={shareSettings}
                    />
                  </Group>
                ),
              },
            ]}
            rows={tagsToMap.map((tag) => ({
              id: tag,
              col1: tag,
              col2: `${shareUrl}?tag=${tag}`,
              col3: `${shareUrl}?tag=${tag}`,
            }))}
          />
        </Stack>
      </FormModalLayout>
    </>
  );
}

export default TagManager;
