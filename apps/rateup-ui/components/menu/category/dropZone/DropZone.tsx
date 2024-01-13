import { Group, Stack, Text, rem } from "@mantine/core";
import { IconUpload, IconPhoto, IconX } from "@tabler/icons-react";
import { Dropzone, DropzoneProps, MIME_TYPES } from "@mantine/dropzone";
import { showErrorToast } from "../../../../utils/notifications";

interface ExtendedDropzoneProps extends Partial<DropzoneProps> {
  setCsvFile: (file: File) => void;
  description?: string;
}
export function DropZoneArea(props: Readonly<ExtendedDropzoneProps>) {
  let { setCsvFile, description, ...otherProps } = props;
  return (
    <Dropzone
      onDrop={(files) => setCsvFile(files[0])}
      onReject={() =>
        showErrorToast("file format must be csv and select one file")
      }
      accept={[MIME_TYPES.csv]}
      multiple={false}
      {...otherProps}
    >
      <Group
        justify="center"
        gap={0}
        mih={150}
        style={{ pointerEvents: "none" }}
      >
        <Dropzone.Accept>
          <IconUpload
            style={{
              width: rem(52),
              height: rem(52),
              color: "var(--mantine-color-blue-6)",
            }}
            stroke={1.5}
          />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX
            style={{
              width: rem(52),
              height: rem(52),
              color: "var(--mantine-color-red-6)",
            }}
            stroke={1.5}
          />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconPhoto
            style={{
              width: rem(52),
              height: rem(52),
              color: "var(--mantine-color-dimmed)",
            }}
            stroke={1.5}
          />
        </Dropzone.Idle>

        <Stack gap={0}>
          <Text size="xl" inline>
            Drag File here or click to select file
          </Text>
          <Text size="sm" c="dimmed" inline mt={7}>
            {description}
          </Text>
        </Stack>
      </Group>
    </Dropzone>
  );
}
