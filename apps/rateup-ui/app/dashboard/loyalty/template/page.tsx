"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { InfoIcon, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { TemplateType } from "@/types/enums";
import {
  useSaveTemplateAsDraftMutation,
  useWaTemplates,
} from "@/backend/whatsapp/whatsapp.query";
import {
  GenericActionCard,
  GenericCardGrid,
} from "@/components/common/generic-card";
import { ListPageLayout } from "@/components/common/list-page-layout";
import { AccountSelector } from "@/components/input/AccountSelector";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WaTemplateStatusBadge from "@/components/whatsapp/templates/WaTemplateStatusBadge";

const PREDEFINED_TEMPLATES = [
  {
    type: "CustomerRegistration",
    name: "loyalty_customer_registration",
    body: "Hi {{1}}, welcome to our loyalty program!",
    example: ["customer name"],
    description: "WhatsApp Template for Successful Customer Registration",
  },
  {
    type: "PointInformation",
    name: "loyalty_point_information",
    body: "Hi {{1}}, your current point balance is {{2}}. You have redeemed {{3}} points and earned a total of {{4}} points.",
    example: [
      "customer name",
      "Current point balance",
      "Redeemed points",
      "Total earned points",
    ],
    description: "WhatsApp Template for Point Information",
  },
  {
    type: "Referral",
    name: "loyalty_referral",
    body: "Hi {{1}}, your referral code is {{2}}. Share this link: {{3}} now!",
    example: ["customer name", "referral code", "referral link"],
    description: "WhatsApp Template for Referral",
  },
  {
    type: "CustomerRemoval",
    name: "loyalty_customer_removal",
    body: "Hi {{1}}, you have been removed from the loyalty program. If you have questions, contact us.",
    example: ["customer name"],
    description: "WhatsApp Template for Customer Removal from Loyalty",
  },
  {
    type: "RewardsIssued",
    name: "loyalty_rewards_issued",
    body: "Hi {{1}}, you have received a new reward: {{2}}! Enjoy your reward.",
    example: ["customer name", "reward name"],
    description: "WhatsApp Template for Rewards Issue list",
  },
  {
    type: "PointsIssued",
    name: "loyalty_points_issued",
    body: "Hi {{1}}, you have earned {{2}} points! Your new balance is {{3}} points.",
    example: ["customer name", "points earned", "balance after"],
    description: "WhatsApp Template for Points Issued (earned on purchase)",
  },
  {
    type: "PointsAdjusted",
    name: "loyalty_points_adjusted",
    body: "Hi {{1}}, your points have been adjusted by {{2}}. Your new balance is {{3}} points.",
    example: ["customer name", "points adjusted", "balance after"],
    description: "WhatsApp Template for Points Adjusted (manual adjustment)",
  },
  {
    type: "RewardIssued",
    name: "loyalty_reward_issued",
    body: "Hi {{1}}, you have been issued a reward: {{2}}. Use code: {{3}} (Cost: {{4}} points). Enjoy!",
    example: ["customer name", "reward name", "redemption code", "cost"],
    description: "WhatsApp Template for Reward Issued (manual grant)",
  },
  {
    type: "RewardRedeemed",
    name: "loyalty_reward_redeemed",
    body: "Hi {{1}}, your reward {{2}} has been redeemed! Code: {{3}} (Cost: {{4}} points). Thank you!",
    example: ["customer name", "reward name", "redemption code", "cost"],
    description: "WhatsApp Template for Reward Redeemed (confirm redemption)",
  },
  {
    type: "TierUpgraded",
    name: "loyalty_tier_upgraded",
    body: "Congratulations {{1}}! You have been upgraded to the {{2}} tier. Keep up the great work!",
    example: ["customer name", "tier name"],
    description: "WhatsApp Template for Tier Upgraded",
  },
  {
    type: "Birthday",
    name: "loyalty_birthday",
    body: "Happy Birthday {{1}}! Enjoy your special reward: {{2}} today!",
    example: ["customer name", "gift/reward name"],
    description: "WhatsApp Template for Birthday Reward",
  },
  {
    type: "InactivityReminder",
    name: "loyalty_inactivity_reminder",
    body: "Hi {{1}}, you have {{2}} points waiting for you! Come back and redeem your rewards soon.",
    example: ["customer name", "points balance"],
    description: "WhatsApp Template for Inactivity Reminder",
  },
];

