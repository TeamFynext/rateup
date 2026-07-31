import {
  IconActivity,
  IconAddressBook,
  IconAward,
  IconBolt,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconBrowser,
  IconBuildingStore,
  IconChartBar,
  IconChartLine,
  IconCircleCheck,
  IconCirclePlus,
  IconClock,
  IconCreditCard,
  IconCrown,
  IconDashboard,
  IconFileDescription,
  IconFileSpreadsheet,
  IconFileText,
  IconFolder,
  IconGift,
  IconInbox,
  IconLinkPlus,
  IconLogs,
  IconMessage,
  IconQrcode,
  IconReportAnalytics,
  // IconRobotFace,
  IconSend,
  IconSettings,
  IconShield,
  IconShoppingCart,
  IconSitemap,
  IconTag,
  IconTemplate,
  IconTerminal2,
  IconTicket,
  IconUser,
  IconUserCheck,
  IconUserCog,
  IconUsers,
  IconWaveSine,
  IconWebhook,
} from "@tabler/icons-react";
import { AtSign, Layers, ShieldAlert, Sparkles, Star, UserCheck } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { ContactLabelOption } from "@/backend/campaign/contacts/contacts.api";
import type { GetLabelsRes } from "@/backend/lifecycle/lifecycle.types";
import type { ChannelOption } from "@/components/input/channelOptions.ts";
import type { AllowedFeatures } from "@/context/TeamFeaturesContext.tsx";
import type { User } from "@/context/UserContext.tsx";
import type { ChatFilterStore } from "@/store/chat-filter.store.ts";
import type { ChatContactCountStore } from "@/store/inbox.store.ts";
import { MessagePlatform, TeamFeature } from "@/types/enums.ts";
import { UserRole } from "@/utils/enums/index.ts";

const CHANNEL_PLATFORM_ICON: Partial<
  Record<MessagePlatform, React.ComponentType<{ size?: number | string; className?: string }>>
> = {
  [MessagePlatform.WHATSAPP]: IconBrandWhatsapp,
  [MessagePlatform.INSTAGRAM]: IconBrandInstagram,
  [MessagePlatform.FACEBOOK]: IconBrandFacebook,
};

/**
 * One entry in the sidebar tree. Entries are heterogeneous — a link, a labelled
 * group of links, or a slot for a filter control — so every field is optional.
 */
export interface NavEntry {
  title?: string;
  url?: string;
  group?: string;
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  items?: NavEntry[];
  /** Rendering hints the sidebar reads off an entry. */
  type?: string;
  variant?: string;
  className?: string;
  componentKey?: string;
  description?: React.ReactNode;
  hint?: React.ReactNode;
  count?: number;
  isActive?: boolean;
  showTitle?: boolean;
  settingsStyle?: boolean;
  hasSepeartorOnTop?: boolean;
  hasSeperatorOnBottom?: boolean;
  showClearButton?: boolean;
  clearButtonName?: string;
  clearFilter?: () => void;
  handleClick?: () => void;
  [key: string]: unknown;
}

/** Everything the sidebar's nav tree is derived from, gathered by `AppSidebar`. */
interface NavMainInput {
  subscription?: Subscription;
  lifecycles?: GetLabelsRes[];
  contactLabels?: ContactLabelOption[];
  channels?: ChannelOption[];
  staff: Array<{ id: string; name?: string }>;
  teams: Array<{ id: string; name?: string }>;
  chatFilterStore: ChatFilterStore;
  hiddenModules: string[];
  handleFilter: (label: string, value: string) => void;
  allowedFeatures: AllowedFeatures;
  user: User | null;
  sectionCounts: ChatContactCountStore["sectionCounts"];
}

