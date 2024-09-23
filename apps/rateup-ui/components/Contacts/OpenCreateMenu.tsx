import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import { useImportCSVContactMutation } from "../../backend/campaign/contacts/contacts.query";
import { ContactTabs } from "../../pages/dashboard/contacts";
import { RateupButtonBlue } from "../Button/RateupButtons";
import FormModalLayout from "../Modal/FormModalLayout";
import ContactImportErrorModal from "./ContactImportErrorModal";
import CreateContactModal from "./CreateContactModal";
import CreateGroupModal from "./CreateGroupModal";
import { WhatsappTableType } from "./utils/utils";

const OpenCreateMenu = ({
  tags = [],
  tab,
  toggle = () => {},
  isPending = false,
}) => {
  const [contactOpened, { open: contactOpen, close: contactClose }] =
    useDisclosure(false);
  const [groupOpened, { open: groupOpen, close: groupClose }] =
    useDisclosure(false);
  const importCSVContactMutation = useImportCSVContactMutation();
  const { translations } = useTranslations();
  return (
    <>
      <ContactImportErrorModal
        body={importCSVContactMutation?.error?.response?.data}
        isError={importCSVContactMutation.isError}
      />
      <RateupButtonBlue
        title={
          tab === WhatsappTableType.MEMBERS
            ? translations["Add Members"]
            : translations["Create"]
        }
        rightIcon={<IconPlus size={20} />}
        disabled={isPending}
        onClick={() => {
          if (tab === ContactTabs.CONTACTS) {
            contactOpen();
          } else if (tab === ContactTabs.GROUPS) {
            groupOpen();
          } else {
            toggle();
          }
        }}
      />
      <FormModalLayout
        centered
        opened={contactOpened}
        onClose={contactClose}
        title={translations["Create contact"]}
        size={"xl"}
      >
        <CreateContactModal
          contactClose={contactClose}
          close={close}
          cTags={tags}
          importCSVContactMutation={importCSVContactMutation}
        />
      </FormModalLayout>
      <FormModalLayout
        centered
        opened={groupOpened}
        onClose={groupClose}
        title={translations["Create contact group"]}
        size="lg"
      >
        <CreateGroupModal groupClose={groupClose} close={close} />
      </FormModalLayout>
    </>
  );
};

export default OpenCreateMenu;
