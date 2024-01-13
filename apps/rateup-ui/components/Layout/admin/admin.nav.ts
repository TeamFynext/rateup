import { IconQrcode } from "@tabler/icons-react";
import { IconPremiumRights, IconWorld } from "@tabler/icons-react";

export const adminNavItems = [
  {
    Icon: IconWorld,
    label: "Orgs",
    href: "/admin/orgs",
  },
  {
    Icon: IconPremiumRights,
    label: "Subscriptons",
    href: "/admin/subscriptions",
  },
  {
    Icon: IconQrcode,
    label: "Share QR",
    href: "/admin/share-qr",
  },
];
