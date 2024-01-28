import {
  IconBusinessplan,
  IconCreditCard,
  IconListDetails,
  IconPremiumRights,
  IconWallet,
  IconWorld,
} from "@tabler/icons-react";
import { IconQrcode } from "@tabler/icons-react";

export const adminNavItems = [
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
    Icon: IconListDetails,
    label: "RazorPay Plans",
    href: "/admin/razorpay/plans",
  },
  {
    Icon: IconWallet,
    label: "RazorPay Subs",
    href: "/admin/razorpay/subscriptions",
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
];
