"use client";

import { useState } from "react";

import {
  ActionIcon,
  Badge,
  BadgeProps,
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
import { useTranslations } from "next-intl";

import { IntegratedApps } from "@/types/enums";
import { ShopifyIntegration } from "@/types/global";
import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import { getProductsFromShopify } from "@/backend/appsIntegration/shopify/shopify.api";
import { useTeamsByUser } from "@/backend/team/team.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import ShopifySchedules from "@/components/shopify/ShopifySchedules";
import ShopifySettings from "@/components/shopify/ShopifySettings";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "@/utils/notifications";

import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../../components/Button/RateupButtons";
import ShopifySurveySchedules from "../../../../components/shopify/ShopifySurveySchedules";

interface ActiveBadgeProps extends BadgeProps {
  active: boolean;
}
export const ActiveStatusBadge = ({ active, ...props }: ActiveBadgeProps) => {
  const translations = useTranslations();
  return (
    <Badge color={active ? "var(--active-green-2)" : "red"} {...props}>
      {active ? translations("ACTIVE") : translations("INACTIVE")}
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
  const { data: shopifyInfo, isLoading } = useIntegrationByType(
    IntegratedApps.shopify,
  ) as { data: ShopifyIntegration; isLoading: boolean };
  const { data: templates, isPending, isError, refetch } = useWaTemplates();
  const { data: teams } = useTeamsByUser();
  const translations = useTranslations();
  const session = shopifyInfo?.credential?.session;
  const [shopifyProducts, setShopifyProducts] = useState([]);

  const [activePanel, setActivePanel] = useState<ShopifyActivePanel>(
    ShopifyActivePanel.Home,
  );

  const handleLoadProducts = async () => {
    try {
      showLoadingToast(
        translations("Syncing Shopify products"),
        "shopify-products",
        true,
      );
      const products = await getProductsFromShopify();
      setShopifyProducts(products ?? []);
      showSuccessToast(
        translations("Products loaded successfully"),
        "shopify-products",
        <IconCheck />,
        true,
      );
    } catch (e) {
      showErrorToast(
        translations("Product syncing failed"),
        "shopify-products",
        <IconX />,
        true,
      );
    }
  };

  if (isLoading) return <RateupLoader />;

  if (!shopifyInfo || !shopifyInfo?.active || !shopifyInfo.credential.session)
    return (
      <Center h={"100%"}>
        <Stack>
          <Image src={"../../../images/shopifystore.jpeg"} />
          <RateupButtonBlue
            title={translations("Connect with shopify store")}
            leftIcon={<IconPlus />}
            onClick={() =>
              window.open("https://apps.shopify.com/rateup", "_blank")
            }
            color="#5e8e3e"
          />
        </Stack>
      </Center>
    );
  return (
    <Stack>
      <Group justify="flex-end">
        <RateupButtonSecondary
          title={translations("Sync products")}
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
          shopifyInfo={shopifyInfo}
          shopifyProducts={shopifyProducts}
          setShopifyProducts={setShopifyProducts}
          waTemplates={templates}
          teams={teams?.data}
        />
        <ShopifySchedules
          shopifyProducts={shopifyProducts}
          shopifyInfo={shopifyInfo}
          waTemplates={templates}
          teams={teams?.data}
        />
      </Stack>
      <Stack
        display={activePanel == ShopifyActivePanel.Settings ? "block" : "none"}
      >
        <ShopifySettings shopifyInfo={shopifyInfo} />
      </Stack>
    </Stack>
  );
};

export default Shopify;
