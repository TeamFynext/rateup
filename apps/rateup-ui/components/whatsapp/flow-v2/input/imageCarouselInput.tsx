import React, { useEffect, useRef } from "react";

import { Button, Card, Flex, SimpleGrid } from "@mantine/core";
import { useForm } from "@mantine/form";

import { RateupFileUploadButton } from "@/components/Button/RateupButtons";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import { showErrorToast } from "@/utils/notifications";

import { FileConverter } from "./DataSource";

const MIN_IMAGES = 1;

const ImageCarouselInput = (props) => {
  const MAX_IMAGES = props.maxImages || 3;
  const resetRefs = useRef<Array<() => void>>([]);
  const form = useForm({
    initialValues: {
      images: [{ src: "", "alt-text": "" }],
    },
  });

  useEffect(() => {
    if (props.value?.length > 0) {
      form.setFieldValue(
        "images",
        props.value || [{ src: "", "alt-text": "" }],
      );
    }
  }, [props.value]);

  const handleFileChange = async (file: File, idx: number) => {
    try {
      if (!file) return;
      if (file.size > 400000) {
        showErrorToast("Max image size is 400KB");
        return form.setFieldError(
          `images.${idx}.src`,
          "max image size is 400KB",
        );
      }
      form.clearFieldError(`images.${idx}.src`);
      const base64String = await FileConverter.fileToBase64(file);
      form.setFieldValue(`images.${idx}.src`, base64String);
      triggerOnChange();
    } catch (error) {
      showErrorToast(
        "Error converting file to Base64:" + JSON.stringify(error),
        "file-converting",
      );
    }
  };

  const handleAltTextChange = (value: string, idx: number) => {
    form.setFieldValue(`images.${idx}.alt-text`, value);
    triggerOnChange();
  };

  const clearFile = (idx: number, altText: string) => {
    form.replaceListItem("images", idx, { src: "", "alt-text": altText });
    resetRefs.current[idx]?.();
    triggerOnChange();
  };

  const addImage = () => {
    if (form.values.images.length < MAX_IMAGES) {
      form.insertListItem("images", { src: "", "alt-text": "" });
      triggerOnChange();
    }
  };

  const removeImage = (idx: number) => {
    if (form.values.images.length > MIN_IMAGES) {
      form.removeListItem("images", idx);
      resetRefs?.current?.[idx]?.();
      triggerOnChange();
    }
  };

  const triggerOnChange = () => {
    props.onChange(form.getValues()?.images);
  };

  return (
    <Flex direction="column" gap="md">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {form.values?.images.map((img, idx) => (
          <Card key={idx} p="md" withBorder radius={"md"}>
            <RateupFileUploadButton
              clearFile={() => clearFile(idx, img?.["alt-text"])}
              handleFileChange={(file) => handleFileChange(file, idx)}
              resetRef={{ current: resetRefs.current[idx] }}
              fileSrc={img.src}
              error={props.errors?.[`images.${idx}.src`] as string}
              size="md"
              accept="image/png,image/jpeg"
              style={{ width: "100%" }}
            />
            <ContainedTextField
              label="Alt Text"
              placeholder="Describe this image"
              value={img["alt-text"]}
              onChange={(e) => handleAltTextChange(e.target.value, idx)}
              error={props.errors?.[`images.${idx}.alt-text`] as string}
              required
              style={{ width: "100%" }}
            />
            {form.values.images.length > MIN_IMAGES && (
              <Button
                color="red"
                onClick={() => removeImage(idx)}
                variant="light"
                size="sm"
                mt={"xs"}
                leftSection={<span>x</span>}
              >
                Remove Image
              </Button>
            )}
          </Card>
        ))}
      </SimpleGrid>

      {form.values.images.length < MAX_IMAGES && (
        <Button
          onClick={addImage}
          variant="light"
          style={{ alignSelf: "flex-start", marginTop: "10px" }}
        >
          + Add Image ({form.values.images.length}/{MAX_IMAGES})
        </Button>
      )}
    </Flex>
  );
};

export default ImageCarouselInput;
