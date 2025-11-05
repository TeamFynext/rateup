"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  AppShell,
  // Badge,
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
  Text,
  Title,
  Tooltip,
  Transition,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LogOut,
  Megaphone,
  MessageCircle,
  PanelLeft,
  PanelLeftClose,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import SessionReact from "supertokens-auth-react/recipe/session";

import { WaMessageAssignStatus } from "@/types/enums";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useChatContactCountStore } from "@/app/dashboard/inbox/store";
import { useCustomFields } from "@/backend/campaign/contacts/contacts.query";
import { useLabelsQuery } from "@/backend/label/label.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useGetInboxUserCount } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { CustomFieldsProvider } from "@/context/CustomFieldsContext";
import { LabelsContext } from "@/context/LabelsContext";
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
import ColorSchemaButton from "../theme/ColorSchemaButton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import CustomTooltip from "../ui/custom/CustomTooltip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";
import { useChatFilterStore } from "../whatsapp/inbox/chatselect/chatFilter";
import classes from "./DoubleNavbar.module.css";
import styles from "./Layout.module.css";
import { getNavTopData } from "./Navbar/navbar.constants";
import NotificationBellIcon from "./Notification";
import TopNavbar from "./TopLayout";

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
  return links.map((link, index) => {
    const LinkIcon = link.icon;
    return (
      <CustomTooltip
        key={index}
        trigger={
          <Button
            variant={link.label === activeMainLink ? "default" : "ghost"}
            className="w-full mb-2 p-2"
            onClick={() => {
              const isWhatsAppRoute = link.label
                .toLowerCase()
                .includes("whatsapp");
              if (
                isWhatsAppRoute &&
                !checkWhatsAppSettings(link?.children?.[0]?.link)
              ) {
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
          >
            <LinkIcon className={`!w-6 !h-5`} />
          </Button>
        }
        content={<p>{link.label}</p>}
        side="right"
      />
    );
  });
};

// SubNavLinks Component
const SubNavLinks = ({
  links,
  activeSubLink,
  setActiveSubLink,
  router,
  status,
  checkWhatsAppSettings,
  labels,
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
  const handleAddLabel = () => {
    modals.openContextModal({
      modal: "addLabelModal",
      title: "Add Label",
      centered: true,
      innerProps: {},
    });
  };

  // Find labels section if it exists
  const labelsSection = links.find((link) => link.label === "Labels");
  const regularLinks = links.filter((link) => link.label !== "Labels");
  const [isLifecycleOpen, setIsLifecycleOpen] = useState(true);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
  const filter = useChatFilterStore.getState().filter;
  const setFilter = useChatFilterStore.getState().setFilter;

  // Create icon links for regular items
  const regularLinksIcons = regularLinks
    .filter((d) => !d?.disabled)
    .map((link, index) => {
      const LinkIcon = link.icon;
      return (
        <CustomTooltip
          trigger={
            <div className="relative">
              <Button
                variant={link.link === activeSubLink ? "secondary" : "ghost"}
                onClick={(event) => {
                  event.preventDefault();
                  if (
                    link.link?.includes("/whatsapp") &&
                    !checkWhatsAppSettings(link?.link)
                  ) {
                    return;
                  }
                  handleLabelFilter(""); // Clear label filter on regular link click
                  setActiveSubLink(link.link);
                  router.push(link.link);
                }}
                className="h-9 w-full mb-2"
              >
                <LinkIcon className="w-5 h-5" />
              </Button>
              {link?.count > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full px-1 text-[10px] font-medium">
                  {link?.count > 9 ? "9+" : link?.count}
                </span>
              )}
            </div>
          }
          content={<p>{link.label}</p>}
          side="right"
          key={link.label}
        />
      );
    });

  // Create label icons if labels exist
  const labelIcons =
    labelsSection?.children?.map((label, index) => (
      <CustomTooltip
        key={`${label}-${index}`}
        trigger={
          <Button
            className="h-9 w-9 mb-2"
            onClick={() => handleLabelFilter(label?.value)}
            variant={
              chatFilterStore.filter.labels.includes(label?.value)
                ? "secondary"
                : "ghost"
            }
          >
            <p className="text-center text-xs">{label.emoji}</p>
          </Button>
        }
        content={<p>{label.label}</p>}
        side="right"
      />
    )) || [];

  const inboxCategories = [
    { id: "conversation", label: "Conversations", icon: MessageCircle },
    { id: "campaign", label: "Campaigns", icon: Megaphone },
    { id: "automation", label: "Automation", icon: Bot },
  ];

  const categoryIcons = inboxCategories.map((category) => {
    const CategoryIcon = category?.icon;
    return (
      <CustomTooltip
        trigger={
          <Button
            variant={filter.category === category.id ? "secondary" : "ghost"}
            className="h-9 w-full mb-2"
            onClick={() => {
              setFilter({
                ...filter,
                category:
                  filter.category === category.id ? null : (category.id as any),
              });
            }}
          >
            <CategoryIcon className="w-5 h-5" />
          </Button>
        }
        content={<p>{category.label}</p>}
        side="right"
        key={category.id}
      />
    );
  });
  // Combine all icon links, with divider if labels exist
  const linksIcon =
    labelsSection?.children?.length > 0
      ? [
          ...regularLinksIcons,
          <Divider key="category-divider" my="xs" mr={"xs"} />,
          ...categoryIcons,
          <Divider key="label-divider" my="xs" mr={"xs"} />,
          ...labelIcons,
        ]
      : regularLinksIcons;

  // Create text links (similar approach as icons)
  const regularLinksText = regularLinks
    .filter((d) => !d?.disabled)
    .map((link, index) => {
      const LinkIcon = link.icon;
      return (
        <Button
          className="w-full my-1"
          variant={link.link === activeSubLink ? "secondary" : "ghost"}
          key={link.link}
          onClick={(event) => {
            event.preventDefault();
            if (
              link.link?.includes("/whatsapp") &&
              !checkWhatsAppSettings(link?.link)
            ) {
              return;
            }
            handleLabelFilter(""); // Clear label filter on regular link click
            setActiveSubLink(link.link);
            router.push(link.link);
          }}
        >
          <div className="flex justify-between w-full">
            <div className="flex gap-2 items-center">
              <LinkIcon className="w-5 h-5" />
              <span className="text-sm font-medium">{link.label}</span>
            </div>
            {link?.count > 0 && (
              <Badge variant="secondary">{link?.count}</Badge>
            )}
          </div>
        </Button>
      );
    });

  // Create label text links
  const labelTexts =
    labelsSection?.children?.map((label, index) => (
      <Button
        onClick={(event) => {
          event.preventDefault();
          handleLabelFilter(label?.value);
        }}
        className="w-full my-1"
        variant={
          chatFilterStore.filter.labels.includes(label?.value)
            ? "secondary"
            : "ghost"
        }
        key={`${label.label}-${index}`}
      >
        <div className="flex justify-between w-full">
          <div className="flex gap-2 items-center">
            <span className="text-sm">{label.emoji}</span>
            <span className="text-sm font-medium">{label.label}</span>
          </div>
          {label?.count > 0 && (
            <Badge variant="secondary">{label?.count}</Badge>
          )}
        </div>
      </Button>
    )) || [];

  const Categories = () => (
    <Collapsible open={isCategoriesOpen} onOpenChange={setIsCategoriesOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between text-sm h-9 px-2"
        >
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Categories
          </span>
          {isCategoriesOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 pt-1">
        {inboxCategories.map((category) => (
          <Button
            key={category.id}
            variant={filter.category === category.id ? "secondary" : "ghost"}
            className="w-full justify-start text-sm h-9"
            onClick={() => {
              setFilter({
                ...filter,
                category:
                  filter.category === category.id ? null : (category.id as any),
              });
            }}
          >
            <div className="flex gap-2 items-center">
              <category.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{category.label}</span>
            </div>
            {/* {category?.count > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {category?.count}
              </Badge>
            )} */}
          </Button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
  const LifeCycleLabel = () => (
    <Collapsible open={isLifecycleOpen} onOpenChange={setIsLifecycleOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between text-sm h-9 px-2"
        >
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Lifecycle
          </span>
          {isLifecycleOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 pt-1">
        {...labelTexts}
      </CollapsibleContent>
    </Collapsible>
  );
  // Combine all text links with divider if labels exist
  const linksText =
    labelsSection?.children?.length > 0
      ? [
          ...regularLinksText,
          <Divider key="label-text-divider" my="9.5" />,
          <Categories key={"categories"} />,
          <Divider key="categories-text-divider" my="9.5" />,
          <LifeCycleLabel key={"lifecycles"} />,
        ]
      : regularLinksText;

  return { linksIcon, linksText };
};

// LastLinks Component
// const LastLinks = ({
//   links,
//   activeMainLink,
//   setActiveMainLink,
//   setActiveSubLink,
//   router,
//   status,
// }) => {
//   return links.map((link, index) => (
//     <Tooltip
//       label={link.label}
//       position="right"
//       withArrow
//       transitionProps={{ duration: 0 }}
//       key={index}
//     >
//       <UnstyledButton
//         onClick={() => {
//           if (link?.label !== "Dark Mode" && link?.label !== "Notifications") {
//             setActiveMainLink(link.label);
//             setActiveSubLink(link.link);
//             showOfflineNotification(status);
//             // router.push(link?.children[0]?.link);
//             if (link?.link) {
//               router.push(link?.link);
//             } else {
//               router.push(link?.children[0]?.link);
//             }
//           }
//         }}
//         className={classes.mainLink}
//         data-active={link.label === activeMainLink || undefined}
//       >
//         <link.icon size={22} stroke={1.5} />
//       </UnstyledButton>
//     </Tooltip>
//   ));
// };
export const handleWebSocketMessage = ({
  newMessagePayload,
  queryClient,
  userId,
}: {
  newMessagePayload: orgWsMessage;
  queryClient: QueryClient;
  userId: string | undefined;
}) => {
  // Handle WhatsApp message status update
  if (newMessagePayload.type === "message_status_update") {
    const { message_status_update } = newMessagePayload;
    queryClient.setQueriesData(
      {
        queryKey: ["wa-messages", message_status_update?.contactId],
        exact: false,
      },
      (old: any) => {
        if (!old) return old;
        // Update the stats for the matching messageId
        return {
          ...old,
          pages: (old.pages ?? []).map((page) => ({
            ...page,
            messages: (page.messages ?? []).map((msg) =>
              msg.messageId === message_status_update.messageId
                ? { ...msg, stats: message_status_update.stats }
                : msg,
            ),
          })),
        };
      },
    );
    return;
  }

  // Only handle inbox type
  if (newMessagePayload.type !== "inbox") return;

  const { inbox } = newMessagePayload;
  const { message: newMessage, contact } = inbox;
  const contactId = contact.id;

  const urlParams = new URLSearchParams(window.location?.search);
  const urlContactId = urlParams.get("contactId");
  const urlTab = urlParams.get("tab");
  // If tab is "mine" and user is not assigned, ignore
  if (
    urlTab === "mine" &&
    !contact?.waInboxAssign?.some((assign) => assign.assignedUser.id === userId)
  )
    return;

  // Update filtered contacts list if tab is present
  if (urlTab) {
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
                lastReceivedMessageTimeStamp:
                  contact.lastReceivedMessageTimeStamp,
                waMessageAssignStatus: contact.waMessageAssignStatus,
                assignedUsers: contact.waInboxAssign?.map((assign) => ({
                  id: assign.assignedUser.id,
                  name: assign.assignedUser.name,
                })),
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
            lastReceivedMessageTimeStamp: contact.lastReceivedMessageTimeStamp,
            name: contact.name,
            phone: contact.phone,
            waMessageAssignStatus: contact.waMessageAssignStatus,

            assignedUsers: contact.waInboxAssign?.map((assign) => ({
              id: assign.assignedUser.id,
              name: assign.assignedUser.name,
            })),
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
  }

  // Only update wa-messages if viewing the correct contact
  if (!urlContactId || urlContactId !== contactId) return;

  queryClient.setQueriesData(
    { queryKey: ["wa-messages", contactId], exact: false },
    (old: any) => {
      if (!old) return old;
      const firstMessage = old.pages?.[0]?.messages?.[0];
      // Avoid duplicate if already present
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
  mainNavLinks,
  activeMainLink,
  linksIcon,
  linksText,
  // lastLinks,
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
  const [opened, setOpened] = useState(false);
  const [openLogoutModal, setOpenLogoutModal] = useState(false);
  const translations = useTranslations();
  const router = useRouter();
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
  const mainNavLink = mainNavLinks?.find(
    (link) => link.label === activeMainLink,
  );
  const MainNavLinkIcon = mainNavLink?.icon;
  if (isPending) return <NavbarSkeleton />;
  return (
    <nav className={classes.navbar}>
      <div className={classes.wrapper}>
        <div className={classes.aside}>
          <div>
            <Stack gap={0}>
              <div className={classes.logo}>
                <HoverCard shadow="md" position="right-end">
                  <HoverCard.Target>
                    <Avatar className="w-12 h-12 border-4 border-white shadow-lg">
                      <AvatarImage src={getFileUrlFromKey(user?.orgLogo)} />
                      <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white text-sm font-bold">
                        {user?.orgName?.toUpperCase().slice(0, 2) || "O"}
                      </AvatarFallback>
                    </Avatar>
                  </HoverCard.Target>
                  <HoverCard.Dropdown>
                    <Flex
                      justify={"center"}
                      align={"center"}
                      gap={"xs"}
                      onClick={() => router.push("/dashboard/settings/account")}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      <Avatar className="w-12 h-12 border-4 border-white shadow-lg">
                        <AvatarImage src={getFileUrlFromKey(user?.orgLogo)} />
                        <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white text-sm font-bold">
                          {user?.orgName?.toUpperCase().slice(0, 2) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <Text fw={500} size="sm">
                        {user?.orgName || "No Organization"}
                      </Text>
                    </Flex>
                  </HoverCard.Dropdown>
                </HoverCard>
              </div>
            </Stack>
            <ScrollAreaAutosize mah={"70dvh"} scrollbarSize={6} p={"xs"}>
              {mainLinks}
            </ScrollAreaAutosize>
          </div>
          <div className="flex flex-col items-center justify-between gap-2 py-4">
            <Separator />
            {process.env.NEXT_PUBLIC_EXPERIMENT && (
              <div className="flex items-center justify-center ml-2">
                <ColorSchemaButton />
              </div>
            )}
            <div>
              <NotificationBellIcon />
            </div>
            <Popover open={opened} onOpenChange={setOpened}>
              <PopoverTrigger asChild>
                <div
                  className="flex items-center rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setOpened(true)}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={getFileUrlFromKey(user?.profilePhoto)}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white text-sm font-bold">
                          {user?.userName?.toUpperCase().slice(0, 2) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute top-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                          status === "online"
                            ? "bg-[#69f0ae] animate-pulse"
                            : "bg-[#cacaca]"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </PopoverTrigger>

              <PopoverContent
                className="w-[260px] p-3 rounded-lg shadow-md"
                align="end"
                side="right"
              >
                {/* Status */}
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="flex justify-between items-center mt-1">
                    <p
                      className={`text-sm font-semibold ${
                        status === "online"
                          ? "text-teal-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {status === "online" ? "Online" : "Offline"}
                    </p>
                    <Switch
                      checked={status === "online"}
                      onCheckedChange={(checked) => {
                        setStatus(checked ? "online" : "offline");
                      }}
                      className="data-[state=checked]:bg-teal-600"
                    />
                  </div>
                </div>

                {/* Organization */}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <p className="text-sm font-semibold">
                    {user?.orgName || "N/A"}
                  </p>
                </div>

                {/* Email */}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-semibold">
                    {user?.email || "No email"}
                  </p>
                </div>

                {/* Role */}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="text-sm font-semibold">{user?.role || "N/A"}</p>
                </div>

                <Separator className="my-3" />

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => router.push("/dashboard/settings/account")}
                  >
                    <User size={16} />
                    <span className="text-sm">Profile</span>
                  </div>

                  <div
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent transition-colors text-red-600 font-medium"
                    onClick={() => setOpenLogoutModal(true)}
                  >
                    <LogOut size={16} />
                    <span className="text-sm">Logout</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Dialog open={openLogoutModal} onOpenChange={setOpenLogoutModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#004F98]/10">
                  <LogOut
                    size={28}
                    className="text-[#004F98]"
                    strokeWidth={2}
                  />
                </div>
                <DialogTitle className="text-xl font-semibold">
                  {translations("Are you sure you want to logout?")}
                </DialogTitle>
              </DialogHeader>

              <DialogFooter className="flex-row justify-center gap-2 sm:justify-center">
                <Button
                  variant="outline"
                  onClick={() => setOpenLogoutModal(false)}
                  className="min-w-[100px]"
                >
                  {translations("Cancel")}
                </Button>
                <Button
                  onClick={() => {
                    router.push("/logout");
                    setOpenLogoutModal(false);
                  }}
                  className="min-w-[100px]"
                >
                  {translations("Logout")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {linksIcon?.length > 0 && (
          <div>
            <div className="px-3 py-2 border-b-2">
              <div className="flex justify-between items-center">
                {largeScreen
                  ? desktopOpened && (
                      <div className="flex items-center gap-2">
                        {MainNavLinkIcon && (
                          <MainNavLinkIcon className="w-5 h-5 text-muted-foreground" />
                        )}

                        <h3 className="text-lg font-bold">{activeMainLink}</h3>
                      </div>
                    )
                  : mobileOpened && (
                      <div className="flex items-center gap-2">
                        {MainNavLinkIcon && (
                          <MainNavLinkIcon className="w-5 h-5 text-muted-foreground" />
                        )}
                        <h3 className="text-lg font-bold">{activeMainLink}</h3>
                      </div>
                    )}

                <CustomTooltip
                  trigger={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={largeScreen ? toggleDesktop : toggleMobile}
                    >
                      {largeScreen ? (
                        desktopOpened ? (
                          <PanelLeftClose className="w-4 h-4" />
                        ) : (
                          <PanelLeft className="w-4 h-4" />
                        )
                      ) : mobileOpened ? (
                        <PanelLeftClose className="w-4 h-4" />
                      ) : (
                        <PanelLeft className="w-4 h-4" />
                      )}
                    </Button>
                  }
                  content={
                    <p>
                      {largeScreen
                        ? desktopOpened
                          ? "Hide"
                          : "Collapse"
                        : mobileOpened
                          ? "Hide"
                          : "Collapse"}
                    </p>
                  }
                  side="right"
                />
                {/* <Burger
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
                /> */}
              </div>
            </div>
            <ScrollAreaAutosize mah={"calc(100dvh - 80px)"} scrollbarSize={6}>
              <div className="p-1">
                {largeScreen ? (
                  desktopOpened ? (
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
                  ) : (
                    <div>{linksIcon}</div>
                  )
                ) : mobileOpened ? (
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
                ) : (
                  <div>{linksIcon}</div>
                )}
              </div>
            </ScrollAreaAutosize>
          </div>
        )}
      </div>

      {/* <div>{lastLinks}</div> */}
    </nav>
  );
};

// WhatsApp Settings Modal Component
const WhatsAppSettingsModal = ({
  opened,
  onClose,
  onGoToSettings,
  intendedRoute,
}) => {
  const router = useRouter();
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
            onClick={() => {
              onClose();
              if (intendedRoute) router.push(intendedRoute);
            }}
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
  labels,
  customFieldData,
}) => {
  return (
    <motion.div className={styles["content-container"]}>
      <Flex className={`${styles["content-wrapper"]}`}>
        <LabelsContext value={labels}>
          <CustomFieldsProvider initialFields={customFieldData || []}>
            <NavControlContext value={{ navOpened, setNavOpened }}>
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
            </NavControlContext>
          </CustomFieldsProvider>
        </LabelsContext>
      </Flex>
    </motion.div>
  );
};

export default function Layout({ children }) {
  const {
    isPending: isLoadingUserInfo,
    data: userQueryData,
    isFetched,
    refetch,
  } = useUserInfo();

  useEffect(() => {
    if (!isFetched || isLoadingUserInfo) return;

    if (
      userQueryData["data"] &&
      userQueryData["data"]?.onboardingCompleted === false
    ) {
      router.replace("/login/complete-login");
    }
  }, [userQueryData, isFetched, isLoadingUserInfo]);
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

  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop, open }] = useDisclosure(false);
  const { data: sub, isPending } = useSubscription();
  const { isPending: isPendingLabels, data: labels } = useLabelsQuery();
  const { isPending: isCustomFieldPending, data: customFieldData } =
    useCustomFields();

  const translations = useTranslations();
  const [navLinks, setNavLinks] = useState([]);
  // const [lastLinksData, setLastLinksData] = useState([]);
  const [whatsAppModalOpened, setWhatsAppModalOpened] = useState(false);
  const [intendedRoute, setIntendedRoute] = useState<string | null>(null);
  const isLoading =
    isPending || isPendingLabels || isLoadingUserInfo || isCustomFieldPending;
  // Fetch inbox labels from DB
  // const { data: inboxLabelsData } = useGetInboxLabels();

  useEffect(() => {
    if (!isLoading) {
      const [nLinks, lLinks] = getNavTopData(
        sub,
        translations,
        userInfo?.data?.role,
        labels, // pass dynamic labels
      );
      setNavLinks(nLinks);
      // setLastLinksData(lLinks);
    }
  }, [isLoading, sub, translations, userInfo?.data?.role, labels]);

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
  const linksMapping = [...navLinks]?.reduce<Record<string, NavLinkItem[]>>(
    (acc, link) => {
      acc[link.label] = link.children || [];
      return acc;
    },
    {},
  );

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
  }, [inboxCount, filter.assignedTeams, activeMainLink]);

  // Function to check if user has WhatsApp settings
  const checkWhatsAppSettings = (route?: string) => {
    // Add your logic here to check if user has WhatsApp settings
    // This could be checking userInfo data or making an API call
    // For now, returning false to demonstrate the modal
    if (userInfo?.message !== "Success") return false;
    const hasWhatsAppSettings = userInfo?.data?.hasWhatsAppSettings || false;

    if (!hasWhatsAppSettings) {
      setWhatsAppModalOpened(true);
      if (route) setIntendedRoute(route);
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
    labels,
  });

  // const lastLinks = (
  //   <LastLinks
  //     links={lastLinksData}
  //     activeMainLink={activeMainLink}
  //     setActiveMainLink={setActiveMainLink}
  //     setActiveSubLink={setActiveSubLink}
  //     router={router}
  //     status={userInfo?.data?.status || UserAvailabilityStatus.offline}
  //   />
  // );
  if (!pathname) return null;

  return (
    <SessionReact.SessionAuth>
      <WebSocketHandler />

      <WhatsAppSettingsModal
        opened={whatsAppModalOpened}
        onClose={() => setWhatsAppModalOpened(false)}
        onGoToSettings={handleGoToWhatsAppSettings}
        intendedRoute={intendedRoute}
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
        footer={{ height: 0 }}
        padding={activeMainLink === "Inbox" ? undefined : 7}
        layout="alt"
      >
        <AppShell.Header zIndex={0}>
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            hiddenFrom="sm"
            size="sm"
            p={"md"}
          />
          {/* <TopNavbar user={userInfo.data} /> */}
        </AppShell.Header>
        <AppShell.Navbar zIndex={0}>
          <Navbar
            mainLinks={mainLinks}
            mainNavLinks={navLinks}
            activeMainLink={activeMainLink}
            linksIcon={linksIcon}
            linksText={linksText}
            // lastLinks={lastLinks}
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
            labels={labels}
            customFieldData={customFieldData}
          >
            {children}
          </MainContent>
        </AppShell.Main>
      </AppShell>
    </SessionReact.SessionAuth>
  );
}
