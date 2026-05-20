"use client";

import { useState } from "react";

import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ContactGroupType } from "@/types/enums.ts";
import { useImportCSVContactMutation } from "@/backend/campaign/contacts/contacts.query";
import { ContactTabs } from "@/routes/dashboard/contacts/index.tsx";

import { RateupButtonBlue } from "../Button/RateupButtons.tsx";
import SimpleModalLayout from "../Modal/SimpleModalLayout.tsx";
import ContactImportErrorModal from "./ContactImportErrorModal.tsx";
import CreateContactModal from "./CreateContactModal.tsx";
import CreateGroupModal from "./CreateGroupModal.tsx";
import { WhatsappTableType } from "./utils/utils.tsx";

const OpenCreateMenu = ({
  tab,
  toggle = () => {},
  isPending = false,
  type = ContactGroupType.NORMAL,
}) => {
  const [contactOpened, { open: contactOpen, close: contactClose }] =
    useDisclosure(false);
  const [groupOpened, setGroupOpened] = useState(false);
  const importCSVContactMutation = useImportCSVContactMutation();
  const { t: translations } = useTranslation();
  return (
    <>
      <ContactImportErrorModal
        body={importCSVContactMutation?.error?.message}
        isError={importCSVContactMutation.isError}
      />
      <RateupButtonBlue
        title={
          tab === WhatsappTableType.MEMBERS
            ? translations("Add Members")
            : translations("Create")
        }
        rightIcon={<IconPlus size={20} />}
        disabled={isPending}
        onClick={() => {
          if (tab === WhatsappTableType.CONTACTS) {
            contactOpen();
          } else if (tab === ContactTabs.GROUPS) {
            setGroupOpened(true);
          } else {
            toggle();
          }
        }}
      />
      <SimpleModalLayout
        centered
        opened={contactOpened}
        onClose={contactClose}
        title={translations("Create contact")}
        size={"xl"}
      >
        <CreateContactModal
          contactClose={contactClose}
          close={close}
          importCSVContactMutation={importCSVContactMutation}
        />
      </SimpleModalLayout>
      <CreateGroupModal
        opened={groupOpened}
        setOpened={setGroupOpened}
        type={type}
      />
    </>
  );
};

export default OpenCreateMenu;
