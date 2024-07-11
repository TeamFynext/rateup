import React, { useState } from "react";
import FormModalLayout from "../../Modal/FormModalLayout";
import { Blockquote, LoadingOverlay, NavLink, Stack } from "@mantine/core";
import { useCreateMenuItemUsingCsvMutation } from "../../../backend/menu/item/mItem.query";
import { IconDownload, IconInfoCircle } from "@tabler/icons-react";
import { DropZoneArea } from "./dropZone/DropZone";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";

const CategoryItemCsvModal = ({ opened, close, menuId }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const createMenuItemUsingCsv = useCreateMenuItemUsingCsvMutation(
    menuId,
    () => {
      close();
      setCsvFile(null);
    },
  );
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
      title={"Import Menu from CSV file"}
      centered
      onSubmit={handleCsvFileUpload}
      buttonTitle={"Upload Csv"}
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
          Utilizing CSV file uploads to generate menu items requires specific
          fields in the file: &quot;categoryname,&quot; &quot;name,&quot;
          &quot;description,&quot; and &quot;price.&quot;
          <NavLink
            href={getFileUrlFromKey("/File/menu/Demo.csv", false)}
            label="Download Demo Csv File"
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
