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
  IconLinkPlus,
  IconLogout,
  IconMessage,
  IconMessageBolt,
  IconMessageChatbot,
  IconQrcode,
  IconSettings,
  IconSpeakerphone,
  IconTemplate,
  IconUser,
  IconUsers,
  IconUsersGroup,
  IconWallpaper,
  IconWaveSine,
} from "@tabler/icons-react";

export const navLinks = [
  {
    icon: IconHome2,
    label: "Home",
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
  {
    icon: IconInbox,
    label: "Inbox",
    children: [
      {
        label: "New",
        link: "/dashboard/whatsapp/inbox?tab=New",
        icon: IconMessageBolt,
      },
      {
        label: "All",
        link: "/dashboard/whatsapp/inbox?tab=All",
        icon: IconMessage,
      },
    ],
  },
  {
    icon: IconAddressBook,
    label: "Contacts",
    children: [
      {
        label: "Groups",
        link: "/dashboard/contacts?tab=groups",
        icon: IconUsersGroup,
      },
      {
        label: "All Contacts",
        link: "/dashboard/contacts?tab=contacts",
        icon: IconAddressBook,
      },
      {
        label: "Settings",
        link: "/dashboard/contacts?tab=settings",
        icon: IconSettings,
      },
    ],
  },
  {
    icon: IconBrandWhatsapp,
    label: "WhatsApp",
    children: [
      {
        label: "Templates",
        link: "/dashboard/whatsapp/templates",
        icon: IconTemplate,
      },
      {
        label: "Campaigns",
        link: "/dashboard/campaign",
        icon: IconSpeakerphone,
      },
      {
        label: "Flow",
        link: "/dashboard/whatsapp/flows",
        icon: IconWaveSine,
      },
      {
        label: "Automations",
        link: "/dashboard/whatsapp/automated-replies",
        icon: IconAutomation,
      },
      {
        label: "Settings",
        link: "/dashboard/whatsapp/settings",
        icon: IconSettings,
      },
    ],
  },
  {
    icon: IconGift,
    label: "Loyalty",
    children: [
      {
        label: "Dashboard",
        link: "/dashboard/loyalty/dashboard",
        icon: IconDashboard,
      },
      {
        label: "Customers",
        link: "/dashboard/loyalty/customer",
        icon: IconUsers,
      },
      {
        label: "Actions",
        link: "/dashboard/loyalty/actions",
        icon: IconActivity,
      },
      {
        label: "Rewards",
        link: "/dashboard/loyalty/rewards",
        icon: IconAward,
      },
      {
        label: "Settings",
        link: "/dashboard/loyalty/settings",
        icon: IconSettings,
      },
    ],
  },
  {
    icon: IconForms,
    label: "Web Forms",
    children: [
      {
        label: "Surveys",
        link: "/dashboard/surveys",
        icon: IconFileDescription,
      },
      {
        label: "Templates",
        link: "/dashboard/surveys/templates",
        icon: IconTemplate,
      },
      {
        label: "Testimonials",
        link: "/dashboard/testimonial",
        icon: IconMessageChatbot,
      },
    ],
  },
  {
    icon: IconBrandTeams,
    label: "Teams",
    children: [
      {
        label: "Teams",
        link: "/dashboard/teams?tab=Teams",
        icon: IconBrandTeams,
      },
      {
        label: "Members",
        link: "/dashboard/teams?tab=Members",
        icon: IconBrandTeams,
      },
    ],
  },
  {
    icon: IconUser,
    label: "Account",
    children: [
      {
        label: "Settings",
        link: "/dashboard/settings",
        icon: IconUser,
      },
      {
        label: "Logout",
        link: "/logout",
        icon: IconLogout,
      },
    ],
  },
  {
    icon: IconApps,
    label: "Apps & Service",
    link: "/dashboard/apps&services",
    children: [
      {
        label: "Apps & Services",
        link: "/dashboard/apps&services",
        icon: IconApps,
        disabled: true,
      },
    ],
  },
  {
    icon: IconFileDescription,
    label: "Digital Menu",
    link: "/dashboard/menu",
    children: [
      {
        label: "List",
        link: "/dashboard/menu",
        icon: IconFileDescription,
        disabled: true,
      },
    ],
  },
  {
    icon: IconQrcode,
    label: "QR Studio",
    children: [
      {
        label: "QR Creator",
        link: "/dashboard/qrCreator",
        icon: IconCirclePlus,
      },
      {
        label: "Quick Access Links",
        link: "/dashboard/quickAccessLinks",
        icon: IconLinkPlus,
      },
      {
        label: "Landing Pages",
        link: "/dashboard/landingPages",
        icon: IconWallpaper,
      },
    ],
  },
  {
    icon: IconFileInfo,
    label: "Docs",
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
