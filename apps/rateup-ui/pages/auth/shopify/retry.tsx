import { Anchor, Center, Stack, Text } from "@mantine/core";
import { IconMoodSad, IconReload } from "@tabler/icons-react";
import { RateupButtonBlue } from "components/Button/RateupButtons";
import PaperLayout from "components/styled/Layouts/PaperLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { envConstants } from "utils/constants";

const ShopifyCallbackRetry = () => {
  const router = useRouter();
  const { shop } = router.query;
  return (
    <Center h={"100vh"}>
      <PaperLayout w={400} p={"xl"}>
        <Stack justify="center" align="center">
          <IconMoodSad size={"5rem"} stroke={1} />
          <Text>Something went wrong..</Text>
          <RateupButtonBlue
            title="Retry"
            onClick={() =>
              window.open(`${envConstants.API_URL}/api/shopify?shop=${shop}`)
            }
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
