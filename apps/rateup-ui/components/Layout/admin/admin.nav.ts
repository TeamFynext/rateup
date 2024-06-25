import {
  IconBrandStripe,
  IconBusinessplan,
  IconCreditCard,
  IconDatabasePlus,
  IconLayoutCards,
  IconListDetails,
  IconPremiumRights,
  IconUser,
  IconWallet,
  IconWorld,
} from "@tabler/icons-react";
import { IconQrcode } from "@tabler/icons-react";

export const adminNavItems = [
  {
    Icon: IconUser,
    label: "User Stats",
    href: "/admin/userstats",
  },
  {
    Icon: IconWorld,
    label: "Orgs",
    href: "/admin/orgs",
  },
  {
    Icon: IconPremiumRights,
    label: "Subscriptions",
    href: "/admin/subscriptions",
  },
  {
    Icon: IconWallet,
    label: "RazorPay",
    href: "/admin/razorpay",
  },
  {
    Icon: IconBrandStripe,
    label: "Stripe",
    href: "/admin/stripe",
  },
  {
    Icon: IconCreditCard,
    label: "Orders",
    href: "/admin/orders",
  },
  {
    Icon: IconQrcode,
    label: "Share QR",
    href: "/admin/share-qr",
  },
  {
    Icon: IconBusinessplan,
    label: "RateUp Plans",
    href: "/admin/rateup",
  },
  {
    Icon: IconDatabasePlus,
    label: "Generate data",
    href: "/admin/generate",
  },
  {
    Icon: IconLayoutCards,
    label: "Update all themes",
    href: "/admin/updateAllThemes",
  },
];
