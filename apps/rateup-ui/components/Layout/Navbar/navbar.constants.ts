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
} from "@tabler/icons-react";
import { UserRole } from "../../../utils/enums";

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
export const navTopData: Array<NavbarLinkProps> = [
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
  // { Icon: IconDeviceDesktopAnalytics, label: 'Testimonials', href: '/dashboard/' },
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
  { Icon: IconClipboardList, label: "Menu", href: "/dashboard/menu" },
  ...(hiddenModules.includes("campaign")
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
          href: "/dashboard/campaign/contacts",
        },
      ]),
  ...(hiddenModules.includes("reputation_management")
    ? []
    : [
        {
          Icon: IconComet,
          label: "Reputation",
          href: "/dashboard/rm",
        },
      ]),
];

//data Array consisting of NavbarBottomData
export const navBottomData: Array<NavbarLinkProps> = [
  { Icon: IconSettings, label: "Settings", href: "/dashboard/settings" },
  { Icon: IconLogout, label: "Logout", href: "/logout" },
];
