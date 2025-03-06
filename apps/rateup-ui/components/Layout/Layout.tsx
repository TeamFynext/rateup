import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import {
  Anchor,
  AppShell,
  Avatar,
  Box,
  Burger,
  Flex,
  Group,
  HoverCard,
  Image,
  ScrollAreaAutosize,
  Text,
  Title,
  Tooltip,
  Transition,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconLogout } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";

import { useSubscription } from "@/backend/subscription/subscription.query";
import useTranslations from "@/dictionaries/useTranslation";

import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "../../backend/org/ws/org.ws.api";
import { useOrgWsAuthCheck } from "../../backend/org/ws/org.ws.query";
import { IUserInfoApiResponse } from "../../backend/user/user.api";
import { useUserInfo } from "../../backend/user/user.query";
import { NavControlContext } from "../../context/NavControlContext";
import { useUser, useWsData } from "../../context/UserContext";
import useLocalStorage from "../../hooks/localStorage";
import { useNotifyWsMessages } from "../../hooks/useNotifyWsMessages";
import { orgWsMessage } from "../../types/global";
import NavbarSkeleton from "../animation/skeleton/Navbar.Skeleton";
import ExpiryComponent from "../Premium/ExpiryComponent";
import SessionAuth from "../SuperToken/SessionAuth";
import ColorSchemaButton from "../theme/ColorSchemaButton";
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

// LogoutButton Component
const LogoutButton = ({ onClick }) => {
  return <IconLogout onClick={onClick} size={22} stroke={1.5} />;
};

// MainNavLinks Component
const MainNavLinks = ({ links, activeMainLink, setActiveMainLink, router }) => {
  return links.map((link) => (
    <Tooltip
      label={link.label}
      position="right"
      withArrow
      transitionProps={{ duration: 0 }}
      key={link.label}
    >
      <UnstyledButton
        onClick={() => {
          setActiveMainLink(link.label);
          if (link.link) {
            router.push(link.link);
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
const SubNavLinks = ({
  links,
  activeSubLink,
  setActiveSubLink,
  setActiveSubLabel,
  router,
}) => {
  const linksIcon = links
    .filter((d) => !d?.disabled)
    .map((link) => (
      <Tooltip
        label={link.label}
        position="right"
        withArrow
        transitionProps={{ duration: 0 }}
        key={link.label}
      >
        <UnstyledButton
          onClick={() => {
            setActiveSubLink(link.link);
            setActiveSubLabel(link?.label);
            router.push(link.link);
          }}
          className={classes.link}
          data-active={link.link === activeSubLink || undefined}
          w={60}
        >
          <Box h={35} w={22} mx={"auto"}>
            <link.icon size={22} stroke={1.5} />
          </Box>
        </UnstyledButton>
      </Tooltip>
    ));

  const linksText = links
    .filter((d) => !d?.disabled)
    .map((link) => (
      <a
        className={classes.link}
        data-active={link.link === activeSubLink || undefined}
        href="#"
        onClick={(event) => {
          event.preventDefault();
          setActiveSubLink(link.link);
          setActiveSubLabel(link?.label);
          router.push(link.link);
        }}
        key={link.label}
        style={{ paddingLeft: 0 }}
      >
        {link.label}
      </a>
    ));

  return { linksIcon, linksText };
};

// LastLinks Component
const LastLinks = ({ links }) => {
  return links.map((link) => (
    <Tooltip
      label={link.label}
      position="right"
      withArrow
      transitionProps={{ duration: 0 }}
      key={link.label}
    >
      <UnstyledButton className={classes.mainLink}>
        <link.icon />
      </UnstyledButton>
    </Tooltip>
  ));
};

// WebSocketHandler Component
const WebSocketHandler = ({ data, error, setWsData, notifyWsMessages }) => {
  const connectionRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (data && !error) {
      connectionRef.current = new WebSocket(
        `${WA_INBOX_WEBSOCKET_CONNECTION_STRING}/${data?.afterAuthId}`,
      );

      connectionRef.current.onopen = () => {
        console.log("Connected to websocket");
      };

      connectionRef.current.onmessage = (event) => {
        const newMessage: orgWsMessage = JSON.parse(event.data);
        setWsData(newMessage);
        notifyWsMessages(newMessage);
      };

      connectionRef.current.onclose = () => {
        console.log("Disconnected from websocket");
      };

      return () => {
        connectionRef.current?.close();
      };
    }
  }, [data, setWsData, notifyWsMessages]);

  return null;
};

// Navbar Component
const Navbar = ({
  mainLinks,
  activeMainLink,
  linksIcon,
  linksText,
  lastLinks,
  activeSubLabel,
  mobileOpened,
  toggleMobile,
  desktopOpened,
  toggleDesktop,
  largeScreen,
  isPending,
  user,
}) => {
  if (isPending) return <NavbarSkeleton />;
  let localImagesPath = "http://localhost:3000/images";
  return (
    <nav className={classes.navbar}>
      <div className={classes.wrapper}>
        <div className={classes.aside}>
          <div>
            <div className={classes.logo}>
              <HoverCard width={280} shadow="md">
                <HoverCard.Target>
                  <Avatar
                    name={user?.userName}
                    color="initials"
                    src={user?.profilePhoto}
                  />
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
            <ScrollAreaAutosize mah={"calc(100dvh - 150px)"}>
              {mainLinks}
            </ScrollAreaAutosize>
          </div>
          <div>{lastLinks}</div>
        </div>

        {linksIcon?.length > 0 && (
          <div className={classes.main}>
            <Title order={4} className={classes.title}>
              <Group justify="space-between">
                {largeScreen
                  ? desktopOpened && activeSubLabel
                  : mobileOpened && activeSubLabel}
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
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(false);
  const { data: sub, isPending } = useSubscription();
  const { translations } = useTranslations();
  const [navLinks, setNavLinks] = useState([]);

  const lastLinksData = [
    ...(process.env.NEXT_PUBLIC_EXPERIMENT
      ? [{ icon: ColorSchemaButton, label: "Dark Mode" }]
      : []),
    {
      icon: () => <LogoutButton onClick={() => router.push("/logout")} />,
      label: "Logout",
    },
  ];

  useEffect(() => {
    if (!isPending) {
      setNavLinks(getNavTopData(sub, translations));
    }
  }, [isPending, sub, translations]);

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
  const [activeSubLabel, setActiveSubLabel] = useState("dashboard");

  const largeScreen = useMediaQuery("(min-width: 40em)");
  const tab = router.asPath;

  // Create linksMapping object from navLinks
  const linksMapping = navLinks.reduce<Record<string, NavLinkItem[]>>(
    (acc, link) => {
      acc[link.label] = link.children || [];
      return acc;
    },
    {},
  );

  useEffect(() => {
    Object.entries(linksMapping).find(([key, value]) => {
      let a = value?.find((v) => v.link === tab);
      if (a) {
        setActiveMainLink(key);
        setActiveSubLink(a?.link);
        setActiveSubLabel(a?.label);
      }
    });
  }, [navLinks]);

  const mainLinks = (
    <MainNavLinks
      links={navLinks}
      activeMainLink={activeMainLink}
      setActiveMainLink={setActiveMainLink}
      router={router}
    />
  );

  const { linksIcon, linksText } = SubNavLinks({
    links: linksMapping[activeMainLink] || [],
    activeSubLink,
    setActiveSubLink,
    setActiveSubLabel,
    router,
  });

  const lastLinks = <LastLinks links={lastLinksData} />;

  return (
    <SessionAuth>
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
            activeSubLabel={activeSubLabel}
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
    </SessionAuth>
  );
}
