"use client";

import { usePathname, useRouter } from "next/navigation";

import {
  Anchor,
  AppShell,
  Burger,
  Button,
  Group,
  NavLink,
  ScrollArea,
  Skeleton,
  Stack,
  Title,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowLeft, IconTerminal2, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useUserInfo } from "../../../backend/user/user.query";
import RateupLoader from "../../Loaders/RateupLoader";
import LoggedInUserCard from "../Navbar/LoggedInUserCard";
import { adminNavItems } from "./admin.nav";

export function AdminPanelLayout({ children }) {
  const [opened, { toggle, open, close }] = useDisclosure(true);
  const { data, isPending, isError } = useUserInfo();
  const theme = useMantineTheme();
  const primaryColor = theme.colors[theme.primaryColor][6];
  const router = useRouter();
  const translations = useTranslations();
  const pathname = usePathname();
  function handleBackToDashboard() {
    if (pathname.startsWith("/admin")) {
      // Ensure the code is executed only on the client-side
      router.push("/dashboard");
    }
  }
  if (isPending) return <RateupLoader h={"100dvh"} />;
  return (
    <AppShell
      header={{ height: "60" }}
      navbar={{
        width: 200,
        breakpoint: "sm",
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      padding="md"
    >
      {data &&
      "data" in data &&
      data?.data?.orgId === process.env.NEXT_PUBLIC_ROOT_ORG ? (
        <>
          <AppShell.Navbar pl="sm" py="0">
            <Stack
              h="100%"
              style={{
                borderLeft: "1px solid #ebebeb",
              }}
            >
              <AppShell.Section grow my="md" component={ScrollArea}>
                {adminNavItems.map(({ Icon, label, href }) => {
                  const active = pathname.startsWith(href);

                  return (
                    <NavLink
                      key={label}
                      onClick={() => router.push(href)}
                      label={label}
                      leftSection={<Icon stroke={1.5} size={28} />}
                      active={active}
                      style={{
                        borderLeft: active
                          ? `2px solid ${primaryColor}`
                          : "none",
                      }}
                    />
                  );
                })}
              </AppShell.Section>
              <AppShell.Section>
                <Stack p="sm">
                  {data ? <LoggedInUserCard /> : <Skeleton height={60} />}
                  <Button
                    variant="outline"
                    leftSection={<IconArrowLeft />}
                    onClick={handleBackToDashboard}
                    radius={"xl"}
                  >
                    {translations("Dashboard")}
                  </Button>
                </Stack>
              </AppShell.Section>
            </Stack>
          </AppShell.Navbar>
          <AppShell.Header>
            <Group pl="sm" h="100%" align="center" justify="space-between">
              <Group>
                <IconTerminal2 />
                <Title>{translations("Admin Panel")}</Title>
              </Group>
              <Group p="xs">
                <Tooltip label={translations("Toggle Navbar")}>
                  <Burger opened={opened} onClick={toggle} />
                </Tooltip>
              </Group>
            </Group>
          </AppShell.Header>
          <AppShell.Main>{children}</AppShell.Main>
        </>
      ) : (
        (handleBackToDashboard(), null)
      )}
    </AppShell>
  );
}
const items = [
  { title: "Mantine", href: "#" },
  { title: "Mantine hooks", href: "#" },
  { title: "use-id", href: "#" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));