export default function LoyaltyTemplateListPage() {
  const {
    data: templates,
    isPending,
    isError,
    refetch,
  } = useWaTemplates(TemplateType.LOYALTY);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const router = useRouter();
  const saveDraftMutation = useSaveTemplateAsDraftMutation(
    null,
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
  const [selectedPredefined, setSelectedPredefined] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const filteredDrafts = useMemo(() => {
    if (!templates) return [];
    const searchValue = search.trim().toLowerCase();
    return templates.filter((template) => {
      const name = template?.data?.name?.toLowerCase() || "";
      return (
        (!searchValue || name.includes(searchValue)) &&
        template?.data?.status === "DRAFT"
      );
    });
  }, [templates, search]);

  function handleEditClick(template) {
    router.push(`/dashboard/loyalty/template/${template.id}`);
  }

  function handleCreateFromPredefined(predef) {
    setSelectedPredefined(predef);
    setShowModal(true);
  }

  function handleConfirmCreateDraft() {
    if (!selectedPredefined || !selectedAccountId) {
      toast.error("Please select a WhatsApp account.");
      return;
    }
    // Build the payload to match the WhatsApp template structure
    const payload = {
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
    saveDraftMutation.mutate(payload);
  }

  return (
    <ListPageLayout
      canCreate={true}
      createLabel={"Create Loyalty Template"}
      docsUrl={"loyalty/templates"}
      isLoading={isPending}
      queryKeys={["watemplates"]}
      search={search}
      searchPlaceholder="Search loyalty templates..."
      onCreate={() => {}}
      onSearchChange={setSearch}
      sortValue={sortOption}
      onSortChange={setSortOption}
      isError={isError}
      onRetry={refetch}
      isEmpty={
        !isPending &&
        !isError &&
        filteredDrafts.length === 0 &&
        PREDEFINED_TEMPLATES.length === 0
      }
      emptyTitle={"No loyalty templates found"}
      emptyDescription={"Try changing filters or create a new template."}
      tourSteps={[]}
      createDisabledText="sss"
    >
      <h2 className="text-lg font-semibold mb-2">Drafted Templates</h2>
      <GenericCardGrid
        items={filteredDrafts}
        getKey={(template) => template.id}
        renderItem={(template) => (
          <GenericActionCard
            title={template?.data?.name}
            titleTooltip={template?.data?.name}
            subtitle={template?.data?.category || "Template"}
            actions={null}
            content={
              <div className="flex flex-wrap gap-2">
                <WaTemplateStatusBadge
                  status={template?.data?.status as never}
                />
              </div>
            }
            createdAt={template.createdAt}
            onClick={() => handleEditClick(template)}
          />
        )}
      />
      <h2 className="text-lg font-semibold mt-6 mb-2">Predefined Templates</h2>
      {/* Modal for confirmation and account selection */}
      <AccountSelector
        value={selectedAccountId}
        onChange={setSelectedAccountId}
        label="WhatsApp Account"
        withAllOption={false}
        optional={false}
      />
      <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
        <InfoIcon />
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription className="flex">
          Click a card to create a template from the list, or use the{" "}
          <span className="font-medium text-primary">Create as Draft</span>{" "}
          button.
        </AlertDescription>
      </Alert>
      <GenericCardGrid
        items={PREDEFINED_TEMPLATES}
        getKey={(tpl) => tpl.name}
        renderItem={(tpl) => (
          <GenericActionCard
            title={tpl.name}
            titleTooltip={tpl.name}
            subtitle={tpl.description}
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1 rounded-full hover:bg-accent focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Open actions menu"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    onClick={() => handleCreateFromPredefined(tpl)}
                  >
                    Create as Draft
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
            content={
              <div className="text-xs text-muted-foreground">{tpl.body}</div>
            }
            onClick={() => handleCreateFromPredefined(tpl)}
            footerLeft={<Badge variant="secondary">{tpl.type}</Badge>}
          />
        )}
      />

      <ConfirmationModal
        opened={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedPredefined(null);
        }}
        headerTitle={"Create Draft from Predefined Template"}
        headerLabel={
          selectedPredefined
            ? `Are you sure you want to create a draft from <b>${selectedPredefined.name}</b>? Please select a WhatsApp account to associate with this template.`
            : ""
        }
        confirmLabel={"Create Draft"}
        onConfirm={handleConfirmCreateDraft}
        loading={saveDraftMutation.isPending}
        excludeCancelButton={false}
        closeLabel={"Cancel"}
      />
    </ListPageLayout>
  );
}
