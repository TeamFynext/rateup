import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { ContactTabs } from "../../pages/dashboard/contacts";
import { RateupButtonBlue } from "../Button/RateupButtons";
import FormModalLayout from "../Modal/FormModalLayout";
import CreateContactModal from "./CreateContactModal";
import CreateGroupModal from "./CreateGroupModal";
import { WhatsappTableType } from "./utils/utils";

const OpenCreateMenu = ({ tags = [], tab, toggle = () => {} }) => {
  const [contactOpened, { open: contactOpen, close: contactClose }] =
    useDisclosure(false);
  const [groupOpened, { open: groupOpen, close: groupClose }] =
    useDisclosure(false);

  return (
    <>
      <RateupButtonBlue
        title={tab === WhatsappTableType.MEMBERS ? "Add Members" : "Create"}
        rightIcon={<IconPlus size={20} />}
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
