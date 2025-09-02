"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  Modal,
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
import { notifications } from "@mantine/notifications";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import SessionReact from "supertokens-auth-react/recipe/session";

import { WaMessageAssignStatus } from "@/types/enums";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useChatContactCountStore } from "@/app/dashboard/whatsapp/inbox/store";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useGetInboxUserCount } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useGetContactTags } from "@/backend/whatsapp/settings/waSettings.query";
import { TagsContext } from "@/context/TagsContext";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import {
  IUserInfoApiResponse,
  UserAvailabilityStatus,
} from "../../backend/user/user.api";
import {
  useUpdateUserAvailabilityStatus,
  useUserInfo,
} from "../../backend/user/user.query";
import { NavControlContext } from "../../context/NavControlContext";
import { useUser } from "../../context/UserContext";
import useLocalStorage from "../../hooks/localStorage";
import { useNotifyWsMessages } from "../../hooks/useNotifyWsMessages";
import { orgWsMessage } from "../../types/global";
import NavbarSkeleton from "../animation/skeleton/Navbar.Skeleton";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import { useChatFilterStore } from "../whatsapp/inbox/chatselect/chatFilter";
import classes from "./DoubleNavbar.module.css";
import styles from "./Layout.module.css";
import { getNavTopData } from "./Navbar/navbar.constants";

const showOfflineNotification = (status) => {
  if (status === UserAvailabilityStatus.offline) {
    notifications.show({
      color: "yellow",
      title: "You are offline",
      message:
        "You are currently offline. Please switch to online to continue.",
      withCloseButton: true,
      position: "top-center",
      id: "offline-notification",
    });
  }
};
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
  status,
  checkWhatsAppSettings,
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
          const isWhatsAppRoute = link.label.toLowerCase().includes("whatsapp");

          if (isWhatsAppRoute && !checkWhatsAppSettings()) {
            return; // Don't proceed if no WhatsApp settings
          }
          if (link.hasSubmenu && link.children?.length > 0) {
            setActiveMainLink(link.label);
            setActiveSubLink(link.children[0].link);
            showOfflineNotification(status);
            router.push(link.children[0].link);
            open();
          } else if (link.link && !link?.disabled) {
            setActiveMainLink(link.label);
            setActiveSubLink(link.link);
            showOfflineNotification(status);
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
  router,
  status,
  checkWhatsAppSettings,
  cTags,
}) => {
  // Handler for label filter click
  const chatFilterStore = useChatFilterStore();
  const handleLabelFilter = (labelName: string) => {
    // Update your filter state here
    chatFilterStore.setFilter({
      ...chatFilterStore.filter,
      labels: labelName ? [labelName] : [],
    });
  };

  // Find labels section if it exists
  const labelsSection = links.find((link) => link.label === "Labels");
  const regularLinks = links.filter((link) => link.label !== "Labels");

  // Create icon links for regular items
  const regularLinksIcons = regularLinks
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
            if (link.link) {
              setActiveSubLink(link.link);
              showOfflineNotification(status);
              router.push(link.link);
            }
          }}
          className={classes.link}
          data-active={link.link === activeSubLink || undefined}
          w={60}
        >
          <link.icon size={22} stroke={1.5} />
        </UnstyledButton>
      </Tooltip>
    ));

  // Create label icons if labels exist
  const labelIcons =
    labelsSection?.children?.map((label, index) => (
      <Tooltip
        label={label.label}
        position="right"
        withArrow
        transitionProps={{ duration: 0 }}
        key={`label-${index}`}
      >
        <UnstyledButton
          onClick={() =>
            index === 0 ? {} : handleLabelFilter(index === 1 ? "" : label.label)
          }
          className={classes.link}
          w={60}
          data-active={
            chatFilterStore.filter.labels.includes(label.label) || undefined
          }
        >
          {[0, 1].includes(index) ? (
            <label.icon
              size={22}
              stroke={1.5}
              cTags={cTags}
              className={"mx-auto"}
            />
          ) : (
            <div
              style={{
                width: 20,
                height: 20,
                marginLeft: 4,
                borderRadius: "50%",
                backgroundColor: label.color || "#5c7cfa",
              }}
            />
          )}
        </UnstyledButton>
      </Tooltip>
    )) || [];

  // Combine all icon links, with divider if labels exist
  const linksIcon =
    labelsSection?.children?.length > 0
      ? [
          ...regularLinksIcons,
          <Divider key="label-divider" my="xs" />,
          ...labelIcons,
        ]
      : regularLinksIcons;

  // Create text links (similar approach as icons)
  const regularLinksText = regularLinks
    .filter((d) => !d?.disabled)
    .map((link, index) => (
      <Link
        className={classes.link}
        data-active={link.link === activeSubLink || undefined}
        href="#"
        onClick={(event) => {
          event.preventDefault();
          if (link.link?.includes("/whatsapp") && !checkWhatsAppSettings()) {
            return;
          }
          setActiveSubLink(link.link);
          router.push(link.link);
        }}
        key={index}
        style={{ paddingLeft: 0 }}
      >
        {link.label}
      </Link>
    ));

  // Create label text links
  const labelTexts =
    labelsSection?.children?.map((label, index) => (
      <Link
        className={classes.link}
        href="#"
        onClick={(event) => {
          event.preventDefault();
          handleLabelFilter(index === 0 ? "" : label.label);
        }}
        key={`label-text-${index}`}
        data-active={
          chatFilterStore.filter.labels.includes(label.label) || undefined
        }
        style={{ paddingLeft: 0, height: 44 }}
      >
        <Flex align="center" gap="xs">
          {label.label}
        </Flex>
      </Link>
    )) || [];

  // Combine all text links with divider if labels exist
  const linksText =
    labelsSection?.children?.length > 0
      ? [
          ...regularLinksText,
          <Divider key="label-text-divider" my="9.5" />,
          ...labelTexts,
        ]
      : regularLinksText;

  return { linksIcon, linksText };
};

