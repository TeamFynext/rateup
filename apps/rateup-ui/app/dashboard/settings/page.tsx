"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ChevronRight,
  CreditCard,
  Crown,
  Menu,
  Shield,
  User,
  UserCog,
  Users,
  X,
} from "lucide-react";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/context/UserContext";
import { UserRole } from "@/utils/enums";

import Security from "./SecuritySettings";
import Team from "./TeamSettings";
import { Account } from "./UserSettingsNew";
import UsersPage from "./UsersSettings";

type SettingsSection =
  | "account"
  | "users"
  | "notifications"
  | "channels"
  | "integrations"
  | "team"
  | "billing"
  | "admin"
  | "security";

const Settings = () => {
  const router = useRouter();
  const { user } = useUser();
  const { data: sub, isPending } = useSubscription();
  const searchParams = useSearchParams();

  const tabParam = (searchParams.get("tab") as SettingsSection) || "account";
  const [activeSection, setActiveSection] = useState<SettingsSection>(tabParam);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (tabParam !== activeSection) {
      setActiveSection(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (section: SettingsSection) => {
    setActiveSection(section);
    setSidebarOpen(false);
    if (section === "admin") {
      return router.replace("/admin");
    }
    router.replace(`?tab=${section}`);
  };

  const settingsSections = [
    {
      category: "Account Settings",
      items: [
        {
          id: "account" as SettingsSection,
          label: "Account",
          icon: User,
          description: "Business profile & preferences",
        },
        ...(user?.role === UserRole.SUPADM
          ? [
              {
                id: "users" as SettingsSection,
                label: "Users",
                icon: UserCog,
                description: "User accounts & access",
              },
            ]
          : []),
        {
          id: "team" as SettingsSection,
          label: "Team",
          icon: Users,
          description: "Team members & roles",
        },
      ],
    },
    {
      category: "System Settings",
      items: [
        {
          id: "security" as SettingsSection,
          label: "Security",
          icon: Shield,
          description: "Password & security",
        },
        {
          id: "billing" as SettingsSection,
          label: "Billing",
          icon: CreditCard,
          description: "Subscription & payments",
        },
      ],
    },
    ...(sub?.orgId === process.env.NEXT_PUBLIC_ROOT_ORG
      ? [
          {
            category: "Admin Settings",
            items: [
              {
                id: "admin" as SettingsSection,
                label: "Admin",
                icon: Crown,
                description: "Admin settings",
              },
            ],
          },
        ]
      : []),
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "account":
        return <Account />;
      case "team":
        return <Team />;
      case "security":
        return <Security />;
      case "users":
        if (user?.role !== UserRole.SUPADM) return null;
        return <UsersPage />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-background overflow-hidden">
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-lg font-semibold">Settings</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 top-16"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-l bg-card flex flex-col h-full transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:top-0 top-16`}
        aria-label="Settings navigation"
      >
        <div className="md:hidden flex items-center justify-between p-3 border-b">
          <h2 className="font-semibold">Menu</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-3 py-2.5">
          {settingsSections.map((category, i) => (
            <div key={i} className="mb-1.5 last:mb-0">
              <div className="px-2 mb-1">
                <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  {category.category}
                </h3>
              </div>

              <div className="space-y-1">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all ${
                      activeSection === item.id
                        ? "bg-gradient-to-r from-rateup-blue/10 to-rateup-orange/10 border border-rateup-blue/20 shadow-sm"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        activeSection === item.id
                          ? "bg-gradient-to-br from-rateup-blue to-rateup-orange"
                          : "bg-muted"
                      }`}
                    >
                      <item.icon
                        className={`w-3.5 h-3.5 ${activeSection === item.id ? "text-white" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p
                        className={`text-sm truncate ${
                          activeSection === item.id
                            ? "text-rateup-blue"
                            : "text-foreground"
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                    {activeSection === item.id && (
                      <ChevronRight className="w-4 h-4 text-rateup-blue flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {i < settingsSections.length - 1 && (
                <Separator className="my-1.5" />
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50/30 to-blue-50/20">
        <div className="pl-6 pr-6 pb-6 max-w-7xl">{renderContent()}</div>
      </main>
    </div>
  );
};

export default Settings;
