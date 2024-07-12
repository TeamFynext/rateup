//icon imports
import {
  IconAddressBook,
  IconApi,
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
  IconLogout,
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
  IconUsers,
  IconWaveSine,
} from "@tabler/icons-react";

import { IconAppWindow } from "@tabler/icons-react";
import { useUserInfo } from "../../../backend/user/user.query";
import {
  SubscriptionFeaturePathName,
  SubscriptionFeaturePathName as sfpn,
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

//data Array consisting of NavbarTopData
export function getNavTopData(subscription?: Subscription) {
  function hasFeature(featurePath: SubscriptionFeaturePathName) {
    if (!subscription) return false;
    return getNestedProperty(subscription.features, featurePath)?.active;
  }

  const navTopData: Array<NavbarLinkProps> = [
    {
      Icon: IconHome,
      label: "Home",
      href: "/dashboard",
      role: "",
    },
    {
      Icon: IconSocial,
      label: "Teams",
      href: "",
      submenus: [
        { Icon: IconSocial, label: "Teams", href: "/dashboard/teams" },
        {
          Icon: IconUsers,
          label: "Members",
          href: "/dashboard/members",
          role: UserRole.SUPADM,
        },
      ],
    },
    ...(hasFeature(sfpn.WebSurvey)
      ? [
          {
            Icon: IconBrowser,
            label: "Web Survey",
            href: "",
            submenus: [
              {
                Icon: IconClipboardList,
                label: "Surveys",
                href: "/dashboard/surveys",
              },
              {
                Icon: IconKeyframes,
                label: "Templates",
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
            label: "WhatsApp",
            submenus: [
              ...(whatsappOptions.includes("survey") &&
              hasFeature(sfpn.WhatsAppSurvey)
                ? [
                    {
                      Icon: IconFileDescription,
                      label: "Surveys",
                      href: "/dashboard/whatsapp",
                    },
                  ]
                : []),
              ...(hasFeature(sfpn.WhatsAppTemplate)
                ? [
                    {
                      Icon: IconMessage2Code,
                      label: "Templates",
                      href: "/dashboard/whatsapp/templates",
                    },
                  ]
                : []),
              ...(hasFeature(sfpn.WhatsAppFlow)
                ? [
                    {
                      Icon: IconWaveSine,
                      label: "Flows",
                      href: "/dashboard/whatsapp/flows",
                    },
                  ]
                : []),
              {
                Icon: IconInbox,
                label: "Inbox",
                href: "/dashboard/whatsapp/inbox",
              },
              ...(hasFeature(sfpn.WhatsAppCampaign)
                ? [
                    {
                      Icon: IconSpeakerphone,
                      label: "Campaign",
                      href: "/dashboard/campaign",
                    },
                    {
                      Icon: IconAddressBook,
                      label: "Contacts",
                      href: "/dashboard/contacts",
                    },
                  ]
                : []),
              {
                Icon: IconMessageCog,
                label: "Automation",
                href: "/dashboard/whatsapp/automated-replies",
              },
              {
                Icon: IconSettings,
                label: "Settings",
                href: "/dashboard/whatsapp/settings",
              },
            ],
          },
        ]
      : []),
    {
      Icon: IconAppWindow,
      label: "Landing Pages",
      href: "/dashboard/landingPages",
    },
    ...(hiddenModules.includes("reputation_management") ||
    !hasFeature(sfpn.ReputationManagement)
      ? []
      : [
          {
            Icon: IconComet,
            label: "Reputation",
            href: "/dashboard/rm",
          },
        ]),
    ...(hiddenModules.includes("tickets") || !hasFeature(sfpn.Ticket)
      ? []
      : [
          {
            Icon: IconTicket,
            label: "Tickets",
            href: "/dashboard/tickets",
          },
        ]),
    ...(hiddenModules.includes("testimonial")
      ? []
      : [
          {
            Icon: IconMessageChatbot,
            label: "Testimonial",
            href: "/dashboard/testimonial",
          },
        ]),
    ...(hasFeature(sfpn.Menu)
      ? [
          {
            Icon: IconClipboardList,
            label: "Digital Menu",
            href: "/dashboard/menu",
          },
        ]
      : []),
    {
      Icon: IconQrcode,
      label: "Generate QR",
      href: "/dashboard/generateQr",
    },
    { Icon: IconFileInfo, label: "Docs", href: "https://docs.rateup.app/" },
    ...(hiddenModules.includes("loyalty") || !true
      ? []
      : [
          {
            Icon: IconGift,
            label: "Loyalty",
            href: "/dashboard/loyalty",
            submenus: [
              {
                Icon: IconSpeakerphone,
                label: "Campaign",
                href: "/dashboard/loyalty/campaign",
              },
              {
                Icon: IconPigMoney,
                label: "Rewards",
                href: "/dashboard/loyalty/reward",
              },
              {
                Icon: IconUsers,
                label: "Customers",
                href: "/dashboard/loyalty/customer",
              },
              {
                Icon: IconApi,
                label: "API",
                href: "/dashboard/loyalty/api",
              },
            ],
          },
        ]),
  ];
  return navTopData;
}

//data Array consisting of NavbarBottomData
const navBottomData: Array<NavbarLinkProps> = [
  { Icon: IconSettings, label: "Settings", href: "/dashboard/settings" },
  { Icon: IconLogout, label: "Logout", href: "/logout" },
];

export function useNavBottomData() {
  const { data, isError, isLoading } = useUserInfo();

  if (isLoading || isError) return navBottomData;

  if (
    data &&
    "data" in data &&
    data?.data?.orgId === process.env.NEXT_PUBLIC_ROOT_ORG
  ) {
    return [
      { Icon: IconTerminal2, label: "Admin", href: "/admin" },
      ...navBottomData,
    ];
  }
  return navBottomData;
}
