"use client";

import { useState } from "react";

import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { ContactGroupType } from "@/types/enums";
import { ContactTabs } from "@/app/dashboard/contacts/page";

import { useImportCSVContactMutation } from "../../backend/campaign/contacts/contacts.query";
import { RateupButtonBlue } from "../Button/RateupButtons";
import SimpleModalLayout from "../Modal/SimpleModalLayout";
import ContactImportErrorModal from "./ContactImportErrorModal";
import CreateContactModal from "./CreateContactModal";
import CreateGroupModal from "./CreateGroupModal";
import { WhatsappTableType } from "./utils/utils";

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
  const translations = useExtracted();
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
