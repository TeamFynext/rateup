import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import {
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Divider,
  Flex,
  Group,
  HoverCard,
  Indicator,
  rgba,
  ScrollAreaAutosize,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
  Transition,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import SessionReact from "supertokens-auth-react/recipe/session";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { useGetInboxUserCount } from "@/backend/whatsapp/inbox/message/wamessage.query";
import useTranslations from "@/dictionaries/useTranslation";
import { useChatContactCountStore } from "@/pages/dashboard/whatsapp/inbox/store";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "../../backend/org/ws/org.ws.api";
import { useOrgWsAuthCheck } from "../../backend/org/ws/org.ws.query";
import {
  IUserInfoApiResponse,
  UserAvailabilityStatus,
} from "../../backend/user/user.api";
import {
  useUpdateUserAvailabilityStatus,
  useUserInfo,
} from "../../backend/user/user.query";
import { NavControlContext } from "../../context/NavControlContext";
import { useUser, useWsData } from "../../context/UserContext";
import useLocalStorage from "../../hooks/localStorage";
import { useNotifyWsMessages } from "../../hooks/useNotifyWsMessages";
import { orgWsMessage } from "../../types/global";
import NavbarSkeleton from "../animation/skeleton/Navbar.Skeleton";
import { useChatFilterStore } from "../whatsapp/inbox/chatselect/chatFilter";
import classes from "./DoubleNavbar.module.css";
import styles from "./Layout.module.css";
import { getNavTopData } from "./Navbar/navbar.constants";

// Define interface for link items
interface NavLinkItem {
  label: string;
  link: string;
  icon?: React.ComponentType<any>;
  disabled?: boolean;
}

// MainNavLinks Component
const MainNavLinks = ({
  links,
  activeMainLink,
  setActiveMainLink,
  router,
  open,
  setActiveSubLink,
}) => {
  return links.map((link, index) => (
    <Tooltip
      label={link.label}
      position="right"
      withArrow
      transitionProps={{ duration: 0 }}
      key={index}
    >
      <UnstyledButton
        onClick={() => {
          setActiveMainLink(link.label);
          setActiveSubLink(link?.children[0]?.link);
          open();
          if (link.link && !link?.disabled) {
            router.push(link.link);
          } else {
            router.push(link?.children[0]?.link);
          }
        }}
        className={classes.mainLink}
        data-active={link.label === activeMainLink || undefined}
      >
        <link.icon size={22} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  ));
};

// SubNavLinks Component
const SubNavLinks = ({ links, activeSubLink, setActiveSubLink, router }) => {
  const linksIcon = links
    .filter((d) => !d?.disabled)
    .map((link, index) => (
      <Tooltip
        label={link.label}
        position="right"
        withArrow
        transitionProps={{ duration: 0 }}
        key={index}
      >
        <UnstyledButton
          onClick={() => {
            setActiveSubLink(link.link);
            router.push(link.link);
          }}
          className={classes.link}
          data-active={link.link === activeSubLink || undefined}
          w={60}
        >
          <link.icon size={22} stroke={1.5} />
        </UnstyledButton>
      </Tooltip>
    ));

  const linksText = links
    .filter((d) => !d?.disabled)
    .map((link, index) => (
      <Link
        className={classes.link}
        data-active={link.link === activeSubLink || undefined}
        href="#"
        onClick={(event) => {
          event.preventDefault();
          setActiveSubLink(link.link);
          router.push(link.link);
        }}
        key={index}
        style={{ paddingLeft: 0 }}
      >
        {link.label}
      </Link>
    ));

  return { linksIcon, linksText };
};

// LastLinks Component
const LastLinks = ({
  links,
  activeMainLink,
  setActiveMainLink,
  setActiveSubLink,
  router,
}) => {
  return links.map((link, index) => (
    <Tooltip
      label={link.label}
      position="right"
      withArrow
      transitionProps={{ duration: 0 }}
      key={index}
    >
      <UnstyledButton
        onClick={() => {
          if (link?.label !== "Dark Mode") {
            setActiveMainLink(link.label);
            setActiveSubLink(link.link);
            router.push(link?.children[0]?.link);
          }
        }}
        className={classes.mainLink}
        data-active={link.label === activeMainLink || undefined}
      >
        <link.icon />
      </UnstyledButton>
    </Tooltip>
  ));
};

// WebSocketHandler Component
const WebSocketHandler = ({ data, error, setWsData, notifyWsMessages }) => {
  const connectionRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (data?.afterAuthId && !error) {
      if (connectionRef.current) {
        connectionRef.current.close();
        connectionRef.current = null;
      }

      const socket = new WebSocket(
        `${WA_INBOX_WEBSOCKET_CONNECTION_STRING}/${data?.afterAuthId}`,
      );
      connectionRef.current = socket;
      socket.onopen = () => {
        console.log("Connected to websocket");
      };

      socket.onmessage = (event) => {
        const newMessage: orgWsMessage = JSON.parse(event.data);
        setWsData(newMessage);
        notifyWsMessages(newMessage);
      };

      socket.onclose = () => {
        console.log("Disconnected from websocket");
        if (connectionRef.current === socket) connectionRef.current = null;
      };

      socket.onerror = () => {
        console.error("error in socket");
      };

      return () => {
        if (connectionRef.current === socket) {
          connectionRef.current.close();
          connectionRef.current = null;
        }
      };
    }
  }, [data?.afterAuthId]);

  return null;
};

