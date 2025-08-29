"use client";

import React, { useState } from "react";

import { Blockquote, LoadingOverlay, NavLink, Stack } from "@mantine/core";
import { IconDownload, IconInfoCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useCreateMenuItemUsingCsvMutation } from "../../../backend/menu/item/mItem.query";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import FormModalLayout from "../../Modal/FormModalLayout";
import { DropZoneArea } from "./dropZone/DropZone";

const CategoryItemCsvModal = ({ opened, close, menuId }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const createMenuItemUsingCsv = useCreateMenuItemUsingCsvMutation(
    menuId,
    () => {
      close();
      setCsvFile(null);
    },
  );
  const translations = useTranslations();
  const handleCsvFileUpload = () => {
    const formData = new FormData();
    formData.append("menuId", menuId);
    formData.append("file", csvFile);
    createMenuItemUsingCsv.mutate(formData);
  };
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={translations("Import Menu from CSV file")}
      centered
      onSubmit={handleCsvFileUpload}
      buttonTitle={translations("Upload Csv")}
      submitButtonDisabled={!csvFile}
    >
      <Stack>
        <LoadingOverlay
          visible={createMenuItemUsingCsv.isPending}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ type: "bars" }}
        />
        <Blockquote icon={<IconInfoCircle />} p={"sm"} iconSize={40}>
          {translations(
            "Utilizing CSV file uploads to generate menu items requires specific fields in the file:",
          )}{" "}
          &quot;{translations("categoryname")}&quot;, &quot;
          {translations("name")}&quot;, &quot;{translations("description")}
          &quot;, {translations("and")} &quot;{translations("price")}&quot;.
          <NavLink
            href={getFileUrlFromKey("/File/menu/Demo.csv", false)}
            label={translations("Download Demo Csv File")}
            leftSection={<IconDownload size="1rem" stroke={1.5} />}
            download
            active
            style={{ borderRadius: "4px" }}
            target="_blank"
          />
        </Blockquote>
        <DropZoneArea setCsvFile={setCsvFile} />
      </Stack>
    </FormModalLayout>
  );
};

export default CategoryItemCsvModal;
