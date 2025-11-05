"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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
import { useTranslations } from "next-intl";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/context/UserContext";
import { UserRole } from "@/utils/enums";

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

const SettingsLayout = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { data: sub, isPending } = useSubscription();
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("account");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const translations = useTranslations();

  const settingsSections = [
    {
      category: translations("Account Settings"),
      items: [
        {
          id: "account" as SettingsSection,
          label: translations("Account"),
          icon: User,
          description: translations("Business profile & preferences"),
          href: "/dashboard/settings/account",
        },
        ...(user?.role === UserRole.SUPADM
          ? [
              {
                id: "users" as SettingsSection,
                label: "Users",
                icon: UserCog,
                description: translations("User accounts & access"),
                href: "/dashboard/settings/users",
              },
            ]
          : []),
        {
          id: "team" as SettingsSection,
          label: translations("Team"),
          icon: Users,
          description: translations("Team members & roles"),
          href: "/dashboard/settings/team",
        },
      ],
    },
    {
      category: translations("System Settings"),
      items: [
        {
          id: "security" as SettingsSection,
          label: translations("Security"),
          icon: Shield,
          description: translations("Password & security"),
          href: "/dashboard/settings/security",
        },
        ...(user?.role === UserRole.SUPADM
          ? [
              {
                id: "billing" as SettingsSection,
                label: translations("Billing"),
                icon: CreditCard,
                description: translations("Subscription & payments"),
                href: "/dashboard/settings/billing",
              },
            ]
          : []),
      ],
    },
    ...(sub?.orgId === process.env.NEXT_PUBLIC_ROOT_ORG
      ? [
          {
            category: translations("Admin Settings"),
            items: [
              {
                id: "admin" as SettingsSection,
                label: translations("Admin"),
                icon: Crown,
                description: translations("Admin settings"),
                href: "/admin",
              },
            ],
          },
        ]
      : []),
  ];

  // Update active section based on current pathname
  useEffect(() => {
    const allItems = settingsSections.flatMap((section) => section.items);
    const currentItem = allItems.find((item) => pathname?.includes(item.href));
    if (currentItem) {
      setActiveSection(currentItem.id);
    }
  }, [pathname]);

  // Handle navigation
  const handleTabChange = (sectionId: SettingsSection) => {
    const allItems = settingsSections.flatMap((section) => section.items);
    const selectedItem = allItems.find((item) => item.id === sectionId);

    if (selectedItem) {
      setActiveSection(sectionId);
      router.push(selectedItem.href);
      setSidebarOpen(false); // Close sidebar on mobile after navigation
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
          <h2 className="font-semibold">{translations("Menu")}</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-3 py-3">
          {settingsSections.map((category, i) => (
            <div key={i} className="py-2">
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
      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50/30 to-blue-50/20 py-4 px-2">
        <div className="pl-6 pr-6 pb-6 max-w-7xl">{children}</div>
      </main>
    </div>
  );
};

export default SettingsLayout;
