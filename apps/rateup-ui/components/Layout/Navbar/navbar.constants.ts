//icon imports
import {
  IconActivity,
  IconAddressBook,
  IconApi,
  IconApps,
  IconAward,
  IconBrandHipchat,
  IconBrandTeams,
  IconBrandWhatsapp,
  IconBrowser,
  IconBuildingStore,
  IconCirclePlus,
  IconCircleX,
  IconDashboard,
  IconFileAnalytics,
  IconFileDescription,
  IconGift,
  IconHome2,
  IconLabel,
  IconLinkPlus,
  IconLogout,
  IconLogs,
  IconMessage,
  IconMessageBolt,
  IconMessageChatbot,
  IconMessageUp,
  IconQrcode,
  IconRobot,
  IconRobotFace,
  IconSettings,
  IconSocial,
  IconSpeakerphone,
  IconTemplate,
  IconTerminal2,
  IconTicket,
  IconUser,
  IconUsers,
  IconUserShare,
  IconUserX,
  IconWallpaper,
  IconWaveSine,
} from "@tabler/icons-react";

import { GetLabelsRes } from "@/backend/label/label.types";
import AddLabelSettings from "@/components/Contacts/AddLabelSettings";
import ColorSchemaButton from "@/components/theme/ColorSchemaButton";
import {
  AssignedInboxIcon,
  AssignedToMeInboxIcon,
  BlockedInboxIcon,
  ClosedInboxIcon,
  NewInboxIcon,
} from "@/components/whatsapp/inbox/chatselect";

import {
  SubscriptionFeaturePathName as sfpn,
  SubscriptionFeaturePathName,
} from "../../../types/enums";
import { getNestedProperty } from "../../../utils/misc/obj.utils";
import NotificationBellIcon from "../Notification";

const hiddenModules = process.env.NEXT_PUBLIC_HIDDEN_MODULES?.split(",") || [];

// Minimal Subscription type used locally
interface Subscription {
  orgId?: string;
  features?: Record<string, any>;
}

//navbar interface
export interface NavbarLinkProps {
  Icon: React.FC<any>;
  label: string;
  href?: string;
  submenus?: NavbarLinkProps[];
  role?: string;
  hasSubmenu?: boolean; // new: indicates if main link opens submenu
  onClick?: () => void; // new: for custom click handlers
}

