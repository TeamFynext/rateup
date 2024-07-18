import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { Anchor, Center, Stack, Text } from "@mantine/core";
import { IconMoodSad, IconReload } from "@tabler/icons-react";
import { RateupButtonBlue } from "components/Button/RateupButtons";
import PaperLayout from "components/styled/Layouts/PaperLayout";
import { API_URL } from "utils/constants";

const ShopifyCallbackRetry = () => {
  const router = useRouter();
  const { shop } = router.query as { shop: string };

  useEffect(() => {
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com/;
    if (!shop || !regex.test(shop)) {
      router.push("/login");
    }
  }, [shop]);
  return (
    <Center h={"100vh"}>
      <PaperLayout w={400} p={"xl"}>
        <Stack justify="center" align="center">
          <IconMoodSad size={"5rem"} stroke={1} />
          <Text>Something went wrong..</Text>
          <RateupButtonBlue
            title="Retry"
            onClick={() => window.open(`${API_URL}/api/shopify?shop=${shop}`)}
            fullWidth
            leftIcon={<IconReload size={"1rem"} />}
          />
          <Anchor component={Link} href="/login">
            Go Back
          </Anchor>
        </Stack>
      </PaperLayout>
    </Center>
  );
};

export default ShopifyCallbackRetry;
