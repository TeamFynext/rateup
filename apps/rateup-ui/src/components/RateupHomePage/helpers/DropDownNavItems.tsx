"use client";

import * as React from "react";

import { Link } from "@tanstack/react-router";
import { MessageCircle, Monitor } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const components: {
  icon: React.ReactNode;
  title: string;
  to: string;
  description: string;
}[] = [
  {
    icon: <MessageCircle className="size-6 text-rateup-graytext" />,
    title: "Whatsapp Loyalty",
    to: "/products/whatsapp-loyalty",
    description: "Engage where your customers are most active.",
  },
  {
    icon: <Monitor className="size-6 text-rateup-graytext" />,
    title: "Web Survey",
    to: "/products/whatsapp-survey",
    description: "Collect and analyze customer insights easily.",
  },
];

export default function DropDownNavItems({
  style,
}: Readonly<{ style?: string }>) {
  return (
    <NavigationMenu viewport={false} className="relative">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={`text-white hover:bg-transparent! text-[16px]! focus:bg-transparent! data-[state=open]:bg-transparent!`}
          >
            Product
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[320px] gap-2">
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
      <NavigationMenuLink asChild>
        <Link to={to}>
          <div className="flex items-start gap-4">
            <div>{icon}</div>
            <div className="flex flex-col gap-1 text-sm">
              <div className="leading-none font-medium">{title}</div>
              <div className="line-clamp-2 text-muted-foreground">
                {children}
              </div>
            </div>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}
