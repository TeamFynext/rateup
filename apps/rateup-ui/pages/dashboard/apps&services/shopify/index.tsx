import { Badge, Group, Stack, Text, Center, Image } from "@mantine/core";
import PaperLayout from "../../../../components/styled/Layouts/PaperLayout";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "../../../../components/Button/RateupButtons";
import { useDisclosure } from "@mantine/hooks";
import {
  useGetShopifySession,
  useRegisterWebhooks,
} from "../../../../backend/shopify/shopify.query";
import {
  IconBuildingStore,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { showLoadingToast } from "../../../../utils/notifications";
import ConnectShopifyModal from "../../../../components/shopify/ConnectShopifyModal";
import ShopifySurveySchedules from "../../../../components/shopify/ShopifySurveySchedules";

export const ActiveStatusBadge = ({ active }) => {
  return (
    <Badge color={active ? "green" : "red"}>
      {active ? "ACTIVE" : "INACTIVE"}
    </Badge>
  );
};

const Shopify = () => {
  const [connectOpened, { open: openConnect, close: closeConnect }] =
    useDisclosure(false);
  const { data: session } = useGetShopifySession();

  const registerWebhooksmutate = useRegisterWebhooks();

  const registerWebhooks = () => {
    showLoadingToast(
      "Hold On..Registering webhooks",
      "webhooks",
      true,
      "Loading",
      "",
      10000,
    );
    registerWebhooksmutate.mutate();
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
        <PaperLayout p={"sm"} w={"fit-content"}>
          <Stack gap={"lg"}>
            <Group>
              <IconBuildingStore color="#95bf47" />
              <Text fw={"bold"} size="md">
                {session?.shop}
              </Text>
            </Group>
            {!session.isWebhookRegistered && (
              <RateupButtonPrimary
                color="#95bf47"
                title="Register webhooks"
                disabled={registerWebhooksmutate.isPending}
                onClick={registerWebhooks}
              />
            )}
          </Stack>
        </PaperLayout>
      </Group>
      <ShopifySurveySchedules session={session} />
    </Stack>
  );
};

export default Shopify;
