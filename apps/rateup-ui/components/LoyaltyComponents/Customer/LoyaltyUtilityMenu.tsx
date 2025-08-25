import React from "react";

import { Button, Menu } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAward,
  IconBrandWhatsapp,
  IconHandClick,
  IconLayoutSidebarLeftExpandFilled,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ContactGroupType } from "@/types/enums";
import { useImportCSVCustomerMutation } from "@/backend/loyalty/customer/customer.query";
import { useGetContactTags } from "@/backend/whatsapp/settings/waSettings.query";
import CreateContactModal from "@/components/Contacts/CreateContactModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import { useUser } from "@/context/UserContext";
import { FRONTEND_URL } from "@/utils/constants";

import LoyaltyBulkActions from "../Action/LoyaltyBulkActions";
import LoyaltyManualCustomerActionModal from "../Action/PointsIssuance";
import ReferralAction from "../ReferralAction";
import ManualRedeemModal from "../Rewards/ManualRedeemModal";
import SendLoyaltyTemplate from "./SendLoyaltyTemplate";

const LoyaltyUtilityMenu = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [referOpened, { open: openReferral, close: closeReferral }] =
    useDisclosure(false);
  const [redeemOpened, { open: openRedeem, close: closeRedeem }] =
    useDisclosure(false);
  const [openedSendModal, { open: openSendModal, close: closeSendModal }] =
    useDisclosure(false);
  const [openedBulk, { open: openBulk, close: closeBulk }] =
    useDisclosure(false);
  const [
    openedAddCustomer,
    { open: openAddCustomer, close: closeAddCustomer },
  ] = useDisclosure(false);

  const { isPending, data: cTags } = useGetContactTags();

  const importCSVCustomerMutation = useImportCSVCustomerMutation();
  const translations = useTranslations();

  return (
    <Menu position="bottom-start" shadow="xl" width={200}>
      <Menu.Target>
        <Button
          variant="light"
          leftSection={<IconLayoutSidebarLeftExpandFilled size={"1rem"} />}
          w={"fit-content"}
        >
          {translations("Menu")}
        </Button>
      </Menu.Target>
      <Menu.Dropdown
        bg={
          "light-dark(var(--mantine-color-gray-4), var(--mantine-color-body))"
        }
      >
        <Menu.Item
          leftSection={<IconUserPlus size="1rem" />}
          onClick={openAddCustomer}
        >
          {translations("Add Customer")}
        </Menu.Item>
        <Menu.Item onClick={open} leftSection={<IconHandClick size={"1rem"} />}>
          {translations("Points Issuance")}
        </Menu.Item>
        <Menu.Item
          onClick={openBulk}
          leftSection={<IconHandClick size={"1rem"} />}
        >
          {translations("Apply Bulk Actions")}
        </Menu.Item>
        <Menu.Item
          onClick={openReferral}
          leftSection={<IconUsers size="1rem" />}
        >
          {translations("Referral")}
        </Menu.Item>
        <Menu.Item leftSection={<IconAward size="1rem" />} onClick={openRedeem}>
          {translations("Redeem Reward")}
        </Menu.Item>
        {/* <Menu.Item
          onClick={() =>
            window.open(
              `${FRONTEND_URL}/public/loyalty/${orgId}/register`,
              "_blank",
            )
          }
          leftSection={<IconUserPlus size="1rem" />}
        >
          {translations("Customer Register")}
        </Menu.Item> */}
        <Menu.Item
          leftSection={<IconBrandWhatsapp size="1rem" />}
          onClick={openSendModal}
        >
          {translations("Send Customer Register Template")}
        </Menu.Item>
      </Menu.Dropdown>
      <LoyaltyManualCustomerActionModal opened={opened} close={close} />
      <ReferralAction opened={referOpened} close={closeReferral} />
      <ManualRedeemModal opened={redeemOpened} close={closeRedeem} />
      <SendLoyaltyTemplate opened={openedSendModal} close={closeSendModal} />
      <LoyaltyBulkActions opened={openedBulk} close={closeBulk} />
      <FormModalLayout
        onClose={closeAddCustomer}
        opened={openedAddCustomer}
        title={translations("Add members")}
        size="xl"
        centered
      >
        <CreateContactModal
          contactClose={closeAddCustomer}
          close={closeAddCustomer}
          cTags={cTags?.contactTags?.map((tag) => tag?.name)}
          importCSVContactMutation={importCSVCustomerMutation}
          type={ContactGroupType.LOYALTY}
        />
      </FormModalLayout>
    </Menu>
  );
};

export default LoyaltyUtilityMenu;
