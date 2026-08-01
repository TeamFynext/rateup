// Extracted verbatim from the `/dashboard/loyalty/templates/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { WaTemplateDraftPayload } from "@/backend/whatsapp/whatsapp.api";
import { useSaveTemplateAsDraftMutation, useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { ActionCard } from "@/components/common/action-card.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import WaTemplateStatusBadge from "@/components/whatsapp/templates/WaTemplateStatusBadge.tsx";
import { TemplateType } from "@/types/enums.ts";
import { docsPath } from "@/utils/constants.ts";

const PREDEFINED_TEMPLATES = [
  {
    type: "CustomerRegistration",
    name: "loyalty_customer_registration",
    body: "Hi {{1}}, welcome to our loyalty program!",
    example: ["John"],
    description: "WhatsApp Template for Successful Customer Registration",
  },
  {
    type: "PointInformation",
    name: "loyalty_point_information",
    body: "Hi {{1}}, your current point balance is {{2}}. You have redeemed {{3}} points and earned a total of {{4}} points.",
    example: ["John", "50", "20", "70"],
    description: "WhatsApp Template for Point Information",
  },
  {
    type: "Referral",
    name: "loyalty_referral",
    body: "Hi {{1}}, your referral code is {{2}}. Share this link: {{3}} now!",
    example: ["John", "ABC123", "https://rateup.app/referral/ABC123"],
    description: "WhatsApp Template for Referral",
  },
  {
    type: "CustomerRemoval",
    name: "loyalty_customer_removal",
    body: "Hi {{1}}, you have been removed from the loyalty program. If you have questions, contact us.",
    example: ["John"],
    description: "WhatsApp Template for Customer Removal from Loyalty",
  },
  {
    type: "RewardsIssued",
    name: "loyalty_rewards_issued",
    body: "Hi {{1}}, you have received a new reward: {{2}}! Enjoy your reward.",
    example: ["John", "10% Off Coupon"],
    description: "WhatsApp Template for Rewards Issue list",
  },
  {
    type: "PointsIssued",
    name: "loyalty_points_issued",
    body: "Hi {{1}}, you have earned {{2}} points! Your new balance is {{3}} points.",
    example: ["John", "15", "65"],
    description: "WhatsApp Template for Points Issued (earned on purchase)",
  },
  {
    type: "PointsAdjusted",
    name: "loyalty_points_adjusted",
    body: "Hi {{1}}, your points have been adjusted by {{2}}. Your new balance is {{3}} points.",
    example: ["John", "+10", "60"],
    description: "WhatsApp Template for Points Adjusted (manual adjustment)",
  },
  {
    type: "RewardIssued",
    name: "loyalty_reward_issued",
    body: "Hi {{1}}, you have been issued a reward: {{2}}. Use code: {{3}} (Cost: {{4}} points). Enjoy!",
    example: ["John", "Free Coffee", "COFFEE2024", "30"],
    description: "WhatsApp Template for Reward Issued (manual grant)",
  },
  {
    type: "RewardRedeemed",
    name: "loyalty_reward_redeemed",
    body: "Hi {{1}}, your reward {{2}} has been redeemed! Code: {{3}} (Cost: {{4}} points). Thank you!",
    example: ["John", "Free Coffee", "COFFEE2024", "30"],
    description: "WhatsApp Template for Reward Redeemed (confirm redemption)",
  },
  {
    type: "TierUpgraded",
    name: "loyalty_tier_upgraded",
    body: "Congratulations {{1}}! You have been upgraded to the {{2}} tier. Keep up the great work!",
    example: ["John", "Gold"],
    description: "WhatsApp Template for Tier Upgraded",
  },
  {
    type: "Birthday",
    name: "loyalty_birthday",
    body: "Happy Birthday {{1}}! Enjoy your special reward: {{2}} today!",
    example: ["John", "Birthday Cake"],
    description: "WhatsApp Template for Birthday Reward",
  },
  {
    type: "InactivityReminder",
    name: "loyalty_inactivity_reminder",
    body: "Hi {{1}}, you have {{2}} points waiting for you! Come back and redeem your rewards soon.",
    example: ["John", "50"],
    description: "WhatsApp Template for Inactivity Reminder",
  },
];

export function LoyaltyTemplateListPage() {
  const { data: templates, isPending, isError, refetch } = useWaTemplates(TemplateType.LOYALTY);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const navigate = useNavigate();
  const saveDraftMutation = useSaveTemplateAsDraftMutation(
    "",
    () => {
      toast.success("Draft created");
      refetch();
      setShowModal(false);
      setSelectedPredefined(null);
      setSelectedAccountId("");
    },
    () => {},
  );

  const [showModal, setShowModal] = useState(false);
  const [selectedPredefined, setSelectedPredefined] = useState<
    (typeof PREDEFINED_TEMPLATES)[number] | null
  >(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [step, setStep] = useState<"pick" | "account" | "loading">("pick");

  const filteredDrafts = useMemo(() => {
    if (!templates) return [];
    const searchValue = search.trim().toLowerCase();
    return templates.filter((template) => {
      const name = template?.data?.name?.toLowerCase() || "";
      return !searchValue || name.includes(searchValue);
    });
  }, [templates, search]);

  function handleEditClick(template: { id: string }) {
    navigate({
      to: `/dashboard/loyalty/templates/${template.id}`,
    });
  }

  function handleCreateFromPredefined(predef: (typeof PREDEFINED_TEMPLATES)[number]) {
    setSelectedPredefined(predef);
    setStep("account");
  }

  function handleConfirmCreateDraft() {
    if (!selectedPredefined || !selectedAccountId) {
      toast.error("Please select a WhatsApp account.");
      return;
    }
    setStep("loading");
    const payload: WaTemplateDraftPayload = {
      name: selectedPredefined.name,
      header: null,
      language: "en",
      body: selectedPredefined.body,
      footer: "Powered by rateup.app",
      category: "UTILITY",
      format: "NONE",
      buttons: [],
      status: "DRAFT",
      example: selectedPredefined.example,
      templateType: TemplateType.LOYALTY,
      mediaCarousel: [],
      productCarousel: [],
      whatsappSettingsPhoneId: selectedAccountId,
      defaultValues: {
        catalog: {
          thumbnail_product_retailer_id: "",
          mpm: { sections: [] },
          spm: { product_retailer_id: "" },
          catalogId: "",
        },
        whatsappSettingsPhoneId: selectedAccountId,
      },
    };
    saveDraftMutation.mutate(payload, {
      onSuccess: (data) => {
        toast.success("Draft created");
        setShowModal(false);
        setSelectedPredefined(null);
        setSelectedAccountId("");
        setStep("pick");
        // AxiosResponse: data?.data?.id
        const templateId = data?.data?.id;
        if (templateId) {
          navigate({
            to: `/dashboard/loyalty/template/${templateId}`,
          });
        } else {
          refetch();
        }
      },
      onError: () => {
        setStep("account");
      },
    });
  }

  return (
    <>
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            <Button
              onClick={() => {
                setShowModal(true);
                setStep("pick");
                setSelectedPredefined(null);
                setSelectedAccountId("");
              }}
            >
              Create
              <IconPlus size={16} className="ml-2" />
            </Button>

            <InfoButton docUrl={`${docsPath}/loyalty/templates`} />
            <RefreshButton queryKeys={["watemplates"]} />
          </ListPageHeaderSection>

          <ListPageHeaderSection>
            <ListPageSearchInput
              placeholder="Search loyalty templates..."
              value={search}
              onChange={setSearch}
            />
            <ListPageSortDropdown value={sortOption} onChange={setSortOption} />
          </ListPageHeaderSection>
        </ListPageHeader>

        <ListPageContent
          isLoading={isPending}
          isError={isError}
          isEmpty={!isPending && !isError && filteredDrafts.length === 0}
          emptyTitle={"No loyalty templates found"}
          emptyDescription={"Try changing filters or create a new template."}
          onRetry={refetch}
        >
          <CardGrid
            items={filteredDrafts}
            getKey={(template) => template.id}
            renderItem={(template) => (
              <ActionCard
                title={template?.data?.name}
                subtitle={template?.data?.category || "Template"}
                content={
                  <Badge variant="default" className="text-xs">
                    {template?.whatsappSettingsPhoneId ?? "No Account"}
                  </Badge>
                }
                footer={<WaTemplateStatusBadge status={template?.data?.status} />}
                createdAt={template.createdAt}
                onClick={() => handleEditClick(template)}
              />
            )}
          />
        </ListPageContent>
      </ListPage>
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) {
            setSelectedPredefined(null);
            setStep("pick");
          }
        }}
        modal
      >
        <DialogContent
          showCloseButton
          className={step === "pick" ? "min-w-[90vw] max-w-7xl" : "max-w-7xl"}
        >
          <DialogHeader>
            <DialogTitle>
              {step === "pick" ? "Pick a Template" : "Create Draft from Predefined Template"}
            </DialogTitle>
            <DialogDescription>
              {(() => {
                if (step === "pick") return "Select a template to start.";
                if (step === "account" && selectedPredefined)
                  return `Are you sure you want to create a draft from ${selectedPredefined.name}? Please select a WhatsApp account to associate with this template.`;
                return "";
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-4 no-scrollbar max-h-[80vh] overflow-y-auto px-4">
            {step === "pick" ? (
              <CardGrid
                items={PREDEFINED_TEMPLATES}
                getKey={(tpl) => tpl.name}
                renderItem={(tpl) => (
                  <ActionCard
                    title={tpl.name}
                    titleTooltip={tpl.name}
                    subtitle={tpl.description}
                    content={<div className="text-xs text-muted-foreground">{tpl.body}</div>}
                    onClick={() => handleCreateFromPredefined(tpl)}
                    footerLeft={<Badge variant="secondary">{tpl.type}</Badge>}
                  />
                )}
              />
            ) : (
              <>
                <AccountSelector
                  value={selectedAccountId}
                  onChange={(value) => setSelectedAccountId(value ?? "")}
                  label="WhatsApp Account"
                  withAllOption={false}
                  optional={false}
                />
                <DialogFooter>
                  <DialogClose
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowModal(false);
                          setSelectedPredefined(null);
                          setStep("pick");
                        }}
                      />
                    }
                  >
                    Back
                  </DialogClose>
                  <Button
                    type="button"
                    disabled={step === "loading"}
                    onClick={handleConfirmCreateDraft}
                  >
                    {step === "loading" ? "Creating..." : "Create Draft"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
