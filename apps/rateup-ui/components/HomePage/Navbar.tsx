import {
  HoverCard,
  Group,
  Button,
  UnstyledButton,
  Text,
  SimpleGrid,
  ThemeIcon,
  Anchor,
  Divider,
  Center,
  Box,
  Burger,
  Drawer,
  Collapse,
  ScrollArea,
  rem,
  Image,
} from "@mantine/core";
import Link from "next/link";
import { useDisclosure, useHeadroom } from "@mantine/hooks";
import { IconChevronDown } from "@tabler/icons-react";
import { useRouter } from "next/router";
import classes from "./Navbar.module.css";
import { navData } from "./NavData";

export function HomeNavbar() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [linksOpened, { toggle: toggleLinks }] = useDisclosure(false);
  const pinned = useHeadroom({ fixedAt: 120 });

  const router = useRouter();

  const links = navData.map((item) => (
    <UnstyledButton className={classes.subLink} key={item.title}>
      <Group wrap="nowrap" align="flex-start">
        <ThemeIcon size={34} variant="default" radius="md">
          <item.icon size={rem(22)} color="blue.9" />
          {/* TODO primary color var add above */}
        </ThemeIcon>
        <div>
          <Text size="sm" fw={500}>
            {item.title}
          </Text>
          <Text size="xs" c="dimmed">
            {item.description}
          </Text>
        </div>
      </Group>
    </UnstyledButton>
  ));

  return (
    <Box>
      <Group
        justify="space-between"
        style={{ height: "100%" }}
        className={classes.wrapContainer}
      >
        <Center>
          <Link href="/">
            <Image
              pt="2px"
              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`}
              alt="RateUp Logo"
              w={172}
              h={45}
            />
          </Link>
        </Center>
        <Group
          style={{ height: "100%" }}
          gap={0}
          className={classes.hiddenMobile}
        >
          <a href="#" className={classes.link}>
            About
          </a>
          <HoverCard
            width={600}
            position="bottom"
            radius="md"
            shadow="md"
            withinPortal
          >
            <HoverCard.Target>
              <a href="#" className={classes.link}>
                <Center inline>
                  <Box component="span" mr={5}>
                    Product
                  </Box>
                  <IconChevronDown size={16} color="blue.9" />
                </Center>
              </a>
            </HoverCard.Target>

            <HoverCard.Dropdown style={{ overflow: "hidden" }}>
              <Group justify="space-between" px="md">
                <Text fw={500}>Features</Text>
                <Anchor href="#" fz="xs">
                  View all
                </Anchor>
              </Group>

              <Divider
                my="sm"
                mx="-md"
                // color={theme.colorScheme === 'dark' ? 'dark.5' : 'gray.1'}
                color="gray.1"
              />

              <SimpleGrid cols={2} spacing={0}>
                {links}
              </SimpleGrid>

              <div className={classes.dropdownFooter}>
                <Group justify="space-between">
                  <div>
                    <Text fw={500} fz="sm">
                      Get started
                    </Text>
                    <Text size="xs" color="dimmed">
                      Start creating surveys for your organization.
                    </Text>
                  </div>
                  <Button variant="default">Get started</Button>
                </Group>
              </div>
            </HoverCard.Dropdown>
          </HoverCard>

          <a href="#" className={classes.link}>
            Contact
          </a>

          <HoverCard
            width={600}
            position="bottom"
            radius="md"
            shadow="md"
            withinPortal
          >
            <HoverCard.Target>
              <a href="#" className={classes.link}>
                <Center inline>
                  <Box component="span" mr={5}>
                    Others
                  </Box>
                  <IconChevronDown size={16} color="blue.9" />
                </Center>
              </a>
            </HoverCard.Target>

            <HoverCard.Dropdown style={{ overflow: "hidden" }}>
              <Group justify="space-between" px="md">
                <Text fw={500}>Resources</Text>
                <Anchor href="#" fz="xs">
                  View all
                </Anchor>
              </Group>

              <Divider
                my="sm"
                mx="-md"
                // color={theme.colorScheme === 'dark' ? 'dark.5' : 'gray.1'}
                color="dark.5"
              />

              <SimpleGrid cols={2} spacing={0}>
                {links}
              </SimpleGrid>

              <div className={classes.dropdownFooter}>
                <Group justify="space-between">
                  <div>
                    <Text fw={500} fz="sm">
                      Get started
                    </Text>
                    <Text size="xs" color="dimmed">
                      Start creating surveys for your organization.
                    </Text>
                  </div>
                  <Button variant="default">Get started</Button>
                </Group>
              </div>
            </HoverCard.Dropdown>
          </HoverCard>

          {/* <a href="#" className={classes.link}>
                            Pricing
                        </a> */}
        </Group>

        <Group className={classes.hiddenMobile}>
          <Button
            variant="default"
            size="md"
            onClick={() => {
              router.push({
                pathname: "/login",
                query: { type: "sign_in" },
              });
            }}
          >
            Log in
          </Button>
          <Button
            onClick={() => {
              router.push({
                pathname: "/signup",
                query: { type: "sign_up" },
              });
            }}
            size="md"
          >
            Sign up
          </Button>
        </Group>
        <Burger
          opened={drawerOpened}
          onClick={toggleDrawer}
          className={classes.hiddenDesktop}
        />
      </Group>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title="Navigation"
        className={classes.hiddenDesktop}
        zIndex={1000000}
      >
        <ScrollArea h={`calc(100vh - ${rem(60)})`} mx="-md">
          <Divider my="sm" color="dark.5" />

          <a href="#" className={classes.link}>
            Home
          </a>
          <UnstyledButton className={classes.link} onClick={toggleLinks}>
            <Center inline>
              <Box component="span" mr={5}>
                Features
              </Box>
              <IconChevronDown size={16} color="blue.9" />
            </Center>
          </UnstyledButton>
          <Collapse in={linksOpened}>{links}</Collapse>
          <a href="#" className={classes.link}>
            About
          </a>
          <a href="#" className={classes.link}>
            Contact
          </a>
          <a href="/dashboard" className={classes.link}>
            Dashboard
          </a>
          <Divider my="sm" color="dark.5" />
          <Group justify="center" grow pb="xl" px="md">
            <Button variant="default">Log in</Button>
            <Button>Sign up</Button>
          </Group>
        </ScrollArea>
      </Drawer>
    </Box>
  );
}
