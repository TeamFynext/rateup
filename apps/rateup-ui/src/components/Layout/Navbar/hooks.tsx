import {
  IconActivity,
  IconAward,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconBrowser,
  IconBuildingStore,
  IconCirclePlus,
  IconDashboard,
  IconFileDescription,
  IconGift,
  IconLinkPlus,
  IconMessageChatbot,
  IconQrcode,
  IconRobotFace,
  IconSettings,
  IconSitemap,
  IconTemplate,
  IconTerminal2,
  IconTicket,
  IconUser,
  IconUsers,
  IconWaveSine,
} from "@tabler/icons-react";
import {
  Activity,
  Award,
  BarChart,
  ChartColumnBig,
  ChartLine,
  CircleCheckBig,
  Clock,
  CreditCard,
  Crown,
  FileSpreadsheet,
  FileText,
  Folder,
  Inbox,
  Logs,
  MessageSquare,
  Send,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Tag,
  User,
  UserCheck,
  UserCog,
  Users,
  Webhook,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { SubscriptionFeaturePathName as sfpn, TeamFeature } from "@/types/enums.ts";
import { UserRole } from "@/utils/enums/index.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";

export function useNavMain({
  subscription,
  lifecycles,
  contactLabels,
  staff,
  teams,
  chatFilterStore,
  hiddenModules,
  handleFilter,
  allowedFeatures,
  user,
}: any) {
  const { t } = useTranslation();

  const LifecycleIcon = () => <IconActivity className="h-3 w-3 text-amber-400" />;
  const LabelIcon = () => <Tag className="h-3 w-3 text-blue-400" />;
  const UserIcon = () => <User className="h-3 w-3 text-green-400" />;
  const TeamIcon = () => <Users className="h-3 w-3 text-purple-400" />;
  // null = bypass (OWNER/ADMIN/SUPER_ADMIN), Set = restrict to enabled features (MEMBER)
  const hasTeamFeature = (feature: TeamFeature) =>
    allowedFeatures === null || allowedFeatures.has(feature);
  return useMemo(
    () => [
      // {
      //   title: t("Home"),
      //   url: "/dashboard",
      //   icon: IconHome2,
      //   items: [],
      // },

      ...(hasFeature(subscription, sfpn.Whatsapp) && hasTeamFeature(TeamFeature.Inbox)
        ? [
            {
              title: t("Inbox"),
              url: "/dashboard/inbox?tab=New",
              icon: Inbox,
              items: [
                {
                  title: t("New"),
                  url: "/dashboard/inbox?tab=New",
                  icon: Sparkles,
                },
                {
                  title: t("Assigned"),
                  url: "/dashboard/inbox?tab=Assigned",
                  icon: UserCheck,
                },
                {
                  title: t("Mine"),
                  url: "/dashboard/inbox?tab=mine",
                  icon: IconUser,
                },

                {
                  title: t("Closed"),
                  url: "/dashboard/inbox?tab=Addressed",
                  icon: CircleCheckBig,
                },
                {
                  title: t("All"),
                  url: "/dashboard/inbox?tab=All",
                  icon: Inbox,
                },
                {
                  group: "Filter",
                  items: [
                    ...(lifecycles.length > 0
                      ? [
                          {
                            title: "Lifecycle",
                            isSectionHeader: true,
                            icon: LifecycleIcon,
                            showClearButton: !!chatFilterStore.filter.lifecycle,
                            clearFilter: () =>
                              chatFilterStore.setFilter({
                                ...chatFilterStore.filter,
                                lifecycle: "",
                              }),
                            items: lifecycles.map((lbl) => ({
                              icon: (props) => <div {...props}>{lbl.emoji}</div>,
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
                            icon: LabelIcon,
                            showClearButton: chatFilterStore.filter.labels?.length > 0,
                            clearFilter: () =>
                              chatFilterStore.setFilter({
                                ...chatFilterStore.filter,
                                labels: [],
                              }),
                            items: contactLabels.map((lbl) => ({
                              title: lbl.name,
                              url: "#",
                              icon: (props) => (
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
                            })),
                          },
                        ]
                      : []),
                    ...(staff.length > 0
                      ? [
                          {
                            title: "Users",
                            isSectionHeader: true,
                            icon: UserIcon,
                            showClearButton: chatFilterStore.filter.assignedUserIds?.length > 0,
                            clearFilter: () =>
                              chatFilterStore.setFilter({
                                ...chatFilterStore.filter,
                                assignedUserIds: [],
                              }),
                            items: staff.map((member) => ({
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
                            icon: TeamIcon,
                            showClearButton: chatFilterStore.filter.assignedTeams?.length > 0,
                            clearFilter: () =>
                              chatFilterStore.setFilter({
                                ...chatFilterStore.filter,
                                assignedTeams: [],
                              }),
                            items: teams.map((team) => ({
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
                  icon: Settings,
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
              icon: ChartColumnBig,
              items: [
                {
                  title: t("Overview"),
                  url: "/dashboard/analytics?tab=overview",
                  icon: BarChart,
                },
                {
                  title: t("Agent Performance"),
                  url: "/dashboard/analytics?tab=agent-performance",
                  icon: Award,
                },
                {
                  title: t("Team Performance"),
                  url: "/dashboard/analytics?tab=team-performance",
                  icon: Activity,
                },
                {
                  title: t("Message Analytics"),
                  url: "/dashboard/analytics?tab=api-analytics",
                  icon: ChartLine,
                },
                {
                  title: t("Message Logs"),
                  url: "/dashboard/analytics?tab=message-logs",
                  icon: Logs,
                },
                {
                  title: t("Team Activity"),
                  url: "/dashboard/analytics?tab=team-activity",
                  icon: FileText,
                },
              ],
            },
          ]
        : []),
      ...(hasFeature(subscription, sfpn.WhatsAppCampaign) && hasTeamFeature(TeamFeature.Contacts)
        ? [
            {
              title: t("Contacts"),
              url: "/dashboard/contacts",
              icon: Users,
              items: [
                {
                  title: t("All Contacts"),
                  url: "/dashboard/contacts",
                  icon: Users,
                },
                {
                  title: t("Groups"),
                  url: "/dashboard/contacts/groups",
                  icon: Folder,
                },
                {
                  title: t("Custom Fields"),
                  url: "/dashboard/contacts/custom-fields",
                  icon: FileSpreadsheet,
                },
                {
                  title: t("Labels"),
                  url: "/dashboard/contacts/labels",
                  icon: Tag,
                },
                {
                  title: t("Lifecycle"),
                  url: "/dashboard/contacts/lifecycle",
                  icon: Activity,
                },
              ],
            },
          ]
        : []),
      ...(hasFeature(subscription, sfpn.WhatsAppCampaign) && hasTeamFeature(TeamFeature.Campaigns)
        ? [
            {
              title: t("Campaign"),
              url: "/dashboard/campaign",
              icon: Send,
            },
          ]
        : []),
      ...(hasFeature(subscription, sfpn.Whatsapp) &&
      (hasTeamFeature(TeamFeature.Flows) ||
        hasTeamFeature(TeamFeature.Chatbots) ||
        hasTeamFeature(TeamFeature.Templates) ||
        hasTeamFeature(TeamFeature.Automation))
        ? [
            {
              title: t("WhatsApp"),
              url: "/dashboard/whatsapp/flows",
              icon: IconBrandWhatsapp,
              items: [
                ...(hasFeature(subscription, sfpn.WhatsAppFlow) && hasTeamFeature(TeamFeature.Flows)
                  ? [
                      {
                        title: t("Flow"),
                        url: "/dashboard/whatsapp/flows",
                        icon: IconWaveSine,
                      },
                    ]
                  : []),
                ...(hasFeature(subscription, sfpn.WhatsAppAutomation) &&
                hasTeamFeature(TeamFeature.Chatbots)
                  ? [
                      {
                        title: t("Chatbot"),
                        url: "/dashboard/whatsapp/flowbots",
                        icon: IconSitemap,
                      },
                    ]
                  : []),
                ...(hasFeature(subscription, sfpn.WhatsAppTemplate) &&
                hasTeamFeature(TeamFeature.Templates)
                  ? [
                      {
                        title: t("Templates"),
                        url: "/dashboard/whatsapp/templates",
                        icon: IconTemplate,
                      },
                    ]
                  : []),
                {
                  title: "Catalog",
                  url: "/dashboard/whatsapp/catalog",
                  icon: IconBuildingStore,
                },
                {
                  title: t("Orders"),
                  url: "/dashboard/whatsapp/orders",
                  icon: ShoppingCart,
                },
                {
                  title: t("Payments"),
                  url: "/dashboard/whatsapp/payments",
                  icon: CreditCard,
                },
                {
                  title: t("Conversational"),
                  url: "/dashboard/whatsapp/conversational-components",
                  icon: MessageSquare,
                },
              ],
            },
            ...(hasFeature(subscription, sfpn.WhatsAppAutomation) &&
            hasTeamFeature(TeamFeature.Chatbots)
              ? [
                  {
                    title: t("Instagram"),
                    url: "/dashboard/instagram",
                    icon: IconBrandInstagram,
                  },
                ]
              : []),
            ...(hasFeature(subscription, sfpn.WhatsAppAutomation) &&
            hasTeamFeature(TeamFeature.Automation)
              ? [
                  {
                    title: t("Automation"),
                    url: "/dashboard/automation",
                    icon: Zap,
                  },
                ]
              : []),
          ]
        : []),

      ...(hasFeature(subscription, sfpn.Loyalty) && hasTeamFeature(TeamFeature.Loyalty)
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
                  icon: ShoppingCart,
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
                  icon: Clock,
                },
                {
                  title: t("Approvals"),
                  url: "/dashboard/loyalty/approvals",
                  icon: UserCheck,
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
      ...(hasFeature(subscription, sfpn.WebSurvey) && hasTeamFeature(TeamFeature.WebForms)
        ? [
            {
              title: t("Web Forms"),
              url: "/dashboard/surveys",
              icon: IconBrowser,
              items: [
                {
                  title: t("Surveys"),
                  url: "/dashboard/surveys",
                  icon: IconBrowser,
                },
                {
                  title: t("Templates"),
                  url: "/dashboard/surveys/templates",
                  icon: IconTemplate,
                },
                ...(hiddenModules.includes("testimonial")
                  ? []
                  : [
                      {
                        title: t("Testimonial"),
                        url: "/dashboard/testimonial",
                        icon: IconMessageChatbot,
                      },
                    ]),
              ],
            },
          ]
        : []),
      ...(hasFeature(subscription, sfpn.Ticket) && hasTeamFeature(TeamFeature.Tickets)
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
      ...(hasFeature(subscription, sfpn.AI) && hasTeamFeature(TeamFeature.AiChatbot)
        ? [
            {
              title: "ChatBot",
              url: "/dashboard/chatbot",
              icon: IconRobotFace,
              items: [],
            },
          ]
        : []),
      // ...(hasFeature(subscription, sfpn.Menu) &&
      // hasTeamFeature(TeamFeature.DigitalMenu)
      //   ? [
      //       {
      //         title: t("Digital Menu"),
      //         url: "/dashboard/menu",
      //         icon: IconFileDescription,
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
                icon: User,
                description: t("Business profile & preferences"),
              },
              ...(user?.role === UserRole.SUPADM
                ? [
                    {
                      title: t("Users"),
                      url: "/dashboard/settings/users",
                      icon: UserCog,
                      description: t("User accounts & access"),
                    },
                  ]
                : []),
              {
                title: t("Team"),
                url: "/dashboard/settings/team",
                icon: Users,
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
                      icon: MessageSquare,
                      description: t("Communication channels"),
                    },
                  ]
                : []),
              ...(hasTeamFeature(TeamFeature.AppsServices)
                ? [
                    {
                      title: "Integrations",
                      url: "/dashboard/settings/integrations",
                      icon: Webhook,
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
                icon: Shield,
                description: t("Password & security"),
              },
              ...(user?.role === UserRole.SUPADM
                ? [
                    {
                      title: t("Billing"),
                      url: "/dashboard/settings/billing",
                      icon: CreditCard,
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
                      icon: Crown,
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
      chatFilterStore.filter.labels,
      chatFilterStore.filter.lifecycle,
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