export function useNavMain({
  subscription,
  lifecycles = [],
  contactLabels = [],
  channels = [],
  staff,
  teams,
  chatFilterStore,
  hiddenModules,
  handleFilter,
  allowedFeatures,
  user,
  sectionCounts,
}: NavMainInput) {
  const { t } = useTranslation();

  // null = bypass (OWNER/ADMIN/SUPER_ADMIN), Set = restrict to enabled features (MEMBER)
  const hasTeamFeature = (feature: TeamFeature) =>
    allowedFeatures === null || allowedFeatures.has(feature);
  return useMemo<NavEntry[]>(
    () => [
      // {
      //   title: t("Home"),
      //   url: "/dashboard",
      //   icon: IconHome2,
      //   items: [],
      // },

      ...(hasTeamFeature(TeamFeature.Inbox)
        ? [
            {
              title: t("Inbox"),
              url: "/dashboard/inbox?tab=open",
              icon: IconInbox,
              items: [
                // Inbox Tickets v2 filter rail. Order matches the design mockup:
                // Open · New · Closed · All · Mine · @Mentions · Favourites · Spam.
                {
                  title: t("Open"),
                  url: "/dashboard/inbox?tab=open",
                  icon: IconInbox,
                  count: sectionCounts?.openCount || 0,
                  variant: "inbox-tab",
                },
                {
                  title: t("New"),
                  url: "/dashboard/inbox?tab=new",
                  icon: Sparkles,
                  count: sectionCounts?.newCount || 0,
                  variant: "inbox-tab",
                },
                {
                  title: t("Closed"),
                  url: "/dashboard/inbox?tab=closed",
                  icon: IconCircleCheck,
                  count: sectionCounts?.closedCount || 0,
                  variant: "inbox-tab",
                },
                {
                  title: t("All"),
                  url: "/dashboard/inbox?tab=all",
                  icon: Layers,
                  count: sectionCounts?.allCount || 0,
                  variant: "inbox-tab",
                },
                {
                  title: t("Mine"),
                  url: "/dashboard/inbox?tab=mine",
                  icon: UserCheck,
                  count: sectionCounts?.mineCount || 0,
                  variant: "inbox-tab",
                },
                {
                  title: t("@Mentions"),
                  url: "/dashboard/inbox?tab=mentions",
                  icon: AtSign,
                  count: sectionCounts?.mentionsCount || 0,
                  variant: "inbox-tab",
                },
                {
                  title: t("Favourites"),
                  url: "/dashboard/inbox?tab=favourites",
                  icon: Star,
                  count: sectionCounts?.favouriteCount || 0,
                  variant: "inbox-tab",
                },
                {
                  title: t("Spam"),
                  url: "/dashboard/inbox?tab=spam",
                  icon: ShieldAlert,
                  count: sectionCounts?.spamCount || 0,
                  variant: "inbox-tab",
                },
                {
                  group: "Filter",
                  items: [
                    // Channel scopes every tab, so it leads the filter group.
                    ...(channels.length > 0
                      ? [
                          {
                            title: t("Channel"),
                            isSectionHeader: true,
                            icon: IconAddressBook,
                            showClearButton: Boolean(chatFilterStore.filter.phone),
                            clearFilter: () =>
                              chatFilterStore.setFilter({
                                ...chatFilterStore.filter,
                                phone: "",
                              }),
                            items: channels.map((channel) => ({
                              title: channel.label,
                              url: "#",
                              icon: CHANNEL_PLATFORM_ICON[channel.platform] ?? IconMessage,
                              handleClick: () => {
                                handleFilter("channel", channel.value);
                              },
                              isActive: chatFilterStore.filter.phone === channel.value,
                            })),
                          },
                        ]
                      : []),
                    ...(lifecycles.length > 0
                      ? [
                          {
                            title: "Lifecycle",
                            isSectionHeader: true,
                            icon: IconActivity,
                            showClearButton: !!chatFilterStore.filter.lifecycle,
                            clearFilter: () =>
                              chatFilterStore.setFilter({
                                ...chatFilterStore.filter,
                                lifecycle: "",
                              }),
                            items: lifecycles.map((lbl: GetLabelsRes) => ({
                              icon: (props: Record<string, unknown>) => (
                                <div {...props}>{lbl.emoji}</div>
                              ),
                              title: lbl.name,
                              url: "#",
                              handleClick: () => {
                                handleFilter("lifecycle", lbl.id);
                              },
                              isActive: chatFilterStore.filter.lifecycle === lbl.id,
                            })),
                          },
                        ]
                      : []),
                    ...(contactLabels.length > 0
                      ? [
                          {
                            title: "Labels",
                            isSectionHeader: true,
                            icon: IconTag,
                            showClearButton: chatFilterStore.filter.labels?.length > 0,
                            clearFilter: () =>
                              chatFilterStore.setFilter({
                                ...chatFilterStore.filter,
                                labels: [],
                              }),
                            items: contactLabels.map(
                              (lbl: { id: string; name: string; color?: string }) => ({
                                title: lbl.name,
                                url: "#",
                                icon: (props: Record<string, unknown>) => (
                                  <div
                                    {...props}
                                    className={`rounded-full ${props?.className ?? ""} w-3 h-3`}
                                    style={{
                                      background: lbl?.color,
                                    }}
                                  />
                                ),
                                handleClick: () => {
                                  handleFilter("label", lbl.id);
                                },
                                isActive: chatFilterStore.filter.labels?.includes(lbl.id),
                              }),
                            ),
                          },
                        ]
                      : []),
                    ...(staff.length > 0
                      ? [
                          {
                            title: "Users",
                            isSectionHeader: true,
                            icon: IconUser,
                            showClearButton: chatFilterStore.filter.assignedUserIds?.length > 0,
                            clearFilter: () =>
                              chatFilterStore.setFilter({
                                ...chatFilterStore.filter,
                                assignedUserIds: [],
                              }),
                            items: staff.map((member: { id: string; name?: string }) => ({
                              title: member.name,
                              url: "#",
                              handleClick: () => handleFilter("assignedStaff", member.id),
                              isActive: chatFilterStore.filter.assignedUserIds?.includes(member.id),
                            })),
                          },
                        ]
                      : []),
                    ...(teams.length > 0
                      ? [
                          {
                            title: "Teams",
                            isSectionHeader: true,
                            icon: IconUsers,
                            showClearButton: chatFilterStore.filter.assignedTeams?.length > 0,
                            clearFilter: () =>
                              chatFilterStore.setFilter({
                                ...chatFilterStore.filter,
                                assignedTeams: [],
                              }),
                            items: teams.map((team: { id: string; name?: string }) => ({
                              title: team.name,
                              url: "#",
                              handleClick: () => handleFilter("assignedTeams", team.id),
                              isActive: chatFilterStore.filter.assignedTeams?.includes(team.id),
                            })),
                          },
                        ]
                      : []),
                  ],
                },
                {
                  title: "Settings",
                  icon: IconSettings,
                  url: "/dashboard/inbox?tab=settings",
                },
              ],
            },
          ]
        : []),
      ...(hasTeamFeature(TeamFeature.Analytics)
        ? [
            {
              title: t("Analytics"),
              url: "/dashboard/analytics?tab=overview",
              icon: IconReportAnalytics,
              items: [
                {
                  title: t("Overview"),
                  url: "/dashboard/analytics?tab=overview",
                  icon: IconChartBar,
                },
                {
                  title: t("Agent Performance"),
                  url: "/dashboard/analytics?tab=agent-performance",
                  icon: IconAward,
                },
                {
                  title: t("Team Performance"),
                  url: "/dashboard/analytics?tab=team-performance",
                  icon: IconActivity,
                },
                {
                  title: t("Message Analytics"),
                  url: "/dashboard/analytics?tab=api-analytics",
                  icon: IconChartLine,
                },
                {
                  title: t("Message Logs"),
                  url: "/dashboard/analytics?tab=message-logs",
                  icon: IconLogs,
                },
                {
                  title: t("Team Activity"),
                  url: "/dashboard/analytics?tab=team-activity",
                  icon: IconFileText,
                },
              ],
            },
          ]
        : []),
      ...(hasTeamFeature(TeamFeature.Contacts)
        ? [
            {
              title: t("Contacts"),
              url: "/dashboard/contacts",
              icon: IconUsers,
              items: [
                {
                  title: t("All Contacts"),
                  url: "/dashboard/contacts",
                  icon: IconUsers,
                },
                {
                  title: t("Groups"),
                  url: "/dashboard/contacts/groups",
                  icon: IconFolder,
                },
                {
                  title: t("Custom Fields"),
                  url: "/dashboard/contacts/custom-fields",
                  icon: IconFileSpreadsheet,
                },
                {
                  title: t("Labels"),
                  url: "/dashboard/contacts/labels",
                  icon: IconTag,
                },
                {
                  title: t("Lifecycle"),
                  url: "/dashboard/contacts/lifecycle",
                  icon: IconActivity,
                },
              ],
            },
          ]
        : []),
      ...(hasTeamFeature(TeamFeature.Campaigns)
        ? [
            {
              title: t("Campaign"),
              url: "/dashboard/campaign",
              icon: IconSend,
            },
          ]
        : []),
      ...(hasTeamFeature(TeamFeature.Flows) ||
      hasTeamFeature(TeamFeature.Chatbots) ||
      hasTeamFeature(TeamFeature.Templates) ||
      hasTeamFeature(TeamFeature.Automation)
        ? [
            {
              title: t("WhatsApp"),
              url: "/dashboard/whatsapp/flows",
              icon: IconBrandWhatsapp,
              items: [
                ...(hasTeamFeature(TeamFeature.Flows)
                  ? [
                      {
                        title: t("Flow"),
                        url: "/dashboard/whatsapp/flows",
                        icon: IconWaveSine,
                      },
                    ]
                  : []),
                ...(hasTeamFeature(TeamFeature.Chatbots)
                  ? [
                      {
                        title: t("Chatbot"),
                        url: "/dashboard/whatsapp/flowbots",
                        icon: IconSitemap,
                      },
                    ]
                  : []),
                ...(hasTeamFeature(TeamFeature.Templates)
                  ? [
                      {
                        title: t("Templates"),
                        url: "/dashboard/whatsapp/templates",
                        icon: IconTemplate,
                      },
                    ]
                  : []),
                {
                  title: t("Conversational"),
                  url: "/dashboard/whatsapp/conversational-components",
                  icon: IconMessage,
                },
              ],
            },
            ...(hasTeamFeature(TeamFeature.Chatbots)
              ? [
                  {
                    title: t("Instagram"),
                    url: "/dashboard/instagram",
                    icon: IconBrandInstagram,
                  },
                ]
              : []),
            ...(hasTeamFeature(TeamFeature.Automation)
              ? [
                  {
                    title: t("Automation"),
                    url: "/dashboard/automation",
                    icon: IconBolt,
                  },
                ]
              : []),
          ]
        : []),

      ...(true
        ? [
            {
              title: t("Commerce"),
              url: "/dashboard/commerce/overview",
              icon: IconBuildingStore,
              items: [
                {
                  title: t("Overview"),
                  url: "/dashboard/commerce/overview",
                  icon: IconDashboard,
                },
                {
                  title: t("Catalogs"),
                  url: "/dashboard/commerce/catalogs",
                  icon: IconBuildingStore,
                },
                {
                  title: t("Orders"),
                  url: "/dashboard/commerce/orders",
                  icon: IconShoppingCart,
                },
                {
                  title: t("Payments"),
                  url: "/dashboard/commerce/payments",
                  icon: IconCreditCard,
                },
                // TODO:commerce
                // {
                //   title: t("Coupons"),
                //   url: "/dashboard/commerce/coupons",
                //   icon: IconTicket,
                // },
                {
                  title: t("Checkout Settings"),
                  url: "/dashboard/commerce/settings",
                  icon: IconSettings,
                },
              ],
            },
          ]
        : []),
      ...(hasTeamFeature(TeamFeature.Loyalty)
        ? [
            {
              title: t("Loyalty"),
              url: "/dashboard/loyalty/dashboard",
              icon: IconGift,
              items: [
                {
                  title: t("Overview"),
                  url: "/dashboard/loyalty/dashboard",
                  icon: IconDashboard,
                },
                {
                  title: t("Cashier Portal"),
                  url: "/dashboard/loyalty/cashier",
                  icon: IconShoppingCart,
                },
                {
                  title: t("Customers"),
                  url: "/dashboard/loyalty/customers",
                  icon: IconUsers,
                },
                {
                  title: t("Earning Rules"),
                  url: "/dashboard/loyalty/earning-rules",
                  icon: IconActivity,
                },
                {
                  title: t("Rewards"),
                  url: "/dashboard/loyalty/rewards",
                  icon: IconAward,
                },
                {
                  title: t("Transactions"),
                  url: "/dashboard/loyalty/transactions",
                  icon: IconClock,
                },
                {
                  title: t("Approvals"),
                  url: "/dashboard/loyalty/approvals",
                  icon: IconUserCheck,
                },
                {
                  title: t("Commands"),
                  url: "/dashboard/loyalty/command",
                  icon: IconTerminal2,
                },
                {
                  title: t("WhatsApp Templates"),
                  url: "/dashboard/loyalty/templates",
                  icon: IconFileDescription,
                },
                {
                  title: t("Settings"),
                  url: "/dashboard/loyalty/settings",
                  icon: IconSettings,
                },
              ],
            },
          ]
        : []),
      ...(hasTeamFeature(TeamFeature.WebForms)
        ? [
            {
              title: t("Web Forms"),
              url: "/dashboard/surveys",
              icon: IconBrowser,
            },
          ]
        : []),
      ...(hasTeamFeature(TeamFeature.Tickets)
        ? [
            {
              title: t("Tickets"),
              url: "/dashboard/tickets",
              icon: IconTicket,
              items: [],
            },
          ]
        : []),
      ...(hasTeamFeature(TeamFeature.QrStudio)
        ? [
            {
              title: t("QR Studio"),
              url: "/dashboard/qrCreator",
              icon: IconQrcode,
              items: [
                {
                  title: t("QR Creator"),
                  url: "/dashboard/qrCreator",
                  icon: IconCirclePlus,
                },
                {
                  title: t("Access Links"),
                  url: "/dashboard/quickAccessLinks",
                  icon: IconLinkPlus,
                },
                // {
                //   title: t("Landing Pages"),
                //   url: "/dashboard/landingPages",
                //   icon: IconWallpaper,
                // },
              ],
            },
          ]
        : []),
      // ...(hasFeature(subscription, sfpn.AI) && hasTeamFeature(TeamFeature.AiChatbot)
      //   ? [
      //       {
      //         title: "Meta AI Agent",
      //         url: "/dashboard/meta-agent",
      //         icon: IconRobotFace,
      //         items: [],
      //       },
      //     ]
      //   : []),
      {
        title: t("Settings"),
        url: "/dashboard/settings",
        icon: IconSettings,
        settingsStyle: true,
        items: [
          {
            group: t("Account Settings"),
            items: [
              {
                title: t("Account"),
                url: "/dashboard/settings/account",
                icon: IconUser,
                description: t("Business profile & preferences"),
              },
              ...(user?.role === UserRole.SUPADM
                ? [
                    {
                      title: t("Users"),
                      url: "/dashboard/settings/users",
                      icon: IconUserCog,
                      description: t("User accounts & access"),
                    },
                  ]
                : []),
              {
                title: t("Team"),
                url: "/dashboard/settings/team",
                icon: IconUsers,
                description: t("Team members & roles"),
              },
            ],
          },
          {
            group: t("Platform Settings"),
            items: [
              ...(hasTeamFeature(TeamFeature.Inbox)
                ? [
                    {
                      title: t("Channels"),
                      url: "/dashboard/settings/channels",
                      icon: IconMessage,
                      description: t("Communication channels"),
                    },
                  ]
                : []),
              ...(hasTeamFeature(TeamFeature.AppsServices)
                ? [
                    {
                      title: "Integrations",
                      url: "/dashboard/settings/integrations",
                      icon: IconWebhook,
                      description: "Webhooks & external services",
                    },
                  ]
                : []),
            ],
          },
          {
            group: t("System Settings"),
            items: [
              {
                title: t("Security"),
                url: "/dashboard/settings/security",
                icon: IconShield,
                description: t("Password & security"),
              },
              ...(user?.role === UserRole.SUPADM
                ? [
                    {
                      title: t("Billing"),
                      url: "/dashboard/settings/billing",
                      icon: IconCreditCard,
                      description: t("Subscription & payments"),
                    },
                  ]
                : []),
            ],
          },
          ...(subscription?.orgId === import.meta.env.VITE_ROOT_ORG &&
          user?.role === UserRole.SUPADM
            ? [
                {
                  group: t("Admin Settings"),
                  items: [
                    {
                      title: t("Admin"),
                      url: "/admin",
                      icon: IconCrown,
                      description: t("Admin settings"),
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    ],
    [
      channels,
      chatFilterStore.filter.labels,
      chatFilterStore.filter.lifecycle,
      chatFilterStore.filter.phone,
      contactLabels,
      handleFilter,
      hasTeamFeature,
      hiddenModules,
      lifecycles,
      staff.length,
      subscription,
      t,
      teams.length,
      user?.role,
    ],
  );
}