// Navbar Component
const Navbar = ({
  mainLinks,
  activeMainLink,
  linksIcon,
  linksText,
  lastLinks,
  mobileOpened,
  toggleMobile,
  desktopOpened,
  toggleDesktop,
  largeScreen,
  isPending,
  user,
}) => {
  const updateUserStatus = useUpdateUserAvailabilityStatus();
  if (isPending) return <NavbarSkeleton />;
  return (
    <nav className={classes.navbar}>
      <div className={classes.wrapper}>
        <div className={classes.aside}>
          <div>
            <Stack gap={0} pb={"sm"}>
              <div className={classes.logo}>
                <HoverCard width={280} shadow="md">
                  <HoverCard.Target>
                    <Indicator
                      color={
                        user?.status === UserAvailabilityStatus.online
                          ? "#69f0ae"
                          : "#cacaca"
                      }
                      processing={
                        user?.status === UserAvailabilityStatus.online
                      }
                      size={8}
                    >
                      <Avatar
                        name={user?.orgName}
                        color="initials"
                        src={getFileUrlFromKey(user?.orgLogo)}
                      />
                    </Indicator>
                  </HoverCard.Target>
                  <HoverCard.Dropdown>
                    <Box>
                      <Text fw={500} size="sm" mb={"xs"}>
                        {user?.userName || "User"}
                      </Text>
                      <Box>
                        <Text size="xs" c="dimmed">
                          Email: {user?.email}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Org: {user?.orgName || "No organization"}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Role: {user?.role || "User"}
                        </Text>
                      </Box>
                    </Box>
                  </HoverCard.Dropdown>
                </HoverCard>
              </div>
              <Stack justify="center" align="center" gap={3} p={0}>
                <Switch
                  color={
                    user?.status === UserAvailabilityStatus.online
                      ? "#099268"
                      : "grey"
                  }
                  size="xs"
                  styles={{
                    track: {
                      backgroundColor:
                        user?.status === UserAvailabilityStatus.online &&
                        rgba("#099268", 0.15),
                      width: 40,
                    },
                    thumb: {
                      backgroundColor:
                        user?.status === UserAvailabilityStatus.online &&
                        "#099268",
                    },
                  }}
                  checked={user?.status === UserAvailabilityStatus.online}
                  onChange={(e) => {
                    if (e.currentTarget.checked) {
                      updateUserStatus.mutate({
                        status: UserAvailabilityStatus.online,
                      });
                    } else {
                      updateUserStatus.mutate({
                        status: UserAvailabilityStatus.offline,
                      });
                    }
                  }}
                />
                <Badge
                  w={50}
                  tt={"capitalize"}
                  color={
                    user?.status === UserAvailabilityStatus.online
                      ? "#099268"
                      : "grey"
                  }
                  radius={"xs"}
                  size={"xs"}
                  variant="light"
                >
                  {user?.status}
                </Badge>
              </Stack>
              <Divider />
            </Stack>
            <ScrollAreaAutosize mah={"calc(100dvh - 150px)"}>
              {mainLinks}
            </ScrollAreaAutosize>
          </div>
          <div>{lastLinks}</div>
        </div>

        {linksIcon?.length > 0 && (
          <div className={classes.main}>
            <Title order={5} className={classes.title}>
              <Group justify="space-between">
                {largeScreen
                  ? desktopOpened && activeMainLink
                  : mobileOpened && activeMainLink}
                <Burger
                  opened={mobileOpened}
                  onClick={toggleMobile}
                  hiddenFrom="sm"
                  size="sm"
                />
                <Burger
                  opened={desktopOpened}
                  onClick={toggleDesktop}
                  visibleFrom="sm"
                  size="sm"
                />
              </Group>
            </Title>
            <Flex gap={0}>
              <div>{linksIcon}</div>
              <Transition
                mounted={largeScreen ? desktopOpened : mobileOpened}
                transition="fade"
                duration={50}
                timingFunction="ease"
              >
                {(styles) => (
                  <div style={{ ...styles, flex: 1 }}>{linksText}</div>
                )}
              </Transition>
            </Flex>
          </div>
        )}
      </div>
    </nav>
  );
};