//data Array consisting of NavbarTopData
export function getNavTopData(
  subscription?: Subscription,
  translations?: any,
  role?: string,
  labels?: GetLabelsRes[],
) {
  function hasFeature(featurePath: SubscriptionFeaturePathName) {
    if (!subscription) return false;
    return getNestedProperty(subscription.features, featurePath)?.active;
  }

  const navLinks = [
    {
      icon: IconHome2,
      label: translations("Home"),
      link: "/dashboard",
      hasSubmenu: false,
      children: [],
    },
    ...(hasFeature(sfpn.Whatsapp)
      ? [
          {
            icon: IconBrandHipchat,
            label: translations("Inbox"),
            hasSubmenu: true,
            children: [
              {
                label: translations("New"),
                link: "/dashboard/whatsapp/inbox?tab=New",
                icon: NewInboxIcon,
              },
              {
                label: translations("UnAssigned"),
                link: "/dashboard/whatsapp/inbox?tab=UnAssigned",
                icon: IconUserX,
              },
              {
                label: translations("Assigned"),
                link: "/dashboard/whatsapp/inbox?tab=Assigned",
                icon: AssignedInboxIcon,
              },
              {
                label: translations("Assigned to Me"),
                link: "/dashboard/whatsapp/inbox?tab=AssignedToMe",
                icon: AssignedToMeInboxIcon,
              },
              {
                label: translations("Closed"),
                link: "/dashboard/whatsapp/inbox?tab=Closed",
                icon: ClosedInboxIcon,
              },
              {
                label: translations("Sent"),
                link: "/dashboard/whatsapp/inbox?tab=Sent",
                icon: IconMessageUp,
              },
              {
                label: translations("All"),
                link: "/dashboard/whatsapp/inbox?tab=All",
                icon: IconMessage,
              },
              {
                label: translations("Blocked"),
                link: "/dashboard/whatsapp/inbox?tab=blocked",
                icon: BlockedInboxIcon,
              },
              {
                label: translations("Analytics"),
                link: "/dashboard/whatsapp/inbox?tab=analytics",
                icon: IconFileAnalytics,
              },
              {
                label: "Labels",
                icon: IconBrandHipchat,
                hasSubmenu: true,
                children: [
                  {
                    label: "Add Label",
                    icon: IconCirclePlus,
                  },
                  {
                    label: "Clear Label",
                    icon: IconCircleX,
                  },
                  ...(labels?.length
                    ? [
                        ...(Array.isArray(labels)
                          ? labels.map((lbl) => ({
                              label: lbl.name,
                              value: lbl.id,
                              color: lbl.color,
                              icon: IconBrandHipchat,
                            }))
                          : []),
                      ]
                    : []),
                ],
              },
            ],
          },
        ]
      : []),
    ...(hasFeature(sfpn.WhatsAppCampaign)
      ? [
          {
            icon: IconAddressBook,
            label: translations("Contacts"),
            hasSubmenu: true,
            children: [
              {
                label: translations("Contacts"),
                link: "/dashboard/contacts",
                icon: IconAddressBook,
              },
              {
                label: translations("labels"),
                link: "/dashboard/contacts/labels",
                icon: IconLabel,
              },
            ],
          },
        ]
      : []),
    ...(hasFeature(sfpn.WhatsAppCampaign)
      ? [
          {
            icon: IconSpeakerphone,
            label: translations("Campaigns"),
            hasSubmenu: true,
            children: [
              {
                label: translations("Campaigns"),
                link: "/dashboard/campaign",
                icon: IconSpeakerphone,
              },
              {
                label: "Drip Campaigns",
                link: "/dashboard/drip-campaigns",
                icon: IconMessageBolt,
              },
            ],
          },
        ]
      : []),

    ...(hasFeature(sfpn.Whatsapp)
      ? [
          {
            icon: IconBrandWhatsapp,
            label: translations("WhatsApp"),
            hasSubmenu: true,
            children: [
              ...(hasFeature(sfpn.WhatsAppFlow)
                ? [
                    {
                      label: translations("Flow"),
                      link: "/dashboard/whatsapp/flows",
                      icon: IconWaveSine,
                    },
                  ]
                : []),
              ...(hasFeature(sfpn.WhatsAppAutomation)
                ? [
                    {
                      label: translations("Automation"),
                      link: "/dashboard/whatsapp/automated-replies",
                      icon: IconRobot,
                    },
                  ]
                : []),
              ...(hasFeature(sfpn.WhatsAppTemplate)
                ? [
                    {
                      label: translations("Templates"),
                      link: "/dashboard/whatsapp/templates",
                      icon: IconTemplate,
                    },
                  ]
                : []),
              {
                label: "Catalog",
                link: "/dashboard/whatsapp/catalog",
                icon: IconBuildingStore,
              },
              {
                label: translations("Logs"),
                link: "/dashboard/whatsapp/logs",
                icon: IconLogs,
              },
              {
                label: translations("Settings"),
                link: "/dashboard/whatsapp/settings",
                icon: IconSettings,
              },
            ],
          },
        ]
      : []),
    ...(hasFeature(sfpn.Loyalty)
      ? [
          {
            icon: IconGift,
            label: translations("Loyalty"),
            hasSubmenu: true,
            children: [
              {
                label: translations("Dashboard"),
                link: "/dashboard/loyalty/dashboard",
                icon: IconDashboard,
              },
              {
                label: translations("Customers"),
                link: "/dashboard/loyalty/customer",
                icon: IconUsers,
              },
              {
                label: translations("Actions"),
                link: "/dashboard/loyalty/actions",
                icon: IconActivity,
              },
              {
                label: translations("Rewards"),
                link: "/dashboard/loyalty/rewards",
                icon: IconAward,
              },
              {
                label: translations("Settings"),
                link: "/dashboard/loyalty/settings",
                icon: IconSettings,
              },
              {
                label: "API Settings",
                link: "/dashboard/loyalty/api",
                icon: IconApi,
              },
            ],
          },
        ]
      : []),
    ...(hasFeature(sfpn.WebSurvey)
      ? [
          {
            icon: IconBrowser,
            label: translations("Web Forms"),
            hasSubmenu: true,
            children: [
              {
                label: translations("Surveys"),
                link: "/dashboard/surveys",
                icon: IconBrowser,
              },
              {
                label: translations("Templates"),
                link: "/dashboard/surveys/templates",
                icon: IconTemplate,
              },
              ...(!hiddenModules.includes("testimonial")
                ? [
                    {
                      label: translations("Testimonial"),
                      link: "/dashboard/testimonial",
                      icon: IconMessageChatbot,
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
    ...(hasFeature(sfpn.Ticket)
      ? [
          {
            icon: IconTicket,
            label: translations("Tickets"),
            link: "/dashboard/tickets",
            hasSubmenu: false,
          },
        ]
      : []),

    {
      icon: IconBrandTeams,
      label: translations("Teams"),
      link: "/dashboard/teams",
      disabled: role !== "SUPER_ADMIN",
      hasSubmenu: true,
      children: [
        {
          label: translations("Teams"),
          link: "/dashboard/teams",
          icon: IconSocial,
          disabled: role !== "SUPER_ADMIN",
        },
        ...(role === "SUPER_ADMIN"
          ? [
              {
                label: translations("All Members"),
                link: "/dashboard/members",
                icon: IconUsers,
              },
            ]
          : []),
      ],
    },
    {
      icon: IconQrcode,
      label: translations("QR Studio"),
      hasSubmenu: true,
      children: [
        {
          label: translations("QR Creator"),
          link: "/dashboard/qrCreator",
          icon: IconCirclePlus,
        },
        {
          label: translations("Access Links"),
          link: "/dashboard/quickAccessLinks",
          icon: IconLinkPlus,
        },
        {
          label: translations("Landing Pages"),
          link: "/dashboard/landingPages",
          icon: IconWallpaper,
        },
      ],
    },
    ...(hasFeature(sfpn.AI)
      ? [
          {
            icon: IconRobotFace,
            label: "ChatBot",
            link: "/dashboard/chatbot",
            hasSubmenu: false,
          },
        ]
      : []),
    {
      icon: IconApps,
      label: translations("Apps & Services"),
      link: "/dashboard/apps&services",
      hasSubmenu: false,
    },
    ...(hasFeature(sfpn.Menu)
      ? [
          {
            icon: IconFileDescription,
            label: translations("Digital Menu"),
            link: "/dashboard/menu",
            hasSubmenu: false,
          },
        ]
      : []),
  ];
  const lastLinksData = [
    { icon: NotificationBellIcon, label: "Notifications" },
    ...(process.env.NEXT_PUBLIC_EXPERIMENT
      ? [{ icon: ColorSchemaButton, label: "Dark Mode" }]
      : []),
    {
      icon: IconLogout,
      label: "Logout",
      children: [
        {
          label: "Logout",
          link: "/logout",
          icon: IconLogout,
        },
      ],
    },
    {
      icon: IconUser,
      label: translations("Account"),
      children: [
        {
          label: translations("Account"),
          link: "/dashboard/settings",
          icon: IconUserShare,
        },
        ...(subscription?.orgId === process.env.NEXT_PUBLIC_ROOT_ORG
          ? [
              {
                label: translations("Admin"),
                link: "/admin",
                icon: IconTerminal2,
              },
            ]
          : []),
        {
          label: translations("Logout"),
          link: "/logout",
          icon: IconLogout,
        },
      ],
    },
  ];
  return [navLinks, lastLinksData];
}
