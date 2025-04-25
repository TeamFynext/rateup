//icon imports
import {
  IconActivity,
  IconAddressBook,
  IconApps,
  IconAutomation,
  IconAward,
  IconBrandHipchat,
  IconBrandTeams,
  IconBrandWhatsapp,
  IconBrowser,
  IconCirclePlus,
  IconDashboard,
  IconFileDescription,
  IconGift,
  IconHome2,
  IconInvoice,
  IconLinkPlus,
  IconLogout,
  IconLogs,
  IconMessage,
  IconMessageBolt,
  IconMessageCancel,
  IconMessageChatbot,
  IconMessageCheck,
  IconPin,
  IconPinned,
  IconQrcode,
  IconRobotFace,
  IconSettings,
  IconSocial,
  IconSpeakerphone,
  IconTemplate,
  IconTerminal2,
  IconTicket,
  IconUser,
  IconUserCircle,
  IconUserFilled,
  IconUsers,
  IconUsersGroup,
  IconUserShare,
  IconWallpaper,
  IconWaveSine,
} from "@tabler/icons-react";

import ColorSchemaButton from "@/components/theme/ColorSchemaButton";
import {
  AllInboxIcon,
  AssignedInboxIcon,
  AssignedToMeInboxIcon,
  BlockedInboxIcon,
  ClosedInboxIcon,
  NewInboxIcon,
  SentInboxIcon,
  UnAssignedInboxIcon,
} from "@/components/whatsapp/inbox/chatselect";

import {
  SubscriptionFeaturePathName as sfpn,
  SubscriptionFeaturePathName,
} from "../../../types/enums";
import { getNestedProperty } from "../../../utils/misc/obj.utils";

const hiddenModules = process.env.NEXT_PUBLIC_HIDDEN_MODULES?.split(",") || [];
//navbar interface
export interface NavbarLinkProps {
  Icon: React.FC<any>;
  label: string;
  href?: string;
  submenus?: NavbarLinkProps[];
  role?: string;
}
interface Translations {
  [key: string]: string; // Allows for any string key with string values
}

