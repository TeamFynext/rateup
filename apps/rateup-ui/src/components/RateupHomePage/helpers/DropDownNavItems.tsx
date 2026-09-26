import {
  IconApi,
  IconDeviceDesktop,
  IconInbox,
  IconLayoutKanban,
  IconMessageCircle,
  IconPlug,
  IconRobot,
  IconSpeakerphone,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import * as React from "react";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const components: {
  icon: React.ReactNode;
  title: string;
  to: string;
  description: string;
}[] = [
  {
    icon: <IconApi className="size-6 text-ru-n-600" />,
    title: "WhatsApp Business API",
    to: "/products/whatsapp-business-api",
    description: "The channel everything else here is built on.",
  },
  {
    icon: <IconSpeakerphone className="size-6 text-ru-n-600" />,
    title: "WhatsApp Broadcast",
    to: "/products/whatsapp-broadcast",
    description: "Campaigns to thousands, on the official API.",
  },
  {
    icon: <IconMessageCircle className="size-6 text-ru-n-600" />,
    title: "WhatsApp Loyalty",
    to: "/products/whatsapp-loyalty",
    description: "Points, VIP tiers and rewards inside WhatsApp.",
  },
  {
    icon: <IconDeviceDesktop className="size-6 text-ru-n-600" />,
    title: "WhatsApp Feedback",
    to: "/products/whatsapp-feedback",
    description: "Ask every customer after the visit, in the chat.",
  },
  {
    icon: <IconInbox className="size-6 text-ru-n-600" />,
    title: "Omnichannel Inbox",
    to: "/products/omnichannel-inbox",
    description: "All your customer messages flow into one unified workspace.",
  },
  {
    icon: <IconLayoutKanban className="size-6 text-ru-n-600" />,
    title: "Pipeline",
    to: "/products/pipeline",
    description: "Turn conversations into leads on a board.",
  },
  {
    icon: <IconRobot className="size-6 text-ru-n-600" />,
    title: "Meta AI Agent",
    to: "/products/meta-ai-agent",
    description: "Meta's AI agent on your WhatsApp number.",
  },
  {
    icon: <IconPlug className="size-6 text-ru-n-600" />,
    title: "Integrations",
    to: "/integrations",
    description: "Shopify, WooCommerce, POS, CRM and 3,000+ apps via Zapier.",
  },
];
interface DropDownNavItemsProps {
  style?: string;
  dropdownStyle?: string;
}

export default function DropDownNavItems({
  style,
  dropdownStyle,
}: Readonly<DropDownNavItemsProps>) {
  const hasColor =
    (dropdownStyle && /\btext-\S+/.test(dropdownStyle)) || (style && /\btext-\S+/.test(style));
  const defaultColor = hasColor ? "" : "text-white";

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              defaultColor,
              "hover:bg-transparent! text-[16px]! focus:bg-transparent! data-[state=open]:bg-transparent!",
              style,
              dropdownStyle,
            )}
          >
            Product
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[320px] gap-2 lg:w-[640px] lg:grid-cols-2">
              {components.map((component) => (
                <ListItem
                  key={component.title}
                  icon={component.icon}
                  title={component.title}
                  to={component.to}
                >
                  {component.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function ListItem({
  icon,
  title,
  children,
  to,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  icon: React.ReactNode;
  to: string;
}) {
  return (
    <li {...props}>
      <NavigationMenuLink render={<Link to={to} />}>
        <div className="flex items-start gap-4">
          <div>{icon}</div>
          <div className="flex flex-col gap-1 text-sm">
            <div className="leading-none font-medium">{title}</div>
            <div className="line-clamp-2 text-muted-foreground">{children}</div>
          </div>
        </div>
      </NavigationMenuLink>
    </li>
  );
}
