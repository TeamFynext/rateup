import { Stack, Title, NavLink, Image } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import router, { useRouter } from "next/router";
import PaperLayout from "../../../../components/styled/Layouts/PaperLayout";

enum Apps {
  Shopify = "Shopify",
  GoogleSheet = "Google Sheet",
}

const IntegratedApps = () => {
  const router = useRouter();

  function getAppIconImageUrl(app) {
    switch (app) {
      case Apps.Shopify:
        return {
          url: "../../images/shopifyicon.png",
          height: 80,
          width: 80,
          radius: "50%",
        };
      case Apps.GoogleSheet:
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
          {Object.values(Apps).map((app) => {
            const { url, height, width, radius } = getAppIconImageUrl(app);
            return (
              <NavLink
                key={app}
                label={app}
                leftSection={
                  <Image src={url} h={height} w={width} radius={radius} />
                }
                rightSection={
                  <IconChevronRight size={"2rem"} color="gray" stroke={1.2} />
                }
                m={"sm"}
                onClick={() => router.push(`/dashboard/settings/apps/${app}`)}
              />
            );
          })}
        </Stack>
      </PaperLayout>
    </Stack>
  );
};

export default IntegratedApps;
