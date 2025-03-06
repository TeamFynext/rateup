//icon imports
import {
  IconActivity,
  IconAddressBook,
  IconApps,
  IconAutomation,
  IconAward,
  IconBrandTeams,
  IconBrandWhatsapp,
  IconCirclePlus,
  IconDashboard,
  IconFileDescription,
  IconFileInfo,
  IconForms,
  IconGift,
  IconHome2,
  IconInbox,
  IconInvoice,
  IconLinkPlus,
  IconLogout,
  IconLogs,
  IconMessage,
  IconMessageBolt,
  IconMessageChatbot,
  IconQrcode,
  IconSettings,
  IconSocial,
  IconSpeakerphone,
  IconTemplate,
  IconTerminal2,
  IconTicket,
  IconUser,
  IconUsers,
  IconUsersGroup,
  IconUserShare,
  IconWallpaper,
  IconWaveSine,
} from "@tabler/icons-react";

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
            icon: IconInbox,
            label: translations["Inbox"],
            children: [
              {
                label: translations["New"],
                link: "/dashboard/whatsapp/inbox?tab=New",
                icon: IconMessageBolt,
              },
              {
                label: translations["All"],
                link: "/dashboard/whatsapp/inbox?tab=All",
                icon: IconMessage,
              },
            ],
          },
        ]
      : []),
    ...(hasFeature(sfpn.WhatsAppCampaign)
      ? [
          {
            icon: IconAddressBook,
            label: translations["Contacts"],
            children: [
              {
                label: translations["Groups"],
                link: "/dashboard/contacts?tab=groups",
                icon: IconUsersGroup,
              },
              {
                label: translations["All Contacts"],
                link: "/dashboard/contacts?tab=contacts",
                icon: IconAddressBook,
              },
              {
                label: translations["Settings"],
                link: "/dashboard/contacts?tab=settings",
                icon: IconSettings,
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
              ...(hasFeature(sfpn.WhatsAppTemplate)
                ? [
                    {
                      label: translations["Templates"],
                      link: "/dashboard/whatsapp/templates",
                      icon: IconTemplate,
                    },
                  ]
                : []),
              ...(hasFeature(sfpn.WhatsAppCampaign)
                ? [
                    {
                      label: translations["Campaigns"],
                      link: "/dashboard/campaign",
                      icon: IconSpeakerphone,
                    },
                  ]
                : []),
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
            icon: IconForms,
            label: translations["Web Forms"],
            children: [
              {
                label: translations["Surveys"],
                link: "/dashboard/surveys",
                icon: IconFileDescription,
              },
              {
                label: translations["Testimonial"],
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
      children: [
        {
          label: translations["Teams"],
          link: "/dashboard/teams",
          icon: IconSocial,
          disabled: subscription.orgId !== process.env.NEXT_PUBLIC_ROOT_ORG,
        },
        ...(subscription.orgId === process.env.NEXT_PUBLIC_ROOT_ORG
          ? [
              {
                label: translations["Staff"],
                link: "/dashboard/members",
                icon: IconUsers,
                disabled:
                  subscription.orgId !== process.env.NEXT_PUBLIC_ROOT_ORG,
              },
            ]
          : []),
      ],
    },
    {
      icon: IconUser,
      label: translations["Account"],
      children: [
        {
          label: translations["Account"],
          link: "/dashboard/settings?tab=user",
          icon: IconUserShare,
        },
        {
          label: translations["Organization"],
          link: "/dashboard/settings?tab=organization",
          icon: IconUsersGroup,
        },
        {
          label: translations["Account"],
          link: "/dashboard/settings?tab=account",
          icon: IconInvoice,
        },
        ...(subscription.orgId === process.env.NEXT_PUBLIC_ROOT_ORG
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
    {
      icon: IconFileInfo,
      label: translations["Docs"],
      link: "https://docs.rateup.app/",
      children: [
        {
          label: "Guides",
          link: "https://docs.rateup.app/",
          icon: IconFileInfo,
          disabled: true,
        },
      ],
    },
  ];
  return navLinks;
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
