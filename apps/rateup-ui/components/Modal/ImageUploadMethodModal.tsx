import React from "react";
import FormModalLayout from "./FormModalLayout";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { Center, Group, Text } from "@mantine/core";
import { IconPhotoSearch, IconUpload } from "@tabler/icons-react";

interface ImageUploadMethodModalProps {
  onClose: () => void;
  opened: boolean;
  handleUploadMethod: (method: string) => void;
}
export const ImageUploadMethodModal = ({
  onClose,
  opened,
  handleUploadMethod,
}: ImageUploadMethodModalProps) => {
  const handleMethodSelect = (index: number) => {
    if (index === 1) {
      handleUploadMethod("unsplash");
    } else {
      handleUploadMethod("upload");
    }
    onClose();
  };
  return (
    <FormModalLayout
      title="Select Upload Method"
      onClose={onClose}
      opened={opened}
      centered
      size="auto"
    >
      <Center>
        {["Upload from Device", "Select from Unsplash"].map((data, index) => (
          <PaperLayout
            shadow={"sm"}
            radius={"md"}
            p={"lg"}
            h={"6.5rem"}
            mih={80}
            mx={"lg"}
            w={"fit-content"}
            hoveractive
            key={data}
            onClick={() => handleMethodSelect(index)}
          >
            <Group my={"md"}>
              <Text>{data}</Text>
              {index === 1 ? <IconPhotoSearch /> : <IconUpload />}
            </Group>
          </PaperLayout>
        ))}
      </Center>
    </FormModalLayout>
  );
};
