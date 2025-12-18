import { useMemo } from "react";

import {
  IconActivity,
  IconApi,
  IconApps,
  IconAward,
  IconBrandWhatsapp,
  IconBrowser,
  IconBuildings,
  IconBuildingStore,
  IconCirclePlus,
  IconDashboard,
  IconFileAnalytics,
  IconFileDescription,
  IconGift,
  IconHome2,
  IconLabel,
  IconLinkPlus,
  IconLogs,
  IconMessageBolt,
  IconMessageChatbot,
  IconQrcode,
  IconRobotFace,
  IconSettings,
  IconSitemap,
  IconSpeakerphone,
  IconTemplate,
  IconTerminal2,
  IconTicket,
  IconUser,
  IconUsers,
  IconUserX,
  IconWallpaper,
  IconWaveSine,
} from "@tabler/icons-react";
import {
  Activity,
  ChartColumn,
  CircleCheckBig,
  FileChartColumn,
  FileSpreadsheet,
  Folder,
  Inbox,
  MessageSquareDot,
  Settings,
  Sparkles,
  Tag,
  User,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";

import { SubscriptionFeaturePathName as sfpn } from "@/types/enums";
import { UserSelector } from "@/components/Contacts/CreateContactModal";
import { hasFeature } from "@/utils/subscription/subscription";

export function useNavMain({
  subscription,
  lifecycles,
  contactLabels,
  staff,
  teams,
  t,
  chatFilterStore,
  hiddenModules,
  handleFilter,
  userId,
}: any) {
  return useMemo(
    () => [
      {
        title: t("Home"),
        url: "/dashboard",
        icon: IconHome2,
        items: [],
      },
      ...(hasFeature(subscription, sfpn.Whatsapp)
        ? [
            {
              title: t("Inbox"),
              url: "/dashboard/inbox?tab=New",
              icon: Inbox,
              items: [
                {
                  title: t("New"),
                  url: "/dashboard/inbox?tab=UnAssigned",
                  icon: Sparkles,
                },
                // {
                //   title: t("New"),
                //   url: "/dashboard/inbox?tab=New",
                //   icon: MessageSquareDot,
                // },
                // {
                //   title: t("All"),
                //   url: "/dashboard/inbox?tab=All",
                //   icon: Inbox,
                // },
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
                  title: t("Addressed"),
                  url: "/dashboard/inbox?tab=Addressed",
                  icon: CircleCheckBig,
                },
                {
                  group: "Filter",
                  items: [
                    ...(lifecycles.length > 0
                      ? [
                          {
                            title: "Lifecycle",
                            icon: IconActivity,
                            items: lifecycles.map((lbl) => ({
                              title: `${lbl.emoji ? lbl.emoji + " " : ""}${lbl.name}`,
                              url: "#",
                              handleClick: () => {
                                handleFilter("lifecycle", lbl.id);
                              },
                              isActive:
                                chatFilterStore.filter.lifecycle === lbl.id,
                            })),
                            hasSepeartorOnTop: true,
                          },
                        ]
                      : []),
                    ...(contactLabels.length > 0
                      ? [
                          {
                            title: "Labels",
                            icon: IconLabel,
                            items: contactLabels.map((lbl) => ({
                              title: lbl.name,
                              url: "#",
                              icon: (props: any) => (
                                <div
                                  {...props}
                                  className={`rounded-full ${props?.className ?? ""}`}
                                  style={{
                                    background: lbl?.color,
                                  }}
                                />
                              ),
                              handleClick: () => {
                                handleFilter("label", lbl.id);
                              },
                              isActive: chatFilterStore.filter.labels?.includes(
                                lbl.id,
                              ),
                            })),
                          },
                        ]
                      : []),
                    ...(staff.length > 0
                      ? [
                          {
                            title: "Staff",
                            icon: User,
                            type: "component",
                            componentKey: "staffSelector",
                          },
                        ]
                      : []),
                    ...(teams.length > 0
                      ? [
                          {
                            title: "Teams",
                            icon: Users,
                            type: "component",
                            componentKey: "teamSelector",
                          },
                        ]
                      : []),
                  ],
                },
                {
                  title: "Analytics",
                  url: "/dashboard/inbox?tab=analytics",
                  icon: ChartColumn,
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
      ...(hasFeature(subscription, sfpn.WhatsAppCampaign)
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
      ...(hasFeature(subscription, sfpn.WhatsAppCampaign)
        ? [
            {
              title: t("Campaigns"),
              url: "/dashboard/campaign",
              icon: IconSpeakerphone,
              items: [
                {
                  title: t("Campaigns"),
                  url: "/dashboard/campaign",
                  icon: IconSpeakerphone,
                },
                {
                  title: "Drip Campaigns",
                  url: "/dashboard/drip-campaigns",
                  icon: IconMessageBolt,
                },
              ],
            },
          ]
        : []),
      ...(hasFeature(subscription, sfpn.Whatsapp)
        ? [
            {
              title: t("WhatsApp"),
              url: "/dashboard/whatsapp/flows",
              icon: IconBrandWhatsapp,
              items: [
                ...(hasFeature(subscription, sfpn.WhatsAppFlow)
                  ? [
                      {
                        title: t("Flow"),
                        url: "/dashboard/whatsapp/flows",
                        icon: IconWaveSine,
                      },
                    ]
                  : []),
                ...(hasFeature(subscription, sfpn.WhatsAppAutomation)
                  ? [
                      {
                        title: t("Flowbots"),
                        url: "/dashboard/whatsapp/flowbots",
                        icon: IconSitemap,
                      },
                    ]
                  : []),
                ...(hasFeature(subscription, sfpn.WhatsAppTemplate)
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
                  title: t("Logs"),
                  url: "/dashboard/whatsapp/logs",
                  icon: IconLogs,
                },
                {
                  title: t("Settings"),
                  url: "/dashboard/whatsapp/settings",
                  icon: IconSettings,
                },
              ],
            },
          ]
        : []),
      {
        title: t("Rules"),
        url: "/dashboard/rules",
        icon: Zap,
      },
      ...(hasFeature(subscription, sfpn.Loyalty)
        ? [
            {
              title: t("Loyalty"),
              url: "/dashboard/loyalty/dashboard",
              icon: IconGift,
              items: [
                {
                  title: t("Dashboard"),
                  url: "/dashboard/loyalty/dashboard",
                  icon: IconDashboard,
                },
                {
                  title: t("Customers"),
                  url: "/dashboard/loyalty/customer",
                  icon: IconUsers,
                },
                {
                  title: t("Actions"),
                  url: "/dashboard/loyalty/actions",
                  icon: IconActivity,
                },
                {
                  title: t("Rewards"),
                  url: "/dashboard/loyalty/rewards",
                  icon: IconAward,
                },
                {
                  title: t("Settings"),
                  url: "/dashboard/loyalty/settings",
                  icon: IconSettings,
                },
                {
                  title: "API Settings",
                  url: "/dashboard/loyalty/api",
                  icon: IconApi,
                },
              ],
            },
          ]
        : []),
      ...(hasFeature(subscription, sfpn.WebSurvey)
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
      ...(hasFeature(subscription, sfpn.Ticket)
        ? [
            {
              title: t("Tickets"),
              url: "/dashboard/tickets",
              icon: IconTicket,
              items: [],
            },
          ]
        : []),
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
      ...(hasFeature(subscription, sfpn.AI)
        ? [
            {
              title: "ChatBot",
              url: "/dashboard/chatbot",
              icon: IconRobotFace,
              items: [],
            },
          ]
        : []),
      {
        title: t("Apps & Services"),
        url: "/dashboard/apps&services",
        icon: IconApps,
        items: [
          {
            title: "home",
            url: "/dashboard/apps&services",
            icon: IconApps,
          },
          {
            title: "apps",
            icon: IconApps,
            items: [
              {
                title: "Shopify",
                url: "/dashboard/apps&services/shopify",
                icon: IconBuildingStore,
              },
              {
                title: "Google Sheet",
                url: "/dashboard/apps&services/googlesheet",
                icon: IconFileAnalytics,
              },
              {
                title: "Amelia",
                url: "/dashboard/apps&services/amelia",
                icon: IconUser,
              },
              {
                title: "Whatsapp Payment",
                url: "/dashboard/apps&services/waPayment",
                icon: IconBrandWhatsapp,
              },
              {
                title: "Petpooja",
                url: "/dashboard/apps&services/petpooja",
                icon: IconBuildings,
              },
              {
                title: "Zapier",
                url: "/dashboard/apps&services/zapier",
                icon: IconApi,
              },
            ],
          },

          {
            title: "Encryption",
            url: "/dashboard/apps&services/encryption",
            icon: IconTerminal2,
          },
          {
            title: "API Service",
            url: "/dashboard/apps&services/apiservice",
            icon: IconApi,
          },
          {
            title: "Widget",
            url: "/dashboard/apps&services/widget",
            icon: IconBrowser,
          },
        ],
      },
      ...(hasFeature(subscription, sfpn.Menu)
        ? [
            {
              title: t("Digital Menu"),
              url: "/dashboard/menu",
              icon: IconFileDescription,
              items: [],
            },
          ]
        : []),
      {
        title: t("Settings"),
        url: "/dashboard/settings",
        icon: IconSettings,
        items: [],
      },
    ],
    [
      subscription,
      lifecycles,
      contactLabels,
      t,
      chatFilterStore.filter?.labels,
      chatFilterStore.filter?.lifecycle,
      hiddenModules,
    ],
  );
}
