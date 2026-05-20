"use client";

import { ModeToggle } from "./theme/ModeToggle.tsx";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb.tsx";
import { Separator } from "./ui/separator.tsx";
import { SidebarTrigger } from "./ui/sidebar.tsx";

const NavHeader = ({ pathname }: { pathname: string }) => {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 justify-between">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {pathname
              .split("/")
              .filter(Boolean)
              .map((segment, index, array) => (
                <div key={index} className="flex items-center">
                  <BreadcrumbItem>
                    {index === array.length - 1 ? (
                      <BreadcrumbPage className="capitalize">
                        {segment}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        className="capitalize"
                        href={`/${array.slice(0, index + 1).join("/")}`}
                      >
                        {segment}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < array.length - 1 && <BreadcrumbSeparator />}
                </div>
              ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="mr-4">
        <ModeToggle />
      </div>
    </header>
  );
};

export default NavHeader;
