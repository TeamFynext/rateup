import { useState } from "react";

import { getProductsFromShopify } from "@/backend/shopify/shopify.api";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "@/utils/notifications";
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
  IconCheck,
  IconHomeFilled,
  IconPlus,
  IconSettingsFilled,
  IconX,
} from "@tabler/icons-react";

import ShopifySchedules from "@/components/shopify/ShopifySchedules";
import ShopifySettings from "@/components/shopify/ShopifySettings";

import { useGetShopifySession } from "../../../../backend/shopify/shopify.query";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../../components/Button/RateupButtons";
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
  const [shopifyProducts, setShopifyProducts] = useState([]);

  const [activePanel, setActivePanel] = useState<ShopifyActivePanel>(
    ShopifyActivePanel.Home,
  );

  const handleLoadProducts = async () => {
    try {
      showLoadingToast("Syncing Shopify products", "shopify-products", true);
      const products = await getProductsFromShopify();
      setShopifyProducts(products ?? []);
      showSuccessToast(
        "Products loaded successfully",
        "shopify-products",
        <IconCheck />,
        true,
      );
    } catch (e) {
      showErrorToast(
        "Product syncing failed",
        "shopify-products",
        <IconX />,
        true,
      );
    }
  };

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
        <RateupButtonSecondary
          title="Sync products"
          onClick={handleLoadProducts}
        />
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
        gap={"xl"}
      >
        <ShopifySurveySchedules
          session={session}
          shopifyProducts={shopifyProducts}
          setShopifyProducts={setShopifyProducts}
        />
        <ShopifySchedules shopifyProducts={shopifyProducts} />
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
