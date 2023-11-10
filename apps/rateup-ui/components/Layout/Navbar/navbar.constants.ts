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
  IconPhone,
} from "@tabler/icons-react";
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
      { Icon: IconSocial, label: "All Teams", href: "/dashboard/teams" },
      {
        Icon: IconUsers,
        label: "All Members",
        href: "/dashboard/members",
        role: "SUPER_ADMIN",
      },
    ],
  },
  {
    Icon: IconBrowser,
    label: "Surveys",
    href: "",
    submenus: [
      {
        Icon: IconClipboardList,
        label: "All Surveys",
        href: "/dashboard/surveys",
      },
      {
        Icon: IconPageBreak,
        label: "Group Surveys",
        href: "/dashboard/groupsurveys",
      },
    ],
  },
  // { Icon: IconDeviceDesktopAnalytics, label: 'Testimonials', href: '/dashboard/' },
  {
    Icon: IconBrandWhatsapp,
    label: "WhatsApp",
    submenus: [
      {
        Icon: IconFileDescription,
        label: "Survey",
        href: "/dashboard/whatsapp/surveys",
      },
      {
        Icon: IconSpeakerphone,
        label: "Promotion",
        href: "/dashboard/whatsapp/promotion",
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
  {
    Icon: IconSpeakerphone,
    label: "Campaign",
    href: "",
    submenus: [
      {
        Icon: IconPhone,
        label: "Contacts",
        href: "/dashboard/campaign/contacts",
      },
    ],
  },
];
//data Array consisting of NavbarBottomData
export const navBottomData: Array<NavbarLinkProps> = [
  { Icon: IconSettings, label: "Settings", href: "/dashboard/settings" },
  { Icon: IconLogout, label: "Logout", href: "/logout" },
];
