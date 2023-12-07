import React, { useState } from "react";
import FormModalLayout from "../../Modal/FormModalLayout";
import { Blockquote, LoadingOverlay, Stack } from "@mantine/core";
import { ContainedFileInput } from "../../input/ContainedInput/ContainedInput";
import { useCreateMenuItemUsingCsvMutation } from "../../../backend/menu/item/mItem.query";
import { IconInfoCircle } from "@tabler/icons-react";

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
    formData.append("", csvFile);
    formData.append("menuId", menuId);
    createMenuItemUsingCsv.mutate(formData);
  };
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={"Upload Csv"}
      centered
      onSubmit={handleCsvFileUpload}
      buttonTitle={"Upload Csv"}
    >
      <Stack>
        <LoadingOverlay
          visible={createMenuItemUsingCsv.isPending}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ type: "bars" }}
        />
        <Blockquote
          color="blue"
          icon={<IconInfoCircle />}
          p={"sm"}
          iconSize={40}
        >
          Utilizing CSV file uploads to generate menu items requires specific
          fields in the file: "categoryname," "name," "description," and
          "price."
        </Blockquote>

        <ContainedFileInput
          mx={"md"}
          label=""
          placeholder="Upload a csv file (.csv)"
          accept=".csv"
          multiple={false}
          onChange={(e) => setCsvFile(e)}
          styles={{
            input: {
              border: "2px dashed lightgrey",
            },
          }}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default CategoryItemCsvModal;
