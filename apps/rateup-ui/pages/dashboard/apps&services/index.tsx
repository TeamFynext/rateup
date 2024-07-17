import router from "next/router";

import {
  Divider,
  Group,
  Image,
  NavLink,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconApi,
  IconChevronRight,
  IconCloudLock,
  IconLock,
  IconShieldLockFilled,
} from "@tabler/icons-react";
import PaperLayout from "components/styled/Layouts/PaperLayout";
import { IntegratedApps } from "types/enums";

const index = () => {
  function getAppIconImageUrl(app) {
    switch (app) {
      case IntegratedApps.shopify:
        return {
          url: "../../images/shopifyicon.png",
          height: 80,
          width: 80,
          radius: "50%",
        };
      case IntegratedApps.googlesheet:
        return {
          url: "../../images/googlesheeticon.png",
          height: 50,
          width: 80,
          radius: 0,
        };
    }
  }

  return (
    <Stack p={"xl"}>
      <PaperLayout>
        <Title order={4}>Apps</Title>
        <Stack>
          {Object.entries(IntegratedApps).map(([key, value], index) => {
            const { url, height, width, radius } = getAppIconImageUrl(value);
            return (
              <>
                <NavLink
                  key={key}
                  label={value}
                  leftSection={
                    <Image src={url} h={height} w={width} radius={radius} />
                  }
                  rightSection={
                    <IconChevronRight size={"2rem"} color="gray" stroke={1.2} />
                  }
                  m={"sm"}
                  onClick={() => router.push(`/dashboard/apps&services/${key}`)}
                />
              </>
            );
          })}
        </Stack>
      </PaperLayout>
      <PaperLayout>
        <Title order={4}>Services</Title>
        <SimpleGrid cols={3} p={"xl"} spacing={"xl"}>
          <PaperLayout
            onClick={() => router.push("/dashboard/apps&services/encryption")}
            hoveractive
          >
            <Group>
              <IconCloudLock color="gray" />
              <Text>End-to-End Enryption</Text>
            </Group>
          </PaperLayout>
          <PaperLayout
            onClick={() => router.push("/dashboard/apps&services/apiservice")}
            hoveractive
          >
            <Group>
              <IconApi color="gray" />
              <Text>API Service</Text>
            </Group>
          </PaperLayout>
        </SimpleGrid>
      </PaperLayout>
    </Stack>
  );
};

export default index;
