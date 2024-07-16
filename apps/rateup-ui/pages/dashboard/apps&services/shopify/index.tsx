import { useState } from "react";

import {
  ActionIcon,
  Badge,
  Center,
  Group,
  Image,
  Stack,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconHomeFilled,
  IconPlus,
  IconSettingsFilled,
} from "@tabler/icons-react";

import ShopifySettings from "@/components/shopify/ShopifySettings";

import { useGetShopifySession } from "../../../../backend/shopify/shopify.query";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import ConnectShopifyModal from "../../../../components/shopify/ConnectShopifyModal";
import ShopifySurveySchedules from "../../../../components/shopify/ShopifySurveySchedules";

export const ActiveStatusBadge = ({ active }) => {
  return (
    <Badge color={active ? "green" : "red"}>
      {active ? "ACTIVE" : "INACTIVE"}
    </Badge>
  );
};

enum ShopifyActivePanel {
  Home = "Home",
  Settings = "Settings",
}
const Shopify = () => {
  const [connectOpened, { open: openConnect, close: closeConnect }] =
    useDisclosure(false);
  const { data: session } = useGetShopifySession();

  const [activePanel, setActivePanel] = useState<ShopifyActivePanel>(
    ShopifyActivePanel.Home,
  );

  if (!session || !session?.active)
    return (
      <Center h={"100%"}>
        <Stack>
          <Image src={"../../../images/shopifystore.jpeg"} />
          <RateupButtonBlue
            title="Connect with shopify store"
            leftIcon={<IconPlus />}
            onClick={openConnect}
            color="#5e8e3e"
          />
          <ConnectShopifyModal opened={connectOpened} close={closeConnect} />
        </Stack>
      </Center>
    );
  return (
    <Stack>
      <Group justify="flex-end">
        <Tooltip
          label={
            activePanel === ShopifyActivePanel.Settings
              ? ShopifyActivePanel.Home
              : ShopifyActivePanel.Settings
          }
        >
          <ActionIcon
            onClick={() =>
              setActivePanel(
                activePanel === ShopifyActivePanel.Settings
                  ? ShopifyActivePanel.Home
                  : ShopifyActivePanel.Settings,
              )
            }
            variant="subtle"
            size={"lg"}
            color="gray"
          >
            {activePanel === ShopifyActivePanel.Settings ? (
              <IconHomeFilled size={"1.5rem"} />
            ) : (
              <IconSettingsFilled size={"1.5rem"} />
            )}
          </ActionIcon>
        </Tooltip>
      </Group>
      <Stack
        display={activePanel == ShopifyActivePanel.Home ? "block" : "none"}
      >
        <ShopifySurveySchedules session={session} />
      </Stack>
      <Stack
        display={activePanel == ShopifyActivePanel.Settings ? "block" : "none"}
      >
        <ShopifySettings session={session} />
      </Stack>
    </Stack>
  );
};

export default Shopify;