// MainContent Component
const MainContent = ({ children, appProps, navOpened, setNavOpened }) => {
  return (
    <motion.div className={styles["content-container"]}>
      <Flex className={`${styles["content-wrapper"]}`}>
        <NavControlContext.Provider value={{ navOpened, setNavOpened }}>
          <AnimatePresence key={appProps.router.pathname}>
            <motion.div
              className={styles["content-div"]}
              initial={
                !(
                  appProps.router.pathname.includes("login") ||
                  appProps.router.pathname.includes("signup")
                ) && { opacity: 0 }
              }
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </NavControlContext.Provider>
      </Flex>
    </motion.div>
  );
};

// @ts-ignore
export default function Layout({ children, appProps }) {
  const router = useRouter();
  const notifyWsMessages = useNotifyWsMessages();
  const isViewPortLEQ768px = useMediaQuery("(max-width: 768px)");
  const [navOpened, setNavOpened] = useState(true);
  const [userInfo, setUserInfo] = useLocalStorage<IUserInfoApiResponse | null>(
    "userInfo",
    null,
  );
  const { setUser } = useUser();
  const { setWsData } = useWsData();
  const queryClient = useQueryClient();
  const {
    isLoading: isLoadingUserInfo,
    data: userQueryData,
    refetch,
  } = useUserInfo();

  const { data, error } = useOrgWsAuthCheck();
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop, open }] = useDisclosure(false);
  const { data: sub, isPending } = useSubscription();
  const { translations } = useTranslations();
  const [navLinks, setNavLinks] = useState([]);
  const [lastLinksData, setLastLinksData] = useState([]);

  useEffect(() => {
    if (!isPending) {
      const [nLinks, lLinks] = getNavTopData(
        sub,
        translations,
        userInfo?.data?.role,
      );
      setNavLinks(nLinks);
      setLastLinksData(lLinks);
    }
  }, [isPending, sub, translations, userInfo?.data?.role]);

  if (router.query.msg === "welcome") {
    refetch();
  }

  useEffect(() => {
    if (userQueryData && "data" in userQueryData) {
      if (userQueryData?.data) {
        setUserInfo(userQueryData); // update localStorage
      }
      if (userQueryData?.data?.email && !userQueryData?.data?.orgId) {
        if (router.query.msg !== "welcome") {
          router.push("/signup?auth=google");
        }
      }
    } else if (userQueryData && "error" in userQueryData) {
      if (userQueryData?.error?.message === "Google User missing in Rateup") {
        console.error("Google User missing in Rateup");
        if (router.query.msg !== "welcome") {
          // welcome is to avoid repetition of push
          router.push("/signup?auth=google");
        }
      } else if (userQueryData?.error?.message === "User missing in Rateup") {
        console.error("User missing in Rateup");
        //TODO : handle case of email user missing signup in rateup db
      }
    }

    if (!userQueryData) {
      refetch();
    }
  }, [userQueryData]);

  useEffect(() => {
    setUser(userInfo?.data);

    if (userInfo?.data?.isOrgPaused)
      router.push(`/login/callback/paused?pausedby=rateup`);
    if (userInfo?.data?.isPaused)
      router.push(
        `/login/callback/paused?pausedby=${userInfo?.data?.pausedBy}`,
      );
    const shopifySetUpFinishRoute = localStorage.getItem(
      "shopify-auth-callback",
    );
    if (shopifySetUpFinishRoute) router.push(shopifySetUpFinishRoute);

    const shopifySubscriptionReturn = localStorage.getItem(
      "shopify-subscription-callback",
    );
    if (shopifySubscriptionReturn) router.push(shopifySubscriptionReturn);

    if (userInfo === null)
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
  }, [userInfo]);

  useEffect(() => {
    if (isViewPortLEQ768px && navOpened) {
      setNavOpened(false);
    } else {
      setNavOpened(true);
    }
  }, [isViewPortLEQ768px]);

  useEffect(() => {
    const handleRouteChange = (url, { shallow }) => {
      if (isViewPortLEQ768px && navOpened) {
        setNavOpened(false);
      }
    };

    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router, isViewPortLEQ768px, navOpened]);

  const [activeMainLink, setActiveMainLink] = useState("Home");
  const [activeSubLink, setActiveSubLink] = useState("/dashboard");

  const largeScreen = useMediaQuery("(min-width: 40em)");
  const tab = router.asPath;

  // Create linksMapping object from navLinks
  const linksMapping = [...navLinks, ...lastLinksData]?.reduce<
    Record<string, NavLinkItem[]>
  >((acc, link) => {
    acc[link.label] = link.children || [];
    return acc;
  }, {});

  useEffect(() => {
    Object.entries(linksMapping).find(([key, value]) => {
      const [basePath, queryString] = tab.split("?");
      const params = new URLSearchParams(queryString || "");
      const tabParam = params.get("tab");

      let navItem = value?.find((v) => {
        const [vBasePath, vQuery] = v.link.split("?");
        const vParams = new URLSearchParams(vQuery || "");
        const vTabParam = vParams.get("tab");

        const baseMatches = basePath.startsWith(vBasePath);
        const tabMatches = vTabParam ? vTabParam === tabParam : true;

        return baseMatches && tabMatches;
      });

      if (navItem) {
        setActiveMainLink(key);
        setActiveSubLink(navItem?.link);
      }
    });
  }, [linksMapping, navLinks, tab]);
  const { setTotalCount } = useChatContactCountStore();
  const { filter } = useChatFilterStore();
  const { data: inboxCount, refetch: refetchInboxCount } = useGetInboxUserCount(
    activeMainLink === "Inbox",
  );

  useEffect(() => {
    if (inboxCount) {
      const { assignedTeamWiseCount, ...rest } = inboxCount;
      if (filter.assignedTeams && filter.assignedTeams?.length) {
        setTotalCount({
          ...rest,
          assigned: assignedTeamWiseCount.reduce((count, t) => {
            count += filter.assignedTeams.includes(t.teamId)
              ? t.assignedCount
              : 0;
            return count;
          }, 0),
          assignedToMe: assignedTeamWiseCount.reduce((count, t) => {
            count += filter.assignedTeams.includes(t.teamId)
              ? t.assignedToMeCount
              : 0;
            return count;
          }, 0),
        });
      } else {
        setTotalCount(rest);
      }
    }
  }, [inboxCount, filter.assignedTeams]);

  const mainLinks = (
    <MainNavLinks
      links={navLinks}
      activeMainLink={activeMainLink}
      setActiveMainLink={setActiveMainLink}
      router={router}
      open={open}
      setActiveSubLink={setActiveSubLink}
    />
  );

  const { linksIcon, linksText } = SubNavLinks({
    links: linksMapping[activeMainLink] || [],
    activeSubLink,
    setActiveSubLink,
    router,
  });

  const lastLinks = (
    <LastLinks
      links={lastLinksData}
      activeMainLink={activeMainLink}
      setActiveMainLink={setActiveMainLink}
      setActiveSubLink={setActiveSubLink}
      router={router}
    />
  );

  return (
    <SessionReact.SessionAuth>
      <WebSocketHandler
        data={data}
        error={error}
        setWsData={setWsData}
        notifyWsMessages={notifyWsMessages}
      />

      <AppShell
        navbar={{
          width: {
            md: linksIcon?.length > 0 ? (desktopOpened ? 260 : 120) : 60,
            base: linksIcon?.length > 0 ? (mobileOpened ? 260 : 120) : 60,
          },
          breakpoint: "sm",
          collapsed: { mobile: !mobileOpened },
        }}
        padding="md"
        layout="alt"
      >
        <AppShell.Header>
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            hiddenFrom="sm"
            size="sm"
            p={"md"}
          />
        </AppShell.Header>

        <AppShell.Navbar>
          <Navbar
            mainLinks={mainLinks}
            activeMainLink={activeMainLink}
            linksIcon={linksIcon}
            linksText={linksText}
            lastLinks={lastLinks}
            mobileOpened={mobileOpened}
            toggleMobile={toggleMobile}
            desktopOpened={desktopOpened}
            toggleDesktop={toggleDesktop}
            largeScreen={largeScreen}
            isPending={isPending || isLoadingUserInfo}
            user={userInfo?.data}
          />
        </AppShell.Navbar>

        <AppShell.Main>
          <MainContent
            appProps={appProps}
            navOpened={navOpened}
            setNavOpened={setNavOpened}
          >
            {children}
          </MainContent>
        </AppShell.Main>
      </AppShell>
    </SessionReact.SessionAuth>
  );
}