// LastLinks Component
const LastLinks = ({
  links,
  activeMainLink,
  setActiveMainLink,
  setActiveSubLink,
  router,
  status,
  checkWhatsAppSettings,
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
          if (link?.label !== "Dark Mode" && link?.label !== "Notifications") {
            // Check if it's a WhatsApp related route
            const isWhatsAppRoute = link?.children?.some((child) =>
              child.link.includes("/whatsapp"),
            );

            if (isWhatsAppRoute && !checkWhatsAppSettings()) {
              return; // Don't proceed if no WhatsApp settings
            }

            setActiveMainLink(link.label);
            setActiveSubLink(link.link);
            showOfflineNotification(status);
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
export const handleWebSocketMessage = ({
  newMessagePayload,
  queryClient,
}: {
  newMessagePayload: orgWsMessage;
  queryClient: QueryClient;
}) => {
  if (newMessagePayload.type !== "inbox") return;

  const newMessage = newMessagePayload.inbox.message;
  const contact = newMessagePayload.inbox.contact;
  const contactId = contact.id;

  const urlContactId = new URLSearchParams(window.location?.search)?.get(
    "contactId",
  );
  const urlTab = new URLSearchParams(window.location?.search)?.get("tab");
  const waMessageAssignStatus = contact.waMessageAssignStatus;
  const blockedOnWhatsApp = contact.blockedOnWhatsApp;

  // Only update contact list if tab matches relevant status
  const tabMatches =
    urlTab &&
    (["New", "All", "Sent"].includes(urlTab) ||
      (urlTab === "UnAssigned" &&
        waMessageAssignStatus === WaMessageAssignStatus.UNASSIGNED) ||
      (urlTab === "Assigned" &&
        waMessageAssignStatus === WaMessageAssignStatus.ASSIGNED) ||
      (urlTab === "Closed" &&
        waMessageAssignStatus === WaMessageAssignStatus.CLOSED) ||
      (urlTab === "blocked" && blockedOnWhatsApp));

  if (tabMatches) {
    queryClient.setQueriesData(
      { queryKey: ["contacts", "filtered"], exact: false },
      (old: any) => {
        if (!old || !Array.isArray(old.pages)) return old;

        let contactFound = false;
        const updatedPages = old.pages.map((page) => {
          const updatedRows = (page.rows ?? []).map((row) => {
            if (row.id === contactId) {
              contactFound = true;
              return {
                ...row,
                lastMessage: newMessage,
                lastReceivedMessageTimeStamp: newMessage.waCreatedAt,
              };
            }
            return row;
          });
          return { ...page, rows: updatedRows };
        });

        // If contact not found, add to first page or create new page
        if (!contactFound) {
          const newContactRow = {
            id: contactId,
            lastMessage: newMessage,
            lastReceivedMessageTimeStamp: newMessage.waCreatedAt,
            name: contact.name,
            phone: contact.phone,
          };
          if (updatedPages.length > 0) {
            updatedPages[0] = {
              ...updatedPages[0],
              rows: [newContactRow, ...(updatedPages[0].rows ?? [])],
            };
          } else {
            updatedPages.push({ rows: [newContactRow] });
          }
        }

        return { ...old, pages: updatedPages };
      },
    );
  } else if (urlTab === "AssignedToMe") {
    queryClient.invalidateQueries({
      queryKey: ["contacts", "filtered"],
      exact: false,
    });
  }

  if (!urlContactId || urlContactId !== contactId) return;

  // Update wa-messages only if first message differs
  queryClient.setQueriesData(
    { queryKey: ["wa-messages", contactId], exact: false },
    (old: any) => {
      if (!old) return old;

      const firstMessage = old.pages?.[0]?.messages?.[0];
      if (firstMessage?.messageId === newMessage.messageId) return old;

      const updatedFirstPage = {
        ...(old?.pages?.[0] ?? {}),
        messages: [newMessage, ...(old?.pages?.[0]?.messages ?? [])],
      };

      return {
        ...old,
        pages: [updatedFirstPage, ...(old?.pages?.slice(1) ?? [])],
      };
    },
  );
};

// WebSocketHandler Component
const WebSocketHandler = () => {
  useChatSocket();
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
  const [status, setStatus] = useState(user?.status);
  useEffect(() => {
    if (status !== user?.status) {
      updateUserStatus.mutate({
        status,
      });
    }
  }, [status]);

  useEffect(() => {
    if (user?.status && user?.status !== status) {
      setStatus(user?.status);
    }
  }, [user]);
  if (isPending) return <NavbarSkeleton />;
  return (
    <nav className={classes.navbar}>
      <div className={classes.wrapper}>
        <div className={classes.aside}>
          <div>
            <Stack gap={0} pb={"sm"}>
              <div className={classes.logo}>
                <HoverCard width={280} shadow="md" position="right-end">
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
                    status === UserAvailabilityStatus.online
                      ? "#099268"
                      : "grey"
                  }
                  size="xs"
                  styles={{
                    track: {
                      backgroundColor:
                        status === UserAvailabilityStatus.online &&
                        rgba("#099268", 0.15),
                      width: 40,
                    },
                    thumb: {
                      backgroundColor:
                        status === UserAvailabilityStatus.online && "#099268",
                    },
                  }}
                  checked={status === UserAvailabilityStatus.online}
                  onChange={(e) => {
                    setStatus(
                      e.currentTarget.checked
                        ? UserAvailabilityStatus.online
                        : UserAvailabilityStatus.offline,
                    );
                  }}
                />
                <Badge
                  w={50}
                  tt={"capitalize"}
                  color={
                    status === UserAvailabilityStatus.online
                      ? "#099268"
                      : "grey"
                  }
                  radius={"xs"}
                  size={"xs"}
                  variant="light"
                >
                  {status}
                </Badge>
              </Stack>
              <Divider />
            </Stack>
            <ScrollAreaAutosize mah={"calc(100dvh - 300px)"} scrollbarSize={6}>
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
              <ScrollAreaAutosize mah={"calc(100dvh - 80px)"} scrollbarSize={6}>
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
              </ScrollAreaAutosize>
            </Flex>
          </div>
        )}
      </div>
    </nav>
  );
};

