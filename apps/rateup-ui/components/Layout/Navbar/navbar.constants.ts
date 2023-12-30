//icon imports
import {
  IconSettings,
  IconLogout,
  IconUsers,
  IconSocial,
  IconSpeakerphone,
  IconPageBreak,
  IconClipboardList,
  IconBrowser,
  IconMessage2Code,
  IconBrandWhatsapp,
  IconFileDescription,
  IconLayoutDashboard,
  IconAddressBook,
  IconKeyframes,
  IconComet,
  IconTerminal2,
} from "@tabler/icons-react";
import { UserRole } from "../../../utils/enums";
import { useUserInfo } from "../../../backend/user/user.query";
import {
  SubscriptionFeaturePathName,
  SubscriptionFeaturePathName as sfpn,
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

//data Array consisting of NavbarTopData
export function getNavTopData(subscription?: Subscription) {
  function hasFeature(featurePath: SubscriptionFeaturePathName) {
    if (!subscription) return false;
    return getNestedProperty(subscription.features, featurePath).active;
  }

  const navTopData: Array<NavbarLinkProps> = [
    {
      Icon: IconLayoutDashboard,
      label: "Dashboard",
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
              ...(hiddenModules.includes("groupSurvey")
                ? []
                : [
                    {
                      Icon: IconPageBreak,
                      label: "Group Surveys",
                      href: "/dashboard/groupsurveys",
                    },
                  ]),
            ],
          },
        ]
      : []),
    // { Icon: IconDeviceDesktopAnalytics, label: 'Testimonials', href: '/dashboard/' },
    ...(hasFeature(sfpn.WhatsAppSurvey)
      ? [
          {
            Icon: IconBrandWhatsapp,
            label: "WhatsApp Survey",
            submenus: [
              {
                Icon: IconFileDescription,
                label: "Surveys",
                href: "/dashboard/whatsapp/surveys",
              },
              {
                Icon: IconMessage2Code,
                label: "Templates",
                href: "/dashboard/whatsapp/templates",
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
    ...(hasFeature(sfpn.Menu)
      ? [{ Icon: IconClipboardList, label: "Menu", href: "/dashboard/menu" }]
      : []),
    ...(hiddenModules.includes("campaign") || !hasFeature(sfpn.WhatsAppCampaign)
      ? []
      : [
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
        ]),
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

  if (data?.data?.orgId === process.env.NEXT_PUBLIC_ROOT_ORG) {
    return [
      { Icon: IconTerminal2, label: "Admin", href: "/admin" },
      ...navBottomData,
    ];
  }
  return navBottomData;
}
