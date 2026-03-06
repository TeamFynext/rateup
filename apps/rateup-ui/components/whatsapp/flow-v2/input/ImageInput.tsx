"use client";

import React, { useRef } from "react";

import { useForm } from "@mantine/form";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { toast } from "sonner";
import { z } from "zod/v4";

import { RateupFileUploadButton } from "@/components/Button/RateupButtons";

import { FileConverter } from "./DataSource";

const ImageInput = (props) => {
  const resetRef = useRef(null);
  const choiceSchema = z.object({
    image: z.string().optional().nullable(),
  });

  const choiceForm = useForm<z.infer<typeof choiceSchema>>({
    initialValues: {
      image: "",
    },
    validate: zod4Resolver(choiceSchema),
  });
  const clearFile = () => {
    choiceForm.setFieldValue("image", null);
    resetRef.current?.();
    props.onChange("");
  };
  const handleFileChange = async (file: File) => {
    try {
      if (!file) return;
      if (file.size > 300000)
        return choiceForm.setFieldError("image", "max image size is 300KB");
      choiceForm.clearFieldError("image");
      const base64String = await FileConverter.fileToBase64(file);
      choiceForm.setFieldValue("image", base64String);
      props.onChange(base64String);
    } catch (error) {
      toast.error("Error converting file to Base64:" + JSON.stringify(error), {
        id: "file-converting",
      });
    }
  };
  return (
    <RateupFileUploadButton
      clearFile={clearFile}
      handleFileChange={handleFileChange}
      resetRef={resetRef}
      fileSrc={props.value}
      error={choiceForm.errors.image as string}
      style={{ marginTop: "25px" }}
      size="md"
      accept="image/png,image/jpeg"
    />
  );
};

export default ImageInput;
