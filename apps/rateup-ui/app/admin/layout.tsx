"use client";

import { redirect, usePathname } from "next/navigation";

import { useUserInfo } from "@/backend/user/user.query";
import NavHeader from "@/components/nav-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
        <NavHeader pathname={pathname} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
