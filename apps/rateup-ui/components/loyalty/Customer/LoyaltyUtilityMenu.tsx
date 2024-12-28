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

import { useUser } from "@/context/UserContext";
import { FRONTEND_URL } from "@/utils/constants";

import LoyaltyManualCustomerActionModal from "../Actions/PointsIssuance";
import ReferralAction from "../ReferralAction";
import ManualRedeemModal from "../Reward/ManualRedeemModal";
import SendLoyaltyTemplate from "./SendLoyaltyTemplate";

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
      <SendLoyaltyTemplate opened={openedSendModal} close={closeSendModal} />
    </Menu>
  );
};

export default LoyaltyUtilityMenu;
