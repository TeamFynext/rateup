"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Activity, FileSpreadsheet, Folder, Tag, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ContactNavSidebar = () => {
  const router = useRouter();
  const navItems = [
    {
      label: "Contacts",
      icon: Users,
      description: "Manage all contacts",
      link: "/dashboard/contacts",
    },
    {
      label: "Groups",
      icon: Folder,
      description: "Organize into groups",
      link: "/dashboard/contacts/groups",
    },
    {
      label: "Lifecycle",
      icon: Activity,
      description: "Track customer journey",
      link: "/dashboard/contacts/lifecycle",
    },
    {
      label: "Labels",
      icon: Tag,
      description: "Organize contacts with custom labels",
      link: "/dashboard/contacts/labels",
    },
    {
      label: "Custom Fields",
      icon: FileSpreadsheet,
      description: "Manage contact custom fields",
      link: "/dashboard/contacts/custom-fields",
    },
  ];
  const [activeItem, setActiveItem] = useState(navItems[0]);
  const pathname = usePathname();
  useEffect(() => {
    setActiveItem(
      navItems
        .sort((a, b) => b.link.length - a.link.length)
        .find(
          (item) =>
            pathname === item.link || pathname.startsWith(item.link + "/"),
        ),
    );
  }, [pathname]);

  return (
    <section className="h-screen">
      <div className="flex h-full">
        <div>
          <Card className="h-full rounded-xs">
            <TooltipProvider delayDuration={200}>
              <nav className="flex flex-col items-center h-full flex-shrink-0 w-16 gap-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem.label === item.label;

                  return (
                    <Tooltip key={item.label}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          onClick={() => {
                            setActiveItem(item);
                            router.push(item.link);
                          }}
                        >
                          <Icon />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="flex flex-col gap-1"
                      >
                        <div>{item.label}</div>
                        <div className="text-xs opacity-80">
                          {item.description}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </nav>
            </TooltipProvider>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ContactNavSidebar;
