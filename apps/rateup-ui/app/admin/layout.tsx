"use client";

import { redirect, usePathname } from "next/navigation";

import { useUserInfo } from "@/backend/user/user.query";
import ColorSchemaButton from "@/components/theme/ColorSchemaButton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";

import { AppSidebar } from "./admin-sidebar/app-sidebar";

export default function Page({ children }) {
  const pathname = usePathname();
  const { data, isPending, isError } = useUserInfo();
  if (isPending)
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner />
      </div>
    );

  if (isError) {
    return <div>Error occurred</div>;
  }
  if ("error" in data && data.error?.message === "unauthorised")
    redirect("/login");

  if (
    data &&
    "data" in data &&
    data?.data?.orgId !== process.env.NEXT_PUBLIC_ROOT_ORG
  )
    redirect("/dashboard");

  return (
    <SidebarProvider>
      <AppSidebar data={data} />
      <SidebarInset className=" overflow-hidden">
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
          <ColorSchemaButton />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