//data Array consisting of NavbarTopData
export function getNavTopData(
  subscription?: Subscription,
  translations?: Translations,
  role?: string,
) {
  function hasFeature(featurePath: SubscriptionFeaturePathName) {
    if (!subscription) return false;
    return getNestedProperty(subscription.features, featurePath)?.active;
  }

  const navLinks = [
    {
      icon: IconHome2,
      label: translations["Home"],
      link: "/dashboard",
      children: [
        {
          label: "Dashboard",
          link: "/dashboard",
          icon: IconDashboard,
          disabled: true,
        },
      ],
    },
    ...(hasFeature(sfpn.Whatsapp)
      ? [
          {
            icon: IconBrandHipchat,
            label: translations["Inbox"],
            children: [
              {
                label: translations["New"],
                link: "/dashboard/whatsapp/inbox?tab=New",
                icon: NewInboxIcon,
              },
              {
                label: translations["UnAssigned"],
                link: "/dashboard/whatsapp/inbox?tab=UnAssigned",
                icon: UnAssignedInboxIcon,
              },
              {
                label: translations["Assigned"],
                link: "/dashboard/whatsapp/inbox?tab=Assigned",
                icon: AssignedInboxIcon,
              },
              {
                label: translations["Assigned to Me"],
                link: "/dashboard/whatsapp/inbox?tab=AssignedToMe",
                icon: AssignedToMeInboxIcon,
              },
              {
                label: translations["Closed"],
                link: "/dashboard/whatsapp/inbox?tab=Closed",
                icon: ClosedInboxIcon,
              },
              {
                label: translations["Sent"],
                link: "/dashboard/whatsapp/inbox?tab=Sent",
                icon: SentInboxIcon,
              },
              {
                label: translations["All"],
                link: "/dashboard/whatsapp/inbox?tab=All",
                icon: AllInboxIcon,
              },
              {
                label: translations["Blocked Contacts"],
                link: "/dashboard/whatsapp/inbox?tab=blocked",
                icon: BlockedInboxIcon,
              },
            ],
          },
        ]
      : []),
    ...(hasFeature(sfpn.WhatsAppCampaign)
      ? [
          {
            icon: IconSpeakerphone,
            label: translations["Campaigns"],
            children: [
              {
                label: translations["Campaigns"],
                link: "/dashboard/campaign",
                icon: IconSpeakerphone,
              },
              {
                label: translations["Contacts"],
                link: "/dashboard/contacts",
                icon: IconAddressBook,
              },
            ],
          },
        ]
      : []),
    ...(hasFeature(sfpn.Whatsapp)
      ? [
          {
            icon: IconBrandWhatsapp,
            label: translations["WhatsApp"],
            children: [
              ...(hasFeature(sfpn.WhatsAppFlow)
                ? [
                    {
                      label: translations["Flow"],
                      link: "/dashboard/whatsapp/flows",
                      icon: IconWaveSine,
                    },
                  ]
                : []),
              {
                label: translations["Automation"],
                link: "/dashboard/whatsapp/automated-replies",
                icon: IconAutomation,
              },
              ...(hasFeature(sfpn.WhatsAppTemplate)
                ? [
                    {
                      label: translations["Templates"],
                      link: "/dashboard/whatsapp/templates",
                      icon: IconTemplate,
                    },
                  ]
                : []),
              {
                label: translations["Logs"],
                link: "/dashboard/whatsapp/logs",
                icon: IconLogs,
              },
              {
                label: translations["Settings"],
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
            label: translations["Loyalty"],
            children: [
              {
                label: translations["Dashboard"],
                link: "/dashboard/loyalty/dashboard",
                icon: IconDashboard,
              },
              {
                label: translations["Customers"],
                link: "/dashboard/loyalty/customer",
                icon: IconUsers,
              },
              {
                label: translations["Actions"],
                link: "/dashboard/loyalty/actions",
                icon: IconActivity,
              },
              {
                label: translations["Rewards"],
                link: "/dashboard/loyalty/rewards",
                icon: IconAward,
              },
              {
                label: translations["Settings"],
                link: "/dashboard/loyalty/settings",
                icon: IconSettings,
              },
            ],
          },
        ]
      : []),
    ...(hasFeature(sfpn.WebSurvey)
      ? [
          {
            icon: IconBrowser,
            label: translations["Web Forms"],
            children: [
              {
                label: translations["Surveys"],
                link: "/dashboard/surveys",
                icon: IconBrowser,
              },
              {
                label: translations["Templates"],
                link: "/dashboard/surveys/templates",
                icon: IconTemplate,
              },
              ...(!hiddenModules.includes("testimonial")
                ? [
                    {
                      label: translations["Testimonial"],
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
            label: translations["Tickets"],
            link: "/dashboard/tickets",
            children: [
              {
                label: translations["Tickets"],
                link: "/dashboard/tickets",
                icon: IconTicket,
                disabled: true,
              },
            ],
          },
        ]
      : []),

    {
      icon: IconBrandTeams,
      label: translations["Teams"],
      link: "/dashboard/teams",
      disabled: role !== "SUPER_ADMIN",
      children: [
        {
          label: translations["Teams"],
          link: "/dashboard/teams",
          icon: IconSocial,
          disabled: role !== "SUPER_ADMIN",
        },
        ...(role === "SUPER_ADMIN"
          ? [
              {
                label: translations["All Members"],
                link: "/dashboard/members",
                icon: IconUsers,
              },
            ]
          : []),
      ],
    },
    {
      icon: IconQrcode,
      label: translations["QR Studio"],
      children: [
        {
          label: translations["QR Creator"],
          link: "/dashboard/qrCreator",
          icon: IconCirclePlus,
        },
        {
          label: translations["Access Links"],
          link: "/dashboard/quickAccessLinks",
          icon: IconLinkPlus,
        },
        {
          label: translations["Landing Pages"],
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
            children: [
              {
                label: "ChatBot",
                link: "/dashboard/chatbot",
                icon: IconRobotFace,
                disabled: true,
              },
            ],
          },
        ]
      : []),
    {
      icon: IconApps,
      label: translations["Apps & Services"],
      link: "/dashboard/apps&services",
      children: [
        {
          label: translations["Apps & Services"],
          link: "/dashboard/apps&services",
          icon: IconApps,
          disabled: true,
        },
      ],
    },
    ...(hasFeature(sfpn.Menu)
      ? [
          {
            icon: IconFileDescription,
            label: translations["Digital Menu"],
            link: "/dashboard/menu",
            children: [
              {
                label: translations["Menu"],
                link: "/dashboard/menu",
                icon: IconFileDescription,
                disabled: true,
              },
            ],
          },
        ]
      : []),
  ];
  const lastLinksData = [
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
      label: translations["Account"],
      children: [
        {
          label: translations["Account"],
          link: "/dashboard/settings",
          icon: IconUserShare,
        },
        ...(subscription?.orgId === process.env.NEXT_PUBLIC_ROOT_ORG
          ? [
              {
                label: translations["Admin"],
                link: "/admin",
                icon: IconTerminal2,
              },
            ]
          : []),
        {
          label: translations["Logout"],
          link: "/logout",
          icon: IconLogout,
        },
      ],
    },
  ];
  return [navLinks, lastLinksData];
}

//data Array consisting of NavbarBottomData
const navBottomData = (translations?: Translations): Array<NavbarLinkProps> => [
  {
    Icon: IconSettings,
    label: translations["Settings"],
    href: "/dashboard/settings",
  },
  { Icon: IconLogout, label: translations["Logout"], href: "/logout" },
];
