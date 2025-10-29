"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ChevronRight, CreditCard, Shield, User, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import Security from "./SecuritySettings";
import Team from "./TeamSettings";
import { Account } from "./UserSettingsNew";

type SettingsSection =
  | "account"
  | "users"
  | "notifications"
  | "channels"
  | "integrations"
  | "team"
  | "billing"
  | "security";

const Settings = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = (searchParams.get("tab") as SettingsSection) || "account";
  const [activeSection, setActiveSection] = useState<SettingsSection>(tabParam);

  // Keep state synced with URL param changes
  useEffect(() => {
    if (tabParam !== activeSection) {
      setActiveSection(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (section: SettingsSection) => {
    setActiveSection(section);
    router.replace(`?tab=${section}`); // updates URL without reload
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
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "account":
        return <Account />;
      case "team":
        return <Team />;
      case "security":
        return <Security />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex bg-background overflow-hidden">
      {/* Sidebar */}
      <nav
        className="w-64 border-r bg-card flex flex-col h-full"
        aria-label="Settings navigation"
      >
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
                        className={`w-3.5 h-3.5 ${
                          activeSection === item.id
                            ? "text-white"
                            : "text-muted-foreground"
                        }`}
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

        {/* Footer */}
        <div className="p-3 border-t bg-gradient-to-r from-blue-50 to-orange-50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Need help?</p>
            <Button
              variant="link"
              className="h-auto p-0 text-xs text-rateup-blue hover:text-rateup-orange transition-colors"
            >
              Contact Support
            </Button>
          </div>
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
