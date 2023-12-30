import {
  ActionIcon,
  Anchor,
  AppShell,
  Box,
  Breadcrumbs,
  Burger,
  Button,
  Group,
  MantineProvider,
  MantineThemeProvider,
  NavLink,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconTerminal,
  IconTerminal2,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { LoggedInUserCard } from "../Navbar/LeftNavbar";
import { useUserInfo } from "../../../backend/user/user.query";
import { adminNavItems } from "./admin.nav";

export function AdminPanelLayout({ children }) {
  const [opened, { toggle, open, close }] = useDisclosure(true);
  const { data: userInfo, isLoading, isError } = useUserInfo();
  const theme = useMantineTheme();
  const primaryColor = theme.colors[theme.primaryColor][6];
  const router = useRouter();
  function handleBackToDashboard() {
    router.push("/dashboard");
  }

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
      <AppShell.Navbar pl="sm" py="0">
        <Stack
          h="100%"
          style={{
            borderLeft: "1px solid #ebebeb",
          }}
        >
          <AppShell.Section grow my="md" component={ScrollArea}>
            {adminNavItems.map(({ Icon, label, href }) => {
              const active = router.pathname.startsWith(href);

              return (
                <NavLink
                  key={label}
                  onClick={() => router.push(href)}
                  label={label}
                  leftSection={<Icon stroke={1.5} size={28} />}
                  active={active}
                  style={{
                    borderLeft: active ? `2px solid ${primaryColor}` : "none",
                  }}
                />
              );
            })}
          </AppShell.Section>
          <AppShell.Section>
            <Stack p="sm">
              {userInfo ? (
                LoggedInUserCard({
                  name: userInfo.data.userName,
                  role: userInfo.data.role,
                  email: userInfo.data.email,
                  image: userInfo.data.profilePhoto,
                })
              ) : (
                <Skeleton height={60} />
              )}
              <Button
                variant="outline"
                leftSection={<IconArrowLeft />}
                onClick={handleBackToDashboard}
                radius={"xl"}
              >
                Dashboard
              </Button>
            </Stack>
          </AppShell.Section>
        </Stack>
      </AppShell.Navbar>
      <AppShell.Header>
        <Group pl="sm" h="100%" align="center" justify="space-between">
          <Group>
            <IconTerminal2 />
            <Title>Admin Panel</Title>
          </Group>
          <Group p="xs">
            <Tooltip label={"Toggle Navbar"}>
              <Burger opened={opened} onClick={toggle} />
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>{children}</AppShell.Main>
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