// WhatsApp Settings Modal Component
const WhatsAppSettingsModal = ({ opened, onClose, onGoToSettings }) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="WhatsApp Account Required"
      centered
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm">
          You don&apos;t have any WhatsApp account configured. Please set up
          your WhatsApp account to access this feature.
        </Text>
        <Group justify="flex-end" gap="sm">
          <RateupButtonPrimary
            title="Cancel"
            variant="default"
            onClick={onClose}
          />
          <RateupButtonPrimary
            onClick={onGoToSettings}
            title="Go to WhatsApp Settings"
          />
        </Group>
      </Stack>
    </Modal>
  );
};

// MainContent Component
const MainContent = ({
  children,
  appProps,
  navOpened,
  setNavOpened,
  cTags,
}) => {
  return (
    <motion.div className={styles["content-container"]}>
      <Flex className={`${styles["content-wrapper"]}`}>
        <TagsContext.Provider value={{ tags: cTags }}>
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
        </TagsContext.Provider>
      </Flex>
    </motion.div>
  );
};

// @ts-ignore
export default function Layout({ children }) {
  const router = useRouter();
  const query = useSearchParams() as {
    msg?: string;
    tab?: string;
  };
  const pathname = usePathname();
  const fullPath = query.toString()
    ? `${pathname}?${query.toString()}`
    : pathname;
  const notifyWsMessages = useNotifyWsMessages();
  const isViewPortLEQ768px = useMediaQuery("(max-width: 768px)");
  const [navOpened, setNavOpened] = useState(true);
  const [userInfo, setUserInfo] = useLocalStorage<IUserInfoApiResponse | null>(
    "userInfo",
    null,
  );

  const { setUser } = useUser();
  const queryClient = useQueryClient();
  const {
    isPending: isLoadingUserInfo,
    data: userQueryData,
    refetch,
  } = useUserInfo();

  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop, open }] = useDisclosure(false);
  const { data: sub, isPending } = useSubscription();
  const { isPending: isPendingCTags, data: cTags } = useGetContactTags();

  const translations = useTranslations();
  const [navLinks, setNavLinks] = useState([]);
  const [lastLinksData, setLastLinksData] = useState([]);
  const [whatsAppModalOpened, setWhatsAppModalOpened] = useState(false);
  const isLoading = isPending || isPendingCTags || isLoadingUserInfo;
  // Fetch inbox labels from DB
  // const { data: inboxLabelsData } = useGetInboxLabels();

  useEffect(() => {
    if (!isLoading) {
      const inboxLabels = cTags?.inboxLabels || [];
      const [nLinks, lLinks] = getNavTopData(
        sub,
        translations,
        userInfo?.data?.role,
        inboxLabels, // pass dynamic labels
      );
      setNavLinks(nLinks);
      setLastLinksData(lLinks);
    }
  }, [isLoading, sub, translations, userInfo?.data?.role, cTags]);

  if (query.msg === "welcome") {
    refetch();
  }

  useEffect(() => {
    if (userQueryData && "data" in userQueryData) {
      if (userQueryData?.data) {
        setUserInfo(userQueryData); // update localStorage
      }
      if (userQueryData?.data?.email && !userQueryData?.data?.orgId) {
        if (query?.msg !== "welcome") {
          router.push("/signup?auth=google");
        }
      }
    } else if (userQueryData && "error" in userQueryData) {
      if (userQueryData?.error?.message === "Google User missing in Rateup") {
        console.error("Google User missing in Rateup");
        if (query?.msg !== "welcome") {
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

  const [activeMainLink, setActiveMainLink] = useState("Home");
  const [activeSubLink, setActiveSubLink] = useState("/dashboard");

  const largeScreen = useMediaQuery("(min-width: 40em)");

  // Create linksMapping object from navLinks
  const linksMapping = [...navLinks, ...lastLinksData]?.reduce<
    Record<string, NavLinkItem[]>
  >((acc, link) => {
    acc[link.label] = link.children || [];
    return acc;
  }, {});

  // On reload, set active main/sub link based on route
  useEffect(() => {
    if (!pathname) return;
    let found = false;
    Object.entries(linksMapping).forEach(([mainLabel, children]) => {
      children.forEach((child) => {
        if (child.link && fullPath.startsWith(child.link)) {
          setActiveMainLink(mainLabel);
          setActiveSubLink(child.link);
          found = true;
        }
      });
    });
    // If no child matches, check main links
    if (!found) {
      navLinks.forEach((main) => {
        if (main.link && pathname.startsWith(main.link.split("?")[0])) {
          setActiveMainLink(main.label);
          setActiveSubLink(main.link);
        }
      });
    }
  }, [fullPath, linksMapping, navLinks, pathname]);

  const { setTotalCount } = useChatContactCountStore();
  const { filter } = useChatFilterStore();
  const { data: inboxCount } = useGetInboxUserCount(activeMainLink === "Inbox");

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

  // Function to check if user has WhatsApp settings
  const checkWhatsAppSettings = () => {
    // Add your logic here to check if user has WhatsApp settings
    // This could be checking userInfo data or making an API call
    // For now, returning false to demonstrate the modal
    if (userInfo?.message !== "Success") return false;
    const hasWhatsAppSettings = userInfo?.data?.hasWhatsAppSettings || false;

    if (!hasWhatsAppSettings) {
      setWhatsAppModalOpened(true);
      return false;
    }
    return true;
  };

  const handleGoToWhatsAppSettings = () => {
    setWhatsAppModalOpened(false);
    router.push("/dashboard/whatsapp/settings");
  };

  const mainLinks = (
    <MainNavLinks
      links={navLinks}
      activeMainLink={activeMainLink}
      setActiveMainLink={setActiveMainLink}
      router={router}
      open={open}
      setActiveSubLink={setActiveSubLink}
      status={userInfo?.data?.status || UserAvailabilityStatus.offline}
      checkWhatsAppSettings={checkWhatsAppSettings}
    />
  );

  const { linksIcon, linksText } = SubNavLinks({
    links: linksMapping[activeMainLink] || [],
    activeSubLink,
    setActiveSubLink,
    router,
    status: userInfo?.data?.status || UserAvailabilityStatus.offline,
    checkWhatsAppSettings,
    cTags,
  });

  const lastLinks = (
    <LastLinks
      links={lastLinksData}
      activeMainLink={activeMainLink}
      setActiveMainLink={setActiveMainLink}
      setActiveSubLink={setActiveSubLink}
      router={router}
      status={userInfo?.data?.status || UserAvailabilityStatus.offline}
      checkWhatsAppSettings={checkWhatsAppSettings}
    />
  );
  if (!pathname) return null;

  return (
    <SessionReact.SessionAuth>
      <WebSocketHandler />

      <WhatsAppSettingsModal
        opened={whatsAppModalOpened}
        onClose={() => setWhatsAppModalOpened(false)}
        onGoToSettings={handleGoToWhatsAppSettings}
      />

      <AppShell
        navbar={{
          width: {
            sm: linksIcon?.length > 0 ? (desktopOpened ? 260 : 120) : 60,
            base: linksIcon?.length > 0 ? (mobileOpened ? 260 : 120) : 60,
          },
          breakpoint: "sm",
          collapsed: { mobile: !mobileOpened },
        }}
        header={{
          height: {
            sm: 0,
            base: 40,
          },
        }}
        padding="xs"
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
            appProps={{
              router: {
                pathname: pathname,
              },
            }}
            navOpened={navOpened}
            setNavOpened={setNavOpened}
            cTags={cTags}
          >
            {children}
          </MainContent>
        </AppShell.Main>
      </AppShell>
    </SessionReact.SessionAuth>
  );
}
