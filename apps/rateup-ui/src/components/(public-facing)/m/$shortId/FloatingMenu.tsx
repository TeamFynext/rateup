import {
  IconBrandWhatsapp,
  IconCategory,
  IconChevronUp,
  IconLink,
  IconMessage,
  IconPhone,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { MenuButtons } from "@/types/enums.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

type DynamicMenuLink = {
  name: string;
  link: string;
};

type FloatingMenuMainProps = {
  readonly dynamicVariables: DynamicMenuLink[];
  readonly categories: FullCategory[];
  readonly displayName: string;
  readonly logo: string;
  readonly categoryRefs: React.RefObject<Record<string, HTMLDivElement | null>>;
};

const FloatingMenuMain = ({
  dynamicVariables,
  categories,
  displayName,
  logo,
  categoryRefs,
}: FloatingMenuMainProps) => {
  const firstTwoItems = dynamicVariables?.slice(0, 2);
  const remainingItems = dynamicVariables?.slice(2);

  const initials =
    displayName
      ?.split(" ")
      .slice(0, 2)
      .map((n) => n?.[0])
      .join("")
      .toUpperCase() ?? "?";

  const handleScrollToCategory = (categoryId: string) => {
    const categoryElement = categoryRefs.current[categoryId];
    if (categoryElement) {
      categoryElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <Card className="px-2 py-1">
        <CardContent className="flex items-center gap-1 p-0">
          <Tooltip>
            <TooltipTrigger>
              <Avatar className="cursor-pointer">
                <AvatarImage src={logo ? getFileUrlFromKey(logo) : undefined} alt={displayName} />
                <AvatarFallback className="bg-muted text-xs">{initials}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{displayName ?? "Brand"}</TooltipContent>
          </Tooltip>

          {!!categories?.length && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex h-auto flex-col gap-1 rounded-xl px-3 py-2 text-foreground"
                >
                  <IconCategory data-icon="inline-start" />
                  <span className="text-[10px] leading-none capitalize">Category</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent sideOffset={15} align="center">
                <DropdownMenuLabel>Categories</DropdownMenuLabel>
                <ScrollArea className="max-h-[50dvh]">
                  {categories?.map((category) => (
                    <DropdownMenuItem
                      key={category.id}
                      onClick={() => handleScrollToCategory(category.id)}
                      className="justify-between rounded-xl capitalize"
                    >
                      <span>{category.name}</span>
                      <span>{category.items?.length ?? 0}</span>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {firstTwoItems?.map((data) => (
            <Button
              key={data.name}
              variant="ghost"
              size="sm"
              asChild
              className="flex h-auto flex-col gap-1 rounded-xl px-3 py-2"
            >
              <Link to={getMenuBtnLink(data)} target="_blank" rel="noreferrer">
                {customButton(data.name)}
                <span className="text-[10px] leading-none capitalize">{data.name}</span>
              </Link>
            </Button>
          ))}

          {!!remainingItems?.length && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More menu actions">
                  <IconChevronUp data-icon="inline-start" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent sideOffset={15} align="center">
                {remainingItems?.map((data) => (
                  <DropdownMenuItem key={data.name} asChild>
                    <Link
                      to={getMenuBtnLink(data)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-2 py-1.5 no-underline"
                    >
                      {customButton(data.name)}
                      <span className="max-w-50 truncate text-xs capitalize leading-none">
                        {data.name}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FloatingMenuMain;

const customButton = (name: string) => {
  switch (name) {
    case MenuButtons.CONTACT:
      return <IconPhone data-icon="inline-start" />;
    case MenuButtons.WHATSAPP:
      return <IconBrandWhatsapp data-icon="inline-start" />;
    case "feedback":
      return <IconMessage data-icon="inline-start" />;
    default:
      return <IconLink data-icon="inline-start" />;
  }
};

const getMenuBtnLink = (data: DynamicMenuLink) => {
  switch (data?.name) {
    case MenuButtons.CONTACT:
      return `tel:${data.link}`;
    case MenuButtons.WHATSAPP:
      return `http://wa.me/${data.link}`;
    default:
      return data.link;
  }
};
