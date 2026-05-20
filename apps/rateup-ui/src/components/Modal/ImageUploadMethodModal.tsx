"use client";

import React from "react";

import { Center, Group, Image, Text } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";
import PaperLayout from "../styled/Layouts/PaperLayout.tsx";
import FormModalLayout from "./FormModalLayout.tsx";

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
  const { t: translations } = useTranslation();
  return (
    <FormModalLayout
      title={translations("Select Upload Method")}
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
              {index === 1 ? (
                <Image
                  src={getFileUrlFromKey("/images/menu/unsplash.png", false)}
                  w={18}
                  h={18}
                  alt="banner demo gif"
                />
              ) : (
                <IconUpload />
              )}
            </Group>
          </PaperLayout>
        ))}
      </Center>
    </FormModalLayout>
  );
};
