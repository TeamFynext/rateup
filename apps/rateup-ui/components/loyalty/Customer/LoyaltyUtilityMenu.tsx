import React, { useState } from "react";
import { useRouter } from "next/router";

import { ActionIcon, Button, Center, Menu, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAward,
  IconBrandWhatsapp,
  IconBurger,
  IconFriends,
  IconHandClick,
  IconLayoutSidebarLeftExpandFilled,
  IconMenu,
  IconPoint,
  IconSend,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { isValidPhoneNumber } from "react-phone-number-input";

import { TemplateType } from "@/types/enums";
import {
  useSendWaTemplateToUser,
  useWaTemplates,
} from "@/backend/whatsapp/whatsapp.query";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import { useUser } from "@/context/UserContext";
import { FRONTEND_URL } from "@/utils/constants";
import { showErrorToast } from "@/utils/notifications";

import LoyaltyManualCustomerActionModal from "../actions/PointsIssuance";
import ReferralAction from "../ReferralAction";
import ManualRedeemModal from "../reward/ManualRedeemModal";

const LoyaltyUtilityMenu = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const {
    user: { orgId },
  } = useUser();
  const [referOpened, { open: openReferral, close: closeReferral }] =
    useDisclosure(false);
  const [redeemOpened, { open: openRedeem, close: closeRedeem }] =
    useDisclosure(false);
  const [openedSendModal, { open: openSendModal, close: closeSendModal }] =
    useDisclosure(false);
  const [phone, setPhone] = useState("");
  const sendTemplate = useSendWaTemplateToUser(phone, "");
  const { data: templates } = useWaTemplates();
  console.log("templates", templates);
  function handleSendRegisterTemplate() {
    if (!isValidPhoneNumber(phone)) {
      showErrorToast("Invalid Phone number");
      return;
    }
    console.log("templates in", templates);
    const templateToSend = templates?.find(
      (t) => t.templateType === TemplateType.LOYALTY_REGISTRATION,
    );
    if (!templateToSend) {
      showErrorToast("No registration template found");
      return;
    }
    sendTemplate.mutate({
      templateId: templateToSend.id,
      parameterData: [],
      teamId: null,
    });
  }
  return (
    <Menu position="bottom-start" shadow="xl" width={200}>
      <Menu.Target>
        <Button
          variant="light"
          leftSection={<IconLayoutSidebarLeftExpandFilled size={"1rem"} />}
          w={"fit-content"}
        >
          Menu
        </Button>
      </Menu.Target>
      <Menu.Dropdown
        bg={
          "light-dark(var(--mantine-color-gray-4), var(--mantine-color-body))"
        }
      >
        <Menu.Item onClick={open} leftSection={<IconHandClick size={"1rem"} />}>
          Points Issuance
        </Menu.Item>
        <Menu.Item
          onClick={openReferral}
          leftSection={<IconUsers size="1rem" />}
        >
          Referral
        </Menu.Item>
        <Menu.Item leftSection={<IconAward size="1rem" />} onClick={openRedeem}>
          Redeem Reward
        </Menu.Item>
        <Menu.Item
          onClick={() =>
            window.open(
              `${FRONTEND_URL}/public/loyalty/${orgId}/register`,
              "_blank",
            )
          }
          leftSection={<IconUserPlus size="1rem" />}
        >
          Customer Register
        </Menu.Item>
        <Menu.Item
          leftSection={<IconBrandWhatsapp size="1rem" />}
          onClick={openSendModal}
        >
          Send Customer Register Template
        </Menu.Item>
      </Menu.Dropdown>
      <LoyaltyManualCustomerActionModal opened={opened} close={close} />
      <ReferralAction opened={referOpened} close={closeReferral} />
      <ManualRedeemModal opened={redeemOpened} close={closeRedeem} />
      <FormModalLayout
        title=""
        centered
        opened={openedSendModal}
        onClose={() => {
          setPhone("");
          closeSendModal();
        }}
        buttonTitle="Send"
        onSubmit={handleSendRegisterTemplate}
        submitButtonLeftIcon={<IconSend />}
        isLoading={sendTemplate.isPending}
      >
        <Title ta={"center"} mb={"xl"} order={4}>
          Send Loyalty Register Template
        </Title>
        <PhoneInputWithCountry
          label="Phone Number"
          onChange={(value) => setPhone(value)}
          value={phone}
        />
      </FormModalLayout>
    </Menu>
  );
};

export default LoyaltyUtilityMenu;
