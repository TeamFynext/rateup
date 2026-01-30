import React, { useState } from "react";

import {
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Gift,
  Info,
  Loader2,
  Package,
  Percent,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
} from "lucide-react";

import { useCreateLoyaltyEarningRuleMutation } from "@/backend/loyalty/earningRules.query";
import { useCreateLoyaltyProgramMutation } from "@/backend/loyalty/program.query";
import { useCreateLoyaltyRewardMutation } from "@/backend/loyalty/reward.query";
import { useCreateLoyaltyTierMutation } from "@/backend/loyalty/tier.query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountryDropdown } from "@/components/ui/country-dropdown";
import { CurrencySelect } from "@/components/ui/currency-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface LoyaltyOnboardingProps {
  onComplete: () => void;
}

export function LoyaltyOnboarding({
  onComplete,
}: Readonly<LoyaltyOnboardingProps>) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createProgram = useCreateLoyaltyProgramMutation();
  const createEarningRule = useCreateLoyaltyEarningRuleMutation();
  const createTier = useCreateLoyaltyTierMutation();
  const createReward = useCreateLoyaltyRewardMutation();

  // Step 1: Basic Info
  const [programName, setProgramName] = useState("");
  const [pointsCurrency, setPointsCurrency] = useState("Points");
  const [moneyCurrency, setMoneyCurrency] = useState("INR");
  const [defaultCountryCode, setDefaultCountryCode] = useState("IN");

  // Step 2: Earning Rules - Updated to individual states
  const [standardEarningRate, setStandardEarningRate] = useState("10");
  const [currencyValue, setCurrencyValue] = useState("1");
  const [signupBonus, setSignupBonus] = useState("100");
  const [referralBonus, setReferralBonus] = useState("200");
  const [newCustomerBonus, setNewCustomerBonus] = useState("50");

  // Flexible reward types for bonuses
  const [newCustomerReward, setNewCustomerReward] = useState({
    type: "points",
    value: "50",
    name: "50 Points",
  });

  const [referralReward, setReferralReward] = useState({
    type: "points",
    value: "200",
    name: "200 Points",
  });

  const [welcomeReward, setWelcomeReward] = useState({
    type: "points",
    value: "100",
    name: "100 Points",
  });

  // Reward selector state
  const [showRewardSelector, setShowRewardSelector] = useState(false);
  const [currentBonusType, setCurrentBonusType] = useState<
    "new" | "referral" | "welcome"
  >("new");

  // Step 3: Tiers
  const [tiers, setTiers] = useState([
    {
      name: "Bronze",
      minPoints: "0",
      benefits: "Standard rewards",
      color: "#CD7F32",
    },
    {
      name: "Silver",
      minPoints: "1000",
      benefits: "10% bonus points",
      color: "#94A3B8",
    },
    {
      name: "Gold",
      minPoints: "5000",
      benefits: "20% bonus points",
      color: "#EAB308",
    },
    {
      name: "Platinum",
      minPoints: "10000",
      benefits: "30% bonus points + exclusive rewards",
      color: "#CBD5E1",
    },
  ]);

  // Step 4: Rewards
  const [rewards, setRewards] = useState<
    Array<{
      name: string;
      points: string;
      description: string;
      type: "coupon" | "assigned" | "point";
      value: string;
    }>
  >([
    {
      name: "50 Points",
      points: "50",
      description: "Get 50 loyalty points",
      type: "point",
      value: "50",
    },
    {
      name: "10% Off",
      points: "0",
      description: "10% discount on next purchase #54345",
      type: "coupon",
      value: "0",
    },
    {
      name: "Free Shipping",
      points: "150",
      description: "Free shipping on next order",
      type: "assigned",
      value: "0",
    },
  ]);

  // Predefined reward templates - Updated to only show point, coupon, assigned
  const rewardTemplates = [
    {
      id: "p1",
      type: "points",
      name: "50 Points",
      value: "50",
      icon: Sparkles,
      color: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      id: "p2",
      type: "points",
      name: "100 Points",
      value: "100",
      icon: Sparkles,
      color: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      id: "p3",
      type: "points",
      name: "200 Points",
      value: "200",
      icon: Sparkles,
      color: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      id: "p4",
      type: "points",
      name: "500 Points",
      value: "500",
      icon: Sparkles,
      color: "bg-blue-100",
      iconColor: "text-blue-600",
    },

    // Percentage Discounts
    {
      id: "d1",
      type: "percent_discount",
      name: "10% Off Next Purchase",
      value: "10",
      icon: Percent,
      color: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      id: "d2",
      type: "percent_discount",
      name: "15% Off Next Purchase",
      value: "15",
      icon: Percent,
      color: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      id: "d3",
      type: "percent_discount",
      name: "20% Off Next Purchase",
      value: "20",
      icon: Percent,
      color: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      id: "d4",
      type: "percent_discount",
      name: "25% Off Next Purchase",
      value: "25",
      icon: Percent,
      color: "bg-green-100",
      iconColor: "text-green-600",
    },

    // Fixed Discounts
    {
      id: "f1",
      type: "fixed_discount",
      name: "$5 Off Next Purchase",
      value: "5",
      icon: DollarSign,
      color: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      id: "f2",
      type: "fixed_discount",
      name: "$10 Off Next Purchase",
      value: "10",
      icon: DollarSign,
      color: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      id: "f3",
      type: "fixed_discount",
      name: "$20 Off Next Purchase",
      value: "20",
      icon: DollarSign,
      color: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      id: "f4",
      type: "fixed_discount",
      name: "$50 Off Next Purchase",
      value: "50",
      icon: DollarSign,
      color: "bg-purple-100",
      iconColor: "text-purple-600",
    },

    // Free Shipping
    {
      id: "s1",
      type: "free_shipping",
      name: "Free Shipping on Next Order",
      value: "1",
      icon: Truck,
      color: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      id: "s2",
      type: "free_shipping",
      name: "Free Express Shipping",
      value: "1",
      icon: Truck,
      color: "bg-orange-100",
      iconColor: "text-orange-600",
    },

    // Free Product
    {
      id: "pr1",
      type: "free_product",
      name: "Free Sample Product",
      value: "1",
      icon: Package,
      color: "bg-pink-100",
      iconColor: "text-pink-600",
    },
    {
      id: "pr2",
      type: "free_product",
      name: "Free Gift with Purchase",
      value: "1",
      icon: Package,
      color: "bg-pink-100",
      iconColor: "text-pink-600",
    },

    // Special Offers
    {
      id: "sp1",
      type: "bogo",
      name: "Buy One Get One Free",
      value: "1",
      icon: Tag,
      color: "bg-yellow-100",
      iconColor: "text-yellow-600",
    },
    {
      id: "sp2",
      type: "early_access",
      name: "Early Access to Sales",
      value: "1",
      icon: Sparkles,
      color: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
  ];

  const totalSteps = 5;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const steps = [
    { id: 1, name: "Basic Info", icon: Settings },
    { id: 2, name: "Earning Rules", icon: TrendingUp },
    { id: 3, name: "Tiers", icon: Award },
    { id: 4, name: "Rewards", icon: Gift },
    { id: 5, name: "Review", icon: CheckCircle2 },
  ];

  const handleLaunch = async () => {
    try {
      setIsSubmitting(true);

      // 1. Create Program
      await createProgram.mutateAsync({
        name: programName,
        currencyName: pointsCurrency,
        currencyCode: moneyCurrency.split(" ")[0], // Extract just the code
        defaultCountryCode,
        signupBonus: Number.parseFloat(signupBonus) || 0,
        referralBonus: Number.parseFloat(referralBonus) || 0,
        tiersEnabled: tiers.length > 0,
        status: "active",
      });

      // 2. Create Standard Earning Rule
      const standardRate = Number.parseFloat(standardEarningRate) || 0;
      const currencyVal = Number.parseFloat(currencyValue) || 1;
      if (standardRate > 0) {
        await createEarningRule.mutateAsync({
          name: "Standard Earning",
          pointsPerUnit: standardRate / currencyVal,
          status: "active",
          isDefault: true,
        });
      }

      // 3. Create First Purchase Rule (New Customer Bonus)
      const firstPurchaseBonus = Number.parseFloat(newCustomerBonus) || 0;
      if (firstPurchaseBonus > 0) {
        await createEarningRule.mutateAsync({
          name: "First Purchase Bonus",
          bonusPoints: firstPurchaseBonus,
          conditions: { customer_type: "new" },
          status: "active",
        });
      }

      // 4. Create Tiers
      if (tiers.length > 0) {
        // Create tiers sequentially to maintain priority order if API depends on it,
        // or just rely on the priority field.
        await Promise.all(
          tiers.map((tier, index) =>
            createTier.mutateAsync({
              name: tier.name,
              threshold: Number.parseFloat(tier.minPoints) || 0,
              pointsMultiplier: 1, // Default multiplier
              color: tier.color,
              benefitsDescription: tier.benefits,
              priority: index + 1,
            }),
          ),
        );
      }

      // 5. Create Rewards
      if (rewards.length > 0) {
        await Promise.all(
          rewards.map((reward) =>
            createReward.mutateAsync({
              name: reward.name,
              description: reward.description,
              pointsCost: parseFloat(reward.points) || 0,
              rewardType: reward.type,
              rewardValue: {
                ...(reward.value &&
                  reward.type === "point" && {
                    points: parseFloat(reward.value),
                  }),
              },
              status: "active",
            }),
          ),
        );
      }

      onComplete();
    } catch (error) {
      console.error("Failed to launch loyalty program", error);
      // Notifications are handled by the query hooks
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleLaunch();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addTier = () => {
    setTiers([
      ...tiers,
      { name: "", minPoints: "", benefits: "", color: "#6B7280" },
    ]);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const addReward = () => {
    setRewards([
      ...rewards,
      {
        name: "",
        points: "",
        description: "",
        type: "point",
        value: "",
      },
    ]);
  };

  const removeReward = (index: number) => {
    setRewards(rewards.filter((_, i) => i !== index));
  };

  const updateReward = (index: number, field: string, value: string) => {
    const updated = [...rewards];
    updated[index] = { ...updated[index], [field]: value };
    setRewards(updated);
  };

  const updateTier = (index: number, field: string, value: string) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  // Handle reward selection
  const handleSelectReward = (reward: any) => {
    if (currentBonusType === "new") {
      setNewCustomerReward(reward);
      setNewCustomerBonus(reward.value);
    } else if (currentBonusType === "referral") {
      setReferralReward(reward);
      setReferralBonus(reward.value);
    } else if (currentBonusType === "welcome") {
      setWelcomeReward(reward);
      setSignupBonus(reward.value);
    }
    setShowRewardSelector(false);
  };

  const openRewardSelector = (bonusType: "new" | "referral" | "welcome") => {
    setCurrentBonusType(bonusType);
    setShowRewardSelector(true);
  };

  const getRewardIcon = (type: string) => {
    const template = rewardTemplates.find((t) => t.type === type);
    return template?.icon || Sparkles;
  };

  const getRewardColor = (type: string) => {
    const template = rewardTemplates.find((t) => t.type === type);
    return template?.color || "bg-blue-100";
  };

  const getRewardIconColor = (type: string) => {
    const template = rewardTemplates.find((t) => t.type === type);
    return template?.iconColor || "text-blue-600";
  };

  return (
    <div className="min-h-screen h-screen bg-linear-to-b from-gray-50 to-white flex flex-col">
      {/* Header */}
      <div className="border-b bg-white shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded bg-linear-to-br from-[#1873E8] to-[#FF9500] flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">
              Loyalty Program Setup
            </span>
          </div>
          <h1 className="text-center text-4xl mb-2">
            Build Your Rewards Program
          </h1>
          <p className="text-center text-muted-foreground">
            Set up your loyalty program in just 5 simple steps
          </p>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Progress Section */}
          <Card className="border shadow-sm bg-white mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  Step {currentStep} of {totalSteps}
                </span>
                <span className="text-sm font-medium text-[#1873E8]">
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 bg-gray-200 rounded-full mb-8">
                <div
                  className="absolute left-0 top-0 h-full bg-linear-to-r from-[#1873E8] to-[#1873E8] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {/* Step Indicators */}
              <div className="grid grid-cols-5 gap-4">
                {steps.map((step) => {
                  const StepIcon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;

                  return (
                    <div key={step.id} className="flex flex-col items-center">
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 transition-all ${
                          isActive
                            ? "bg-[#1873E8] text-white shadow-lg"
                            : isCompleted
                              ? "bg-[#1873E8]/10 text-[#1873E8]"
                              : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        <StepIcon className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-xs text-center ${isActive ? "font-semibold text-[#1873E8]" : "text-muted-foreground"}`}
                      >
                        {step.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Step Content */}
          <Card className="border shadow-sm bg-white mb-6">
            <CardContent className="p-8">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl mb-2">Basic Program Information</h2>
                    <p className="text-muted-foreground">
                      Let's start with the basics of your loyalty program
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="programName">
                        Program Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="programName"
                        placeholder="e.g., VIP Rewards, Coffee Club, Customer Rewards"
                        value={programName}
                        onChange={(e) => setProgramName(e.target.value)}
                        className="border-gray-300"
                      />
                      <p className="text-sm text-muted-foreground">
                        This is what your customers will see
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pointsCurrency">
                          Points Currency Name
                        </Label>
                        <Input
                          id="pointsCurrency"
                          placeholder="Points"
                          value={pointsCurrency}
                          onChange={(e) => setPointsCurrency(e.target.value)}
                          className="border-gray-300"
                        />
                        <p className="text-sm text-muted-foreground">
                          What you call your loyalty currency
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="moneyCurrency">
                          Money Currency <span className="text-red-500">*</span>
                        </Label>
                        <CurrencySelect
                          name="moneyCurrency"
                          value={moneyCurrency}
                          onValueChange={setMoneyCurrency}
                          placeholder="Select Currency"
                          currencies="all"
                          variant="default"
                        />
                        <p className="text-sm text-muted-foreground">
                          Your business currency
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="defaultCountry">Default Country</Label>
                      <CountryDropdown
                        placeholder="Select Country"
                        defaultValue={defaultCountryCode}
                        onChange={(country) => {
                          setDefaultCountryCode(country.alpha2);
                        }}
                      />
                      <p className="text-sm text-muted-foreground">
                        Default country for customer phone numbers
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                      <Info className="w-5 h-5 text-[#1873E8] shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Example:</span>{" "}
                        Customers earn "{pointsCurrency}" when they spend{" "}
                        {moneyCurrency.split(" - ")[0]}. You can set the
                        conversion rate in the next step.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Earning Rules */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl mb-2">Earning Rules</h2>
                    <p className="text-muted-foreground">
                      Define how customers earn points in your program
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Standard Earning Rate */}
                    <Card className="border border-[#1873E8]/20 bg-white">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-[#1873E8]/10 flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-6 h-6 text-[#1873E8]" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">
                              Standard Earning Rate
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Points earned for every purchase
                            </p>

                            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-end max-w-2xl">
                              {/* Points Input */}
                              <div className="space-y-2">
                                <Label className="text-sm">
                                  {pointsCurrency}
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="10"
                                  value={standardEarningRate}
                                  onChange={(e) => {
                                    const points = e.target.value;
                                    setStandardEarningRate(points);
                                    // Auto-calculate currency: if we maintain the ratio
                                    // Example: if user changes to 20 points, currency stays 1
                                    // This maintains the conversion rate they set
                                  }}
                                  className="h-11"
                                />
                              </div>

                              {/* Equals Sign */}
                              <div className="pb-2.5 flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                  <span className="text-lg font-semibold text-slate-600">
                                    =
                                  </span>
                                </div>
                              </div>

                              {/* Currency Input */}
                              <div className="space-y-2">
                                <Label className="text-sm">
                                  {moneyCurrency.split(" - ")[0]}
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="1"
                                  value={currencyValue}
                                  onChange={(e) => {
                                    const currency = e.target.value;
                                    setCurrencyValue(currency);
                                    // Auto-calculate points: maintain the ratio
                                    // Example: if user changes to 2 currency, points auto-adjust
                                  }}
                                  className="h-11"
                                  step="0.01"
                                  min="0.01"
                                />
                              </div>
                            </div>

                            <div className="mt-3 flex items-start gap-2 max-w-2xl">
                              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                              <p className="text-xs text-muted-foreground">
                                Enter either points or currency to calculate the
                                conversion rate. Example: 10 {pointsCurrency} =
                                1 {moneyCurrency.split(" - ")[0]}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* New Customer Bonus */}
                    <Card className="border border-green-200 bg-white">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                            <Gift className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">
                              New Customer Bonus
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Bonus reward for first-time purchases
                            </p>

                            {/* Current Reward Display */}
                            <div className="mb-3">
                              <Label className="text-sm mb-2 block">
                                Selected Reward
                              </Label>
                              <div
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 border-green-200 ${getRewardColor(newCustomerReward.type)}`}
                              >
                                {React.createElement(
                                  getRewardIcon(newCustomerReward.type),
                                  {
                                    className: `w-5 h-5 ${getRewardIconColor(newCustomerReward.type)}`,
                                  },
                                )}
                                <span className="font-medium">
                                  {newCustomerReward.name}
                                </span>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              onClick={() => openRewardSelector("new")}
                              className="w-full border-[#1873E8] text-[#1873E8] hover:bg-[#1873E8]/5"
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Browse & Select Reward
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Referral Bonus */}
                    <Card className="border border-orange-200 bg-white">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                            <Users className="w-6 h-6 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">
                              Referral Bonus
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Reward for referring friends to join
                            </p>

                            {/* Current Reward Display */}
                            <div className="mb-3">
                              <Label className="text-sm mb-2 block">
                                Selected Reward
                              </Label>
                              <div
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 border-orange-200 ${getRewardColor(referralReward.type)}`}
                              >
                                {React.createElement(
                                  getRewardIcon(referralReward.type),
                                  {
                                    className: `w-5 h-5 ${getRewardIconColor(referralReward.type)}`,
                                  },
                                )}
                                <span className="font-medium">
                                  {referralReward.name}
                                </span>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              onClick={() => openRewardSelector("referral")}
                              className="w-full border-[#1873E8] text-[#1873E8] hover:bg-[#1873E8]/5"
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Browse & Select Reward
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Referral Welcome Bonus (formerly Signup Bonus) */}
                    <Card className="border border-purple-200 bg-white">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                            <UserPlus className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">
                              Referral Welcome Bonus
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Bonus for referred customers when they join
                            </p>

                            {/* Current Reward Display */}
                            <div className="mb-3">
                              <Label className="text-sm mb-2 block">
                                Selected Reward
                              </Label>
                              <div
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 border-purple-200 ${getRewardColor(welcomeReward.type)}`}
                              >
                                {React.createElement(
                                  getRewardIcon(welcomeReward.type),
                                  {
                                    className: `w-5 h-5 ${getRewardIconColor(welcomeReward.type)}`,
                                  },
                                )}
                                <span className="font-medium">
                                  {welcomeReward.name}
                                </span>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              onClick={() => openRewardSelector("welcome")}
                              className="w-full border-[#1873E8] text-[#1873E8] hover:bg-[#1873E8]/5"
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Browse & Select Reward
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Summary Section */}
                    <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
                      <CardContent className="p-5">
                        <h3 className="font-semibold mb-3">
                          Your Current Earning Structure
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-muted-foreground">
                              Every {moneyCurrency.split(" - ")[0]} spent
                            </span>
                            <span className="font-medium text-[#1873E8]">
                              {standardEarningRate} {pointsCurrency}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-muted-foreground">
                              First purchase
                            </span>
                            <span className="font-medium text-green-600">
                              {newCustomerBonus} {pointsCurrency}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-muted-foreground">
                              Refer a friend
                            </span>
                            <span className="font-medium text-orange-600">
                              {referralBonus} {pointsCurrency}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-muted-foreground">
                              Welcome bonus
                            </span>
                            <span className="font-medium text-purple-600">
                              {signupBonus} {pointsCurrency}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                      <Info className="w-5 h-5 text-[#1873E8] shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Tip:</span> A
                        well-balanced earning structure keeps customers engaged.
                        Consider offering bonuses for special events like
                        birthdays or anniversaries.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Tiers */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl mb-2">Customer Tiers</h2>
                    <p className="text-muted-foreground">
                      Set up tier levels to reward your most loyal customers
                    </p>
                  </div>

                  <div className="space-y-4">
                    {tiers.map((tier, index) => (
                      <Card key={index} className="border bg-white">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: tier.color }}
                              >
                                <Award className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  Tier {index + 1}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  Configure tier details
                                </p>
                              </div>
                            </div>
                            {tiers.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTier(index)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Tier Name</Label>
                                <Input
                                  placeholder="e.g., Bronze, Silver, Gold"
                                  value={tier.name}
                                  onChange={(e) =>
                                    updateTier(index, "name", e.target.value)
                                  }
                                  className="border-gray-300 bg-white"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Tier Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    type="color"
                                    value={tier.color}
                                    onChange={(e) =>
                                      updateTier(index, "color", e.target.value)
                                    }
                                    className="w-16 h-10 border-gray-300 cursor-pointer"
                                  />
                                  <Input
                                    type="text"
                                    placeholder="#CD7F32"
                                    value={tier.color}
                                    onChange={(e) =>
                                      updateTier(index, "color", e.target.value)
                                    }
                                    className="flex-1 border-gray-300 bg-white"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Minimum Points Required</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={tier.minPoints}
                                  onChange={(e) =>
                                    updateTier(
                                      index,
                                      "minPoints",
                                      e.target.value,
                                    )
                                  }
                                  className="border-gray-300 bg-white"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Benefits Description</Label>
                                <Input
                                  placeholder="e.g., Standard rewards, 10% bonus"
                                  value={tier.benefits}
                                  onChange={(e) =>
                                    updateTier(
                                      index,
                                      "benefits",
                                      e.target.value,
                                    )
                                  }
                                  className="border-gray-300 bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      variant="outline"
                      onClick={addTier}
                      className="w-full border-dashed border-2 border-[#1873E8] text-[#1873E8] hover:bg-[#1873E8]/5"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Tier
                    </Button>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                      <Info className="w-5 h-5 text-[#1873E8] shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Tip:</span> Create
                        meaningful tier names and colors that resonate with your
                        brand. Higher tiers should offer progressively better
                        benefits to encourage customer loyalty.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Rewards */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl mb-2">Rewards Catalog</h2>
                    <p className="text-muted-foreground">
                      Create rewards that customers can redeem with their points
                    </p>
                  </div>

                  <div className="space-y-4">
                    {rewards.map((reward, index) => (
                      <Card key={index} className="border bg-gray-50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h3 className="font-medium">Reward {index + 1}</h3>
                            {rewards.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeReward(index)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Reward Name</Label>
                                <Input
                                  placeholder="e.g., Free Delivery"
                                  value={reward.name}
                                  onChange={(e) =>
                                    updateReward(index, "name", e.target.value)
                                  }
                                  className="border-gray-300 bg-white"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Points Required</Label>
                                <Input
                                  type="number"
                                  placeholder="500"
                                  value={reward.points}
                                  disabled={reward.type !== "point"}
                                  onChange={(e) =>
                                    updateReward(
                                      index,
                                      "points",
                                      e.target.value,
                                    )
                                  }
                                  className="border-gray-300 bg-white"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                placeholder="Describe what customers get with this reward"
                                value={reward.description}
                                onChange={(e) =>
                                  updateReward(
                                    index,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                className="border-gray-300 bg-white"
                                rows={2}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      variant="outline"
                      onClick={addReward}
                      className="w-full border-dashed border-2 border-[#1873E8] text-[#1873E8] hover:bg-[#1873E8]/5"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Reward
                    </Button>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                      <Info className="w-5 h-5 text-[#1873E8] shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Tip:</span> Offer a
                        variety of rewards at different point levels to keep
                        customers engaged and coming back.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Review */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl mb-2">Review & Launch</h2>
                    <p className="text-muted-foreground">
                      Review your loyalty program settings before launching
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Basic Info Summary */}
                    <Card className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Settings className="w-4 h-4 text-[#1873E8]" />
                          Basic Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Program Name:
                          </span>
                          <span className="font-medium">
                            {programName || "Not set"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Points Currency:
                          </span>
                          <span className="font-medium">{pointsCurrency}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Money Currency:
                          </span>
                          <span className="font-medium">{moneyCurrency}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Earning Rules Summary */}
                    <Card className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-[#1873E8]" />
                          Earning Rules (4)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm py-2 border-b">
                          <span className="text-muted-foreground">
                            Standard Earning Rate:
                          </span>
                          <span className="font-medium">
                            {standardEarningRate} points per{" "}
                            {moneyCurrency.split(" - ")[0]}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm py-2 border-b">
                          <span className="text-muted-foreground">
                            First purchase:
                          </span>
                          <span className="font-medium">
                            {newCustomerBonus} points
                          </span>
                        </div>
                        <div className="flex justify-between text-sm py-2 border-b">
                          <span className="text-muted-foreground">
                            Refer a friend:
                          </span>
                          <span className="font-medium">
                            {referralBonus} points
                          </span>
                        </div>
                        <div className="flex justify-between text-sm py-2">
                          <span className="text-muted-foreground">
                            Welcome bonus:
                          </span>
                          <span className="font-medium">
                            {signupBonus} points
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tiers Summary */}
                    <Card className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#1873E8]" />
                          Customer Tiers ({tiers.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {tiers.map((tier, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tier.color }}
                              />
                              <span className="font-medium">{tier.name}</span>
                            </div>
                            <span className="text-muted-foreground">
                              {tier.minPoints}+ points
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Rewards Summary */}
                    <Card className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Gift className="w-4 h-4 text-[#1873E8]" />
                          Rewards ({rewards.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {rewards.map((reward, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm py-2 border-b last:border-0"
                          >
                            <span className="text-muted-foreground">
                              {reward.name || `Reward ${index + 1}`}:
                            </span>
                            <span className="font-medium">
                              {reward.points} points
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Ready to launch!</span>{" "}
                        Your loyalty program is configured and ready to go. You
                        can always modify these settings later from the program
                        dashboard.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="border-gray-300"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <Button
              onClick={handleNext}
              disabled={(currentStep === 1 && !programName) || isSubmitting}
              className="bg-[#1873E8] hover:bg-[#1873E8]/90 text-white min-w-35"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Launching...
                </>
              ) : currentStep === totalSteps ? (
                "Launch Program"
              ) : (
                "Next Step"
              )}
              {!isSubmitting && currentStep < totalSteps && (
                <ChevronRight className="w-4 h-4 ml-2" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Reward Selector Modal */}
      {showRewardSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Browse & Select Reward
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRewardSelector(false)}
                  className="hover:bg-gray-100"
                >
                  <span className="text-xl">&times;</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Choose a reward type for your{" "}
                {currentBonusType === "new"
                  ? "New Customer"
                  : currentBonusType === "referral"
                    ? "Referral"
                    : "Referral Welcome"}{" "}
                Bonus
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewardTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <Card
                      key={template.id}
                      className="border-2 hover:border-[#1873E8] cursor-pointer transition-all hover:shadow-md"
                      onClick={() => handleSelectReward(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-12 h-12 rounded-lg ${template.color} flex items-center justify-center shrink-0`}
                          >
                            <Icon className={`w-6 h-6 ${template.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm mb-1 truncate">
                              {template.name}
                            </h3>
                            <p className="text-xs text-muted-foreground capitalize">
                              {template.type.replace("_", " ")}
                            </p>
                          </div>
                          <Check className="w-5 h-5 text-[#1873E8] opacity-0 hover:opacity-100" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
