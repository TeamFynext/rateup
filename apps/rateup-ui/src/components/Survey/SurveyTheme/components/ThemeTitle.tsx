import { ActionIcon, Group, Modal, Text, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil } from "@tabler/icons-react";
import React from "react";

import CustomTextEditor from "@/components/RichTextEditor/CustomTextEditor.tsx";

interface ThemeTitleProps {
  value: string;
  onChange: any;
  styles?: any;
}

const ThemeTitle = ({ value, onChange, styles }: ThemeTitleProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <Group>
      <Text style={styles} dangerouslySetInnerHTML={{ __html: value }} />
      <Tooltip label={"Edit"}>
        <ActionIcon onClick={open} variant={"subtle"} size={"xs"}>
          <IconPencil />
        </ActionIcon>
      </Tooltip>
      <Modal onClose={close} opened={opened} centered size={"lg"}>
        <CustomTextEditor content={value} onUpdate={onChange} />
      </Modal>
    </Group>
  );
};

export default ThemeTitle;
