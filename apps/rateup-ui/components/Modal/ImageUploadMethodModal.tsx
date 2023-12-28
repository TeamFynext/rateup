import React from "react";
import FormModalLayout from "./FormModalLayout";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { Center, Text } from "@mantine/core";

export const ImageUploadMethodModal = ({
  onClose,
  opened,
  handleUploadMethod,
}) => {
  return (
    <FormModalLayout
      title="Select Upload Method"
      onClose={onClose}
      opened={opened}
      centered
    >
      <Center>
        {["unsplash images", "image upload"].map((data, index) => (
          <PaperLayout
            shadow={"sm"}
            radius={"md"}
            p={"lg"}
            h={"7.5rem"}
            w={"7.5rem"}
            mih={80}
            mx={"lg"}
            hoveractive
            key={data}
            onClick={() => {
              if (index === 0) {
                handleUploadMethod("unsplash");
              } else {
                handleUploadMethod("upload");
              }
              onClose();
            }}
          >
            <Text>{data}</Text>
          </PaperLayout>
        ))}
      </Center>
    </FormModalLayout>
  );
};
