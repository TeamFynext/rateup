//icon imports
import {
  IconAddressBook,
  IconApi,
  IconApps,
  IconAppWindow,
  IconBrandWhatsapp,
  IconBrowser,
  IconClipboardList,
  IconComet,
  IconFileDescription,
  IconFileInfo,
  IconGift,
  IconHome,
  IconInbox,
  IconKeyframes,
  IconLink,
  IconLogout,
  IconLogs,
  IconMessage2Code,
  IconMessageChatbot,
  IconMessageCog,
  IconPigMoney,
  IconQrcode,
  IconSettings,
  IconSocial,
  IconSpeakerphone,
  IconTerminal2,
  IconTicket,
  IconTools,
  IconUsers,
  IconWaveSine,
} from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import { useUserInfo } from "../../../backend/user/user.query";
import {
  SubscriptionFeaturePathName as sfpn,
  SubscriptionFeaturePathName,
} from "../../../types/enums";
import { whatsappOptions } from "../../../utils/constants";
import { UserRole } from "../../../utils/enums";
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

  const navTopData: Array<NavbarLinkProps> = [
    {
      Icon: IconHome,
      label: translations["Home"],
      href: "/dashboard",
      role: "",
    },
    {
      Icon: IconSocial,
      label: translations["Teams"],
      href: "",
      submenus: [
        { Icon: IconSocial, label: "Teams", href: "/dashboard/teams" },
        {
          Icon: IconUsers,
          label: translations["Members"],
          href: "/dashboard/members",
          role: UserRole.SUPADM,
        },
      ],
    },
    ...(hasFeature(sfpn.WebSurvey)
      ? [
          {
            Icon: IconBrowser,
            label: translations["Web Survey"],
            href: "",
            submenus: [
              {
                Icon: IconClipboardList,
                label: translations["Surveys"],
                href: "/dashboard/surveys",
              },
              {
                Icon: IconKeyframes,
                label: translations["Templates"],
                href: "/dashboard/surveys/templates",
              },
            ],
          },
        ]
      : []),
    // { Icon: IconDeviceDesktopAnalytics, label: 'Testimonials', href: '/dashboard/' },
    ...(hasFeature(sfpn.Whatsapp)
      ? [
          {
            Icon: IconBrandWhatsapp,
            label: translations["WhatsApp"],
            submenus: [
              ...(whatsappOptions.includes("survey") &&
              hasFeature(sfpn.WhatsAppSurvey)
                ? [
                    {
                      Icon: IconFileDescription,
                      label: translations["Surveys"],
                      href: "/dashboard/whatsapp",
                    },
                  ]
                : []),
              ...(hasFeature(sfpn.WhatsAppTemplate)
                ? [
                    {
                      Icon: IconMessage2Code,
                      label: translations["Templates"],
                      href: "/dashboard/whatsapp/templates",
                    },
                  ]
                : []),
              ...(hasFeature(sfpn.WhatsAppFlow)
                ? [
                    {
                      Icon: IconWaveSine,
                      label: translations["Flows"],
                      href: "/dashboard/whatsapp/flows",
                    },
                  ]
                : []),
              {
                Icon: IconInbox,
                label: translations["Inbox"],
                href: "/dashboard/whatsapp/inbox",
              },
              ...(hasFeature(sfpn.WhatsAppCampaign)
                ? [
                    {
                      Icon: IconSpeakerphone,
                      label: translations["Campaign"],
                      href: "/dashboard/campaign",
                    },
                    {
                      Icon: IconAddressBook,
                      label: translations["Contacts"],
                      href: "/dashboard/contacts",
                    },
                  ]
                : []),
              {
                Icon: IconMessageCog,
                label: translations["Automation"],
                href: "/dashboard/whatsapp/automated-replies",
              },
              {
                Icon: IconLogs,
                label: translations["Logs"],
                href: "/dashboard/whatsapp/logs",
              },
              {
                Icon: IconSettings,
                label: translations["Settings"],
                href: "/dashboard/whatsapp/settings",
              },
            ],
          },
        ]
      : []),
    ...(hiddenModules.includes("reputation_management") ||
    !hasFeature(sfpn.ReputationManagement)
      ? []
      : [
          {
            Icon: IconComet,
            label: translations["Reputation"],
            href: "/dashboard/rm",
          },
        ]),
    ...(hiddenModules.includes("tickets") || !hasFeature(sfpn.Ticket)
      ? []
      : [
          {
            Icon: IconTicket,
            label: translations["Tickets"],
            href: "/dashboard/tickets",
          },
        ]),
    ...(hiddenModules.includes("testimonial")
      ? []
      : [
          {
            Icon: IconMessageChatbot,
            label: translations["Testimonial"],
            href: "/dashboard/testimonial",
          },
        ]),
    ...(hasFeature(sfpn.Menu)
      ? [
          {
            Icon: IconClipboardList,
            label: translations["Digital Menu"],
            href: "/dashboard/menu",
          },
        ]
      : []),
    ...[
      {
        Icon: IconQrcode,
        label: translations["QR Studio"],
        submenus: [
          {
            Icon: IconTools,
            label: translations["QR Creator"],
            href: "/dashboard/qrCreator",
          },
          {
            Icon: IconLink,
            label: translations["Quick Access Links"],
            href: "/dashboard/quickAccessLinks",
          },
          {
            Icon: IconAppWindow,
            label: translations["Landing Pages"],
            href: "/dashboard/landingPages",
          },
        ],
      },
    ],
    {
      Icon: IconFileInfo,
      label: translations["Docs"],
      href: "https://docs.rateup.app/",
    },
    ...(hiddenModules.includes("loyalty") || !true
      ? []
      : [
          {
            Icon: IconGift,
            label: translations["Loyalty"],
            href: "/dashboard/loyalty",
            submenus: [
              {
                Icon: IconSpeakerphone,
                label: translations["Campaign"],
                href: "/dashboard/loyalty/campaign",
              },
              {
                Icon: IconPigMoney,
                label: translations["Rewards"],
                href: "/dashboard/loyalty/reward",
              },
              {
                Icon: IconUsers,
                label: translations["Customers"],
                href: "/dashboard/loyalty/customer",
              },
              {
                Icon: IconApi,
                label: translations["API"],
                href: "/dashboard/loyalty/api",
              },
            ],
          },
        ]),
    ...(hiddenModules.includes("appsAndServices")
      ? []
      : [
          {
            Icon: IconApps,
            label: translations["Apps & Services"],
            href: "/dashboard/apps&services",
          },
        ]),
  ];
  return navTopData;
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

export function useNavBottomData() {
  const { data, isError, isLoading } = useUserInfo();
  const { translations } = useTranslations();
  if (isLoading || isError) return navBottomData(translations);

  if (
    data &&
    "data" in data &&
    data?.data?.orgId === process.env.NEXT_PUBLIC_ROOT_ORG
  ) {
    return [
      { Icon: IconTerminal2, label: translations["Admin"], href: "/admin" },
      ...navBottomData(translations),
    ];
  }
  return navBottomData(translations);
}
