import {
  IconActivity,
  IconAddressBook,
  IconAt,
  IconBolt,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconBrowser,
  IconBuildingStore,
  IconChartBar,
  IconChartInfographic,
  IconCircleCheck,
  IconCreditCard,
  IconCrown,
  IconDashboard,
  IconFileSpreadsheet,
  IconFilterBolt,
  IconFolder,
  IconGift,
  IconHash,
  IconInbox,
  IconLayoutList,
  IconLogs,
  IconMessage,
  IconMessages,
  IconQrcode,
  IconRobotFace,
  IconRocket,
  IconSend,
  IconSettings,
  IconShield,
  IconShieldExclamation,
  IconShoppingCart,
  IconShoppingCartBolt,
  IconSitemap,
  IconSparkles,
  IconStack2,
  IconStar,
  IconTag,
  IconTemplate,
  IconUser,
  IconUserCheck,
  IconUserCog,
  IconUsers,
  IconWaveSine,
  IconWebhook,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { ContactLabelOption } from "@/backend/campaign/contacts/contacts.api";
import type { GetLabelsRes } from "@/backend/lifecycle/lifecycle.types";
import type { ConversationTagOption } from "@/backend/whatsapp/inbox/conversationTag/conversationTag.api.ts";
import {
  buildLoyaltyNavItems,
  type LoyaltyNavInput,
} from "@/components/dashboard/loyalty/loyalty.nav.ts";
import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";
import {
  buildMetaAgentNavItems,
  buildMetaAgentNavProgress,
  type MetaAgentNavInput,
} from "@/components/dashboard/metaAgent/metaAgent.nav.ts";
import type { SetupNavInput } from "@/components/dashboard/setup/setup.nav.ts";
import {
  buildSetupNavItems,
  buildSetupNavProgress,
} from "@/components/dashboard/setup/setup.nav.ts";
import type { ChannelOption } from "@/components/input/channelOptions.ts";
import {
  buildPipelineNavItems,
  buildPipelineNavProgress,
  type PipelineNavInput,
} from "@/components/pipeline/pipeline.nav.tsx";
import type { AllowedFeatures } from "@/context/TeamFeaturesContext.tsx";
import type { User } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import type { ChatFilterStore } from "@/store/chat-filter.store.ts";
import type { ChatContactCountStore } from "@/store/inbox.store.ts";
import { MessagePlatform, TeamFeature } from "@/types/enums.ts";
import type { Permission } from "@/utils/authz/permissions.ts";

type NavIcon = React.ComponentType<{ size?: number | string; className?: string }>;

/**
 * Channel rows carry their platform's brand colour on the icon so the filter list
 * is scannable at a glance. Wrapped once at module scope — building these inside
 * the nav memo would hand React a new component type on every rebuild.
 *
 * The colours need `!`: `SidebarMenuSubButton` paints its icons with
 * `[&>svg]:text-sidebar-accent-foreground`, and that descendant selector outranks
 * a bare colour class (it only lost in dark mode, where `.dark .text-…` is two
 * classes deep — which is why the colour used to show there and nowhere else).
 */
function withBrandColor(Icon: NavIcon, color: string): NavIcon {
  return function BrandIcon({ className, ...props }) {
    return <Icon {...props} className={cn(className, color)} />;
  };
}

const CHANNEL_PLATFORM_ICON: Partial<Record<MessagePlatform, NavIcon>> = {
  [MessagePlatform.WHATSAPP]: withBrandColor(
    IconBrandWhatsapp,
    "text-green-600! dark:text-green-500!",
  ),
  [MessagePlatform.INSTAGRAM]: withBrandColor(
    IconBrandInstagram,
    "text-pink-600! dark:text-pink-500!",
  ),
  [MessagePlatform.FACEBOOK]: withBrandColor(
    IconBrandFacebook,
    "text-blue-600! dark:text-blue-500!",
  ),
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
  /**
   * A short text chip at the row's end ("Live", "Draft"). Data, not markup, for the same
   * reason as `done` below.
   */
  badge?: string;
  badgeTone?: "neutral" | "success" | "warning";
  /**
   * Draws a done/not-done marker at the row's inline end. A plain flag rather than
   * a rendered node: `AppSidebar` diffs entries with `JSON.stringify`, which a React
   * element does not survive.
   */
  done?: boolean;
  /** Meter at the foot of this section's panel. Same reason it is data, not markup. */
  progress?: NavProgress;
  /**
   * Passed to the row's `Link`. `false` keeps the current scroll position on
   * navigation, for a row whose destination scrolls itself. Omitted rows follow the
   * router's `scrollRestoration`, which resets to the top.
   */
  resetScroll?: boolean;
  /**
   * Path prefixes this sub-item also stands for, when they sit under a sibling's
   * path: the analytics drill-downs live under `/dashboard/analytics/…` but belong
   * to Conversations, not to the first sibling that prefix-matches.
   */
  ownsPaths?: string[];
  isActive?: boolean;
  hasSepeartorOnTop?: boolean;
  hasSeperatorOnBottom?: boolean;
  showClearButton?: boolean;
  clearButtonName?: string;
  clearFilter?: () => void;
  handleClick?: () => void;
  [key: string]: unknown;
}

/** A "x of y done" meter a section can hang at the foot of its panel. */
export interface NavProgress {
  /** Already translated — the sidebar renders it verbatim. */
  label: string;
  done: number;
  total: number;
}

/** Everything the sidebar's nav tree is derived from, gathered by `AppSidebar`. */
interface NavMainInput {
  subscription?: Subscription;
  lifecycles?: GetLabelsRes[];
  contactLabels?: ContactLabelOption[];
  conversationTags?: ConversationTagOption[];
  channels?: ChannelOption[];
  staff: Array<{ id: string; name?: string }>;
  teams: Array<{ id: string; name?: string; color?: string }>;
  chatFilterStore: ChatFilterStore;
  hiddenModules: string[];
  handleFilter: (label: string, value: string) => void;
  allowedFeatures: AllowedFeatures;
  /** `usePermissions().can`; what the signed-in user may do. */
  can: (permission: Permission) => boolean;
  user: User | null;
  sectionCounts: ChatContactCountStore["sectionCounts"];
  pipelineNav: PipelineNavInput;
  setupNav: SetupNavInput;
  loyaltyNav?: LoyaltyNavInput;
  metaAgentNav: MetaAgentNavInput;
}

export function useNavMain({
  subscription,
  lifecycles = [],
  contactLabels = [],
  conversationTags = [],
  channels = [],
  staff,
  teams,
  chatFilterStore,
  hiddenModules,
  handleFilter,
  allowedFeatures,
  can,
  user,
  sectionCounts,
  pipelineNav,
  setupNav,
  loyaltyNav,
  metaAgentNav,
}: NavMainInput) {
  const { t } = useTranslation();

  // null = sees every feature; Set = restricted to the team's enabled features
  const hasTeamFeature = (feature: TeamFeature) =>
    allowedFeatures === null || allowedFeatures.has(feature);
  return useMemo<NavEntry[]>(() => {
    // Empty once the org has finished or dismissed setup, which is what takes the
    // rocket back out of the rail.
    const setupItems = can("channels.manage") ? buildSetupNavItems(setupNav) : [];

    return [
      ...(setupItems.length > 0
        ? [
            {
              title: t("Get started"),
              url: "/dashboard/setup",
              icon: IconRocket,
              progress: buildSetupNavProgress(setupNav, t),
              items: setupItems,
            },
          ]
        : []),
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
                },
                {
                  title: t("New"),
                  url: "/dashboard/inbox?tab=new",
                  icon: IconSparkles,
                  count: sectionCounts?.newCount || 0,
                },
                {
                  title: t("Closed"),
                  url: "/dashboard/inbox?tab=closed",
                  icon: IconCircleCheck,
                  count: sectionCounts?.closedCount || 0,
                },
                {
                  title: t("All"),
                  url: "/dashboard/inbox?tab=all",
                  icon: IconStack2,
                  count: sectionCounts?.allCount || 0,
                },
                {
                  title: t("Mine"),
                  url: "/dashboard/inbox?tab=mine",
                  icon: IconUserCheck,
                  count: sectionCounts?.mineCount || 0,
                },
                {
                  title: t("@Mentions"),
                  url: "/dashboard/inbox?tab=mentions",
                  icon: IconAt,
                  count: sectionCounts?.mentionsCount || 0,
                },
                {
                  title: t("Favourites"),
                  url: "/dashboard/inbox?tab=favourites",
                  icon: IconStar,
                  count: sectionCounts?.favouriteCount || 0,
                },
                {
                  title: t("Spam"),
                  url: "/dashboard/inbox?tab=spam",
                  icon: IconShieldExclamation,
                  count: sectionCounts?.spamCount || 0,
                },
                {
                  // No `group`: the filters read as a block under the tabs, and a
                  // "Filter" heading over them says nothing the rows do not.
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
                            // Contact-grained: picking one lists every ticket
                            // belonging to a customer carrying the label.
                            title: "Contact Labels",
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
                    ...(conversationTags.length > 0
                      ? [
                          {
                            // Ticket-grained, unlike Contact Labels above: picking
                            // one lists only the conversations carrying the tag.
                            title: "Conversation Tags",
                            isSectionHeader: true,
                            icon: IconHash,
                            showClearButton:
                              (chatFilterStore.filter.conversationTags?.length ?? 0) > 0,
                            clearFilter: () =>
                              chatFilterStore.setFilter({
                                ...chatFilterStore.filter,
                                conversationTags: [],
                              }),
                            items: conversationTags.map((tag) => ({
                              title: tag.name,
                              url: "#",
                              icon: (props: Record<string, unknown>) => (
                                <IconHash {...props} style={{ color: tag.color ?? undefined }} />
                              ),
                              handleClick: () => {
                                handleFilter("conversationTag", tag.id);
                              },
                              isActive: chatFilterStore.filter.conversationTags?.includes(tag.id),
                            })),
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
                            items: teams.map((team) => ({
                              title: team.name,
                              url: "#",
                              // Team colours are free-form (hex from the team editor, or the
                              // legacy "blue" default), so they stay an inline style like the
                              // conversation-tag dots rather than a Tailwind class.
                              icon: (props: Record<string, unknown>) => (
                                <IconUsers {...props} style={{ color: team.color || undefined }} />
                              ),
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
              icon: IconChartInfographic,
              items: [
                {
                  title: t("Overview"),
                  url: "/dashboard/analytics?tab=overview",
                  icon: IconChartBar,
                },
                {
                  title: t("Conversations"),
                  url: "/dashboard/analytics?tab=conversations",
                  icon: IconMessages,
                  // The agent and team drill-downs: /dashboard/analytics/<id> and /team/<id>.
                  ownsPaths: ["/dashboard/analytics/"],
                },
                {
                  title: t("Messages"),
                  url: "/dashboard/analytics?tab=messages",
                  icon: IconSend,
                },
                {
                  title: t("Logs"),
                  url: "/dashboard/analytics?tab=logs",
                  icon: IconLogs,
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
                // Lifecycle is no longer listed here: pipeline stages have taken
                // over the places it was read from. The page and the route are
                // still there for the surfaces that have not moved yet — the
                // inbox chip, automation conditions, Zapier and the Zoho CRM
                // mapping — so it stays reachable at
                // `/dashboard/contacts/lifecycle` until those are migrated.
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
              // The first item listed below that this person can see.
              url: hasTeamFeature(TeamFeature.Templates)
                ? "/dashboard/whatsapp/templates"
                : hasTeamFeature(TeamFeature.Chatbots)
                  ? "/dashboard/whatsapp/flowbots"
                  : hasTeamFeature(TeamFeature.Flows)
                    ? "/dashboard/whatsapp/flows"
                    : "/dashboard/whatsapp/conversational-components",
              icon: IconBrandWhatsapp,
              items: [
                ...(hasTeamFeature(TeamFeature.Templates)
                  ? [
                      {
                        title: t("Templates"),
                        url: "/dashboard/whatsapp/templates",
                        icon: IconTemplate,
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
                ...(hasTeamFeature(TeamFeature.Flows)
                  ? [
                      {
                        title: t("WhatsApp Flow"),
                        url: "/dashboard/whatsapp/flows",
                        icon: IconWaveSine,
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
              icon: IconShoppingCartBolt,
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
              url: LOYALTY_PATHS.overview,
              icon: IconGift,
              // Ten rows: one defines the programme, the rest run it. See loyalty.nav.ts.
              items: buildLoyaltyNavItems(loyaltyNav ?? { t, programState: null }),
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
      ...(hasTeamFeature(TeamFeature.Pipeline)
        ? [
            {
              title: t("Pipeline"),
              url: "/dashboard/pipeline",
              icon: IconFilterBolt,
              // Views and facets are built next to the pipeline's own
              // derivations so the sidebar counts and the board agree.
              items: buildPipelineNavItems(pipelineNav),
              progress: buildPipelineNavProgress(pipelineNav),
            },
          ]
        : []),
      ...(hasTeamFeature(TeamFeature.QrStudio)
        ? [
            {
              title: t("QR & Links"),
              url: "/dashboard/qr-codes",
              icon: IconQrcode,
              items: [
                {
                  title: t("QR codes"),
                  url: "/dashboard/qr-codes",
                  icon: IconQrcode,
                },
                {
                  title: t("Link pages"),
                  url: "/dashboard/link-pages",
                  icon: IconLayoutList,
                },
              ],
            },
          ]
        : []),
      ...(hasTeamFeature(TeamFeature.AiChatbot)
        ? [
            {
              title: "Meta AI Agent",
              url: "/dashboard/meta-agent",
              icon: IconRobotFace,
              // Each area of the agent is its own route, so the sidebar is the
              // navigation for them — with the setup guide's done ticks and meter
              // (see `metaAgent/metaAgent.nav.ts`).
              progress: buildMetaAgentNavProgress(metaAgentNav),
              items: buildMetaAgentNavItems(metaAgentNav),
            },
          ]
        : []),
      {
        title: t("Settings"),
        url: "/dashboard/settings",
        icon: IconSettings,
        items: [
          {
            group: t("Account Settings"),
            items: [
              {
                title: t("Account"),
                url: "/dashboard/settings/account",
                icon: IconUser,
              },
              ...(can("members.read")
                ? [
                    {
                      title: t("Members"),
                      url: "/dashboard/settings/members",
                      icon: IconUserCog,
                    },
                  ]
                : []),
              {
                title: t("Teams"),
                url: "/dashboard/settings/team",
                icon: IconUsers,
              },
            ],
          },
          // Both entries below are conditional, so the group itself has to be too — otherwise a
          // member with neither gets a bare "Platform Settings" heading with nothing under it.
          ...(can("channels.manage") || hasTeamFeature(TeamFeature.AppsServices)
            ? [
                {
                  group: t("Platform Settings"),
                  items: [
                    // Connecting or removing a WhatsApp/Instagram account changes messaging for
                    // the whole org, not just one team.
                    ...(can("channels.manage")
                      ? [
                          {
                            title: t("Channels"),
                            url: "/dashboard/settings/channels",
                            icon: IconMessage,
                          },
                        ]
                      : []),
                    ...(hasTeamFeature(TeamFeature.AppsServices)
                      ? [
                          {
                            title: "Integrations",
                            url: "/dashboard/settings/integrations",
                            icon: IconWebhook,
                          },
                        ]
                      : []),
                  ],
                },
              ]
            : []),
          {
            group: t("System Settings"),
            items: [
              {
                title: t("Security"),
                url: "/dashboard/settings/security",
                icon: IconShield,
              },
              ...(can("billing.read")
                ? [
                    {
                      title: t("Billing"),
                      url: "/dashboard/settings/billing",
                      icon: IconCreditCard,
                    },
                  ]
                : []),
            ],
          },
          ...(subscription?.orgId === import.meta.env.VITE_ROOT_ORG && can("billing.manage")
            ? [
                {
                  group: t("Admin Settings"),
                  items: [
                    {
                      title: t("Admin"),
                      url: "/admin",
                      icon: IconCrown,
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    ];
  }, [
    channels,
    chatFilterStore.filter.conversationTags,
    chatFilterStore.filter.labels,
    chatFilterStore.filter.lifecycle,
    chatFilterStore.filter.phone,
    contactLabels,
    conversationTags,
    handleFilter,
    hasTeamFeature,
    hiddenModules,
    lifecycles,
    pipelineNav,
    setupNav,
    staff.length,
    subscription,
    t,
    teams.length,
    user?.role,
    loyaltyNav,
    metaAgentNav,
  ]);
}
