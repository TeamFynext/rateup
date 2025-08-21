import Link from "next/link";
import { useRouter } from "next/router";

import { Anchor, Center, Stack, Text } from "@mantine/core";
import { IconMoodSad, IconReload } from "@tabler/icons-react";
import { RateupButtonBlue } from "components/Button/RateupButtons";
import PaperLayout from "components/styled/Layouts/PaperLayout";
import { useTranslations } from "next-intl";
import { API_URL } from "utils/constants";

const ShopifyCallbackRetry = () => {
  const router = useRouter();
  const { shop } = router.query as { shop: string };
  const translations = useTranslations();
  return (
    <Center h={"100vh"}>
      <PaperLayout w={400} p={"xl"}>
        <Stack justify="center" align="center">
          <IconMoodSad size={"5rem"} stroke={1} />
          <Text>{translations("Something went wrong..")}</Text>
          <RateupButtonBlue
            title={translations("Retry")}
            onClick={() => {
              const regex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com/;
              if (!shop || !regex.test(shop)) {
                router.push("/login");
              }
              window.open(
                `${API_URL}/api/public/integrations/shopify/auth?shop=${shop}`,
              );
            }}
            fullWidth
            leftIcon={<IconReload size={"1rem"} />}
          />
          <Anchor component={Link} href="/login">
            {translations("Go Back")}
          </Anchor>
        </Stack>
      </PaperLayout>
    </Center>
  );
};

export default ShopifyCallbackRetry;
