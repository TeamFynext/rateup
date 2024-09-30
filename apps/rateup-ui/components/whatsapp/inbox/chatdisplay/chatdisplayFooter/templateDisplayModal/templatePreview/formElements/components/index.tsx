import { useState } from "react";

import { Badge, Divider, Group, Paper, rem, Text } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, PDF_MIME_TYPE } from "@mantine/dropzone";
import { useForm } from "@mantine/form";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";

import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import useTranslations from "@/dictionaries/useTranslation";

import classes from "./styles.module.css";

interface Props {
  type: "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | "TEXT";
  buildtemplatequerycomponent: (
    component_type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS",
    component_format: "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | "TEXT",
    component_data: any,
  ) => void;
  exampleParams?: string[];
}
export default function WaTemplateFormComponents(props: Props) {
  switch (props?.type) {
    case "IMAGE":
    case "VIDEO":
    case "DOCUMENT":
      return (
        <Paper className={classes.paper_wrapper}>
          <Badge variant="light">{props?.type}</Badge>
          <Divider variant="dotted" />
          <WaDropZoneInputComponent
            type={props?.type}
            buildtemplatequerycomponent={props?.buildtemplatequerycomponent}
          />
        </Paper>
      );
    case "LOCATION":
      return (
        <Paper className={classes.paper_wrapper}>
          <Badge variant="light">{props?.type}</Badge>
          <Divider variant="dotted" />
          <WaLocationInputComponent
            buildtemplatequerycomponent={props?.buildtemplatequerycomponent}
          />
        </Paper>
      );
    case "TEXT":
      return (
        <Paper className={classes.paper_wrapper}>
          <Badge variant="light">{props?.type}</Badge>
          <Divider variant="dotted" />
          <WaBodyVariableInputComponent
            buildtemplatequerycomponent={props?.buildtemplatequerycomponent}
            exampleParams={props.exampleParams}
          />
        </Paper>
      );
  }
}

function WaDropZoneInputComponent(props: Props) {
  function getDropZoneMimeType() {
    if (props?.type === "IMAGE") {
      return IMAGE_MIME_TYPE;
    } else if (props?.type === "DOCUMENT") {
      return PDF_MIME_TYPE;
    }
  }
  const { translations } = useTranslations();
  return (
    <Dropzone
      maxFiles={1}
      onDrop={(files) =>
        props?.buildtemplatequerycomponent("HEADER", props?.type, {
          link: files[0],
        })
      }
      onReject={(files) => console.log("rejected files", files)}
      maxSize={5 * 1024 ** 2}
      accept={getDropZoneMimeType()}
      {...props}
    >
      <Group
        justify="center"
        gap="xl"
        mih={100}
        style={{ pointerEvents: "none" }}
      >
        <Dropzone.Accept>
          <IconUpload
            size={30}
            color={"var(--mantine-primary-color-6)"}
            stroke={1.5}
          />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX size={30} color="var(--mantine-color-red-6)" stroke={1.5} />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconPhoto
            size={30}
            color="var(--mantine-color-dimmed)"
            stroke={1.5}
          />
        </Dropzone.Idle>
        <div>
          <Text className={classes.dropzone_text}>
            {translations["Drag"]} {props?.type}{" "}
            {translations["here or click to select files"]}
          </Text>
          <Text className={classes.dropzone_text_note}>
            {
              translations[
                "Attach as many files as you like, each file should not exceed 5mb"
              ]
            }
          </Text>
        </div>
      </Group>
    </Dropzone>
  );
}

function WaLocationInputComponent({
  buildtemplatequerycomponent,
}: {
  buildtemplatequerycomponent: (
    component_type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS",
    component_format: "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION",
    component_data: any,
  ) => void;
}) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const { translations } = useTranslations();
  return (
    <>
      <ContainedTextField
        label={translations["Latitude"]}
        value={latitude}
        onChange={(e) => {
          setLatitude(e.currentTarget.value);
          buildtemplatequerycomponent("HEADER", "LOCATION", {
            latitude: e.currentTarget.value,
            longitude,
            name,
            address,
          });
        }}
      />
      <ContainedTextField
        label={translations["Longitude"]}
        value={longitude}
        onChange={(e) => {
          setLongitude(e.currentTarget.value);
          buildtemplatequerycomponent("HEADER", "LOCATION", {
            latitude,
            longitude: e.currentTarget.value,
            name,
            address,
          });
        }}
      />
      <ContainedTextField
        label={translations["Name"]}
        value={name}
        onChange={(e) => {
          setName(e.currentTarget.value);
          buildtemplatequerycomponent("HEADER", "LOCATION", {
            latitude,
            longitude,
            name: e.currentTarget.value,
            address,
          });
        }}
      />
      <ContainedTextField
        label={translations["Address"]}
        value={address}
        onChange={(e) => {
          setAddress(e.currentTarget.value);
          buildtemplatequerycomponent("HEADER", "LOCATION", {
            latitude,
            longitude,
            name,
            address: e.currentTarget.value,
          });
        }}
      />
    </>
  );
}

function WaBodyVariableInputComponent({
  buildtemplatequerycomponent,
  exampleParams,
}: {
  buildtemplatequerycomponent: (
    component_type: "BODY",
    component_format: "TEXT",
    component_data: any,
  ) => void;
  exampleParams?: string[];
}) {
  const form = useForm({
    initialValues: {
      dynamicTags: exampleParams || [],
    },
    onValuesChange: (e) => {
      buildtemplatequerycomponent("BODY", "TEXT", e.dynamicTags);
    },
  });
  const { translations } = useTranslations();
  return (
    <>
      {exampleParams?.map((_, i) => (
        <ContainedTextField
          key={i}
          label={`{{${i + 1}}}`}
          placeholder={translations["select a dynamic tag value"]}
          {...form.getInputProps(`dynamicTags.${i}`)}
        />
      ))}
    </>
  );
}
