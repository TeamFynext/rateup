import { Box, Menu } from "@mantine/core";
import React from "react";
import { RateupButtonBlue } from "../Button/RateupButtons";
import { IconChevronDown, IconUser, IconUsersGroup } from "@tabler/icons-react";
import FormModalLayout from "../Modal/FormModalLayout";
import CreateContactModal from "./CreateContactModal";
import CreateGroupModal from "./CreateGroupModal";
import { useDisclosure } from "@mantine/hooks";

const OpenCreateMenu = ({ tags = [] }) => {
  const [contactOpened, { open: contactOpen, close: contactClose }] =
    useDisclosure(false);
  const [groupOpened, { open: groupOpen, close: groupClose }] =
    useDisclosure(false);

  return (
    <>
      <Menu withArrow>
        <Menu.Target>
          <Box>
            <RateupButtonBlue
              title="Create"
              rightIcon={<IconChevronDown size={20} />}
            />
          </Box>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item leftSection={<IconUser size={14} />} onClick={contactOpen}>
            Contact
          </Menu.Item>
          <Menu.Item
            leftSection={<IconUsersGroup size={14} />}
            onClick={groupOpen}
          >
            Group
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <FormModalLayout
        centered
        opened={contactOpened}
        onClose={contactClose}
        title="Create contact"
        size={"xl"}
      >
        <CreateContactModal
          contactClose={contactClose}
          close={close}
          cTags={tags}
        />
      </FormModalLayout>
      <FormModalLayout
        centered
        opened={groupOpened}
        onClose={groupClose}
        title="Create contact group"
        size="lg"
      >
        <CreateGroupModal groupClose={groupClose} close={close} />
      </FormModalLayout>
    </>
  );
};

export default OpenCreateMenu;
