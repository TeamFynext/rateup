import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";

import { useUserInfo } from "@/backend/user/user.query";
import NavHeader from "@/components/nav-header.tsx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { ConfirmProvider } from "@/context/confirm-provider.tsx";

import { AppSidebar } from "../../components/admin/admin-sidebar/app-sidebar.tsx";

export const Route = createFileRoute("/admin")({
  component: Page,
});

function Page() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const navigate = useNavigate();
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
  if ("error" in data && data.error?.message === "unauthorised") {
    navigate({
      to: "/login",
      replace: true,
    });
    return <></>;
  }

  if ("data" in data && data.data.orgId !== import.meta.env.VITE_ROOT_ORG) {
    navigate({
      to: "/",
      replace: true,
    });
    return <></>;
  }

  return (
    <ConfirmProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar data={data} />
        <SidebarInset className=" overflow-hidden">
          <NavHeader pathname={pathname} />
          <div className="flex flex-1 flex-col gap-4 px-4 pt-0">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ConfirmProvider>
  );
}
