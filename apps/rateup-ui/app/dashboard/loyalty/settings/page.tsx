"use client";

import { useEffect, useState } from "react";

import { Award, Edit2, Info, Loader2, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  useLoyaltyProgram,
  useUpdateLoyaltyProgramMutation,
} from "@/backend/loyalty/program.query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function LoyaltySettingsPage() {
  const t = useTranslations();

  const { data: program, isLoading } = useLoyaltyProgram();
  const updateProgramMutation = useUpdateLoyaltyProgramMutation(
    program?.id || "",
  );

  const [programName, setProgramName] = useState(
    program?.name || "RateUp Rewards",
  );
  const [pointsCurrency, setPointsCurrency] = useState(
    program?.currencyName || "Points",
  );
  const [moneyCurrency, setMoneyCurrency] = useState(
    program?.currencyCode || "AED",
  );

  // Referral message customization
  const [referralMessage, setReferralMessage] = useState(
    "Welcome to Royal Resorts! To join our loyalty referral program, send this message: #loyalty_referral @{CODE}",
  );

  // Update state when program data loads
  useEffect(() => {
    if (program) {
      setProgramName(program.name);
      setPointsCurrency(program.currencyName);
      setMoneyCurrency(program.currencyCode);
    }
  }, [program]);

  const handleSaveSettings = () => {
    if (program?.id) {
      updateProgramMutation.mutate({
        name: programName,
        currencyName: pointsCurrency,
        currencyCode: moneyCurrency,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Customer Tier Distribution
  const tierDistributionData = [
    {
      name: t("Bronze"),
      value: 620,
      percentage: 50,
      color: "#CD7F32",
    },
    {
      name: t("Silver"),
      value: 370,
      percentage: 30,
      color: "#94A3B8",
    },
    {
      name: t("Gold"),
      value: 186,
      percentage: 15,
      color: "#EAB308",
    },
    {
      name: t("Platinum"),
      value: 62,
      percentage: 5,
      color: "#CBD5E1",
    },
  ];

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl mb-1">{t("Loyalty Program Settings")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Configure your loyalty program settings")}
        </p>
      </div>

      {/* Basic Program Settings & Earning Rules - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Basic Program Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Basic Settings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="program-name" className="text-xs">
                {t("Program Name")}
              </Label>
              <Input
                id="program-name"
                placeholder={t("e.g., VIP Rewards")}
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="points-currency" className="text-xs">
                {t("Points Currency")}
              </Label>
              <Input
                id="points-currency"
                placeholder={t("Points")}
                value={pointsCurrency}
                onChange={(e) => setPointsCurrency(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="money-currency" className="text-xs">
                {t("Money Currency")}
              </Label>
              <Select value={moneyCurrency} onValueChange={setMoneyCurrency}>
                <SelectTrigger id="money-currency" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">{t("AED - UAE Dirham")}</SelectItem>
                  <SelectItem value="USD">{t("USD - US Dollar")}</SelectItem>
                  <SelectItem value="EUR - Euro">{t("EUR - Euro")}</SelectItem>
                  <SelectItem value="GBP - British Pound">
                    {t("GBP - British Pound")}
                  </SelectItem>
                  <SelectItem value="SAR - Saudi Riyal">
                    {t("SAR - Saudi Riyal")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              className="w-full mt-2"
              onClick={handleSaveSettings}
              disabled={updateProgramMutation.isPending}
            >
              {updateProgramMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("Saving...")}
                </>
              ) : (
                t("Save Changes")
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Earning Rules Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Earning Rules")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Standard Earning Rate */}
            <div className="flex items-center justify-between p-2.5 border rounded-lg bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t("Standard Rate")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Per purchase")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  defaultValue="10"
                  className="w-16 h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  pts/AED
                </span>
              </div>
            </div>

            {/* Signup Bonus */}
            <div className="flex items-center justify-between p-2.5 border rounded-lg bg-purple-500/5 dark:bg-purple-500/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600 dark:bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t("Signup Bonus")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("One-time")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  defaultValue="100"
                  className="w-16 h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground">
                  {t("pts")}
                </span>
              </div>
            </div>

            {/* Referral Bonus */}
            <div className="flex items-center justify-between p-2.5 border rounded-lg bg-orange-500/5 dark:bg-orange-500/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-600 dark:bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t("Referral Bonus")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Per referral")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  defaultValue="200"
                  className="w-16 h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground">
                  {t("pts")}
                </span>
              </div>
            </div>

            {/* New Customer Bonus */}
            <div className="flex items-center justify-between p-2.5 border rounded-lg bg-green-500/5 dark:bg-green-500/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-600 dark:bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t("New Customer")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("First purchase")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  defaultValue="50"
                  className="w-16 h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground">pts</span>
              </div>
            </div>

            <Button size="sm" className="w-full mt-2">
              {t("Save Changes")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Referral Message Customization - Full Width */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {t("Referral Message Template")}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {t(
                  "Customize the message customers share to invite others to join the referral program",
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-primary font-medium">
                {t("Use {CODE} for referral code")}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Edit Section */}
            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="referral-message"
                  className="text-xs mb-2 block"
                >
                  {t("Message Template")}
                </Label>
                <Textarea
                  id="referral-message"
                  value={referralMessage}
                  onChange={(e) => setReferralMessage(e.target.value)}
                  placeholder={t("Enter your referral message template...")}
                  className="min-h-35 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t("{count} characters", { count: referralMessage.length })}
                </p>
              </div>
              <Button size="sm" className="w-full">
                {t("Save Message Template")}
              </Button>
            </div>

            {/* Live Preview Section */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-2 block">
                  {t("Live Preview")}
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 bg-muted/30 min-h-35">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs text-primary-foreground font-medium">
                          AA
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium mb-1">
                          Ahmed Al-Mansoori
                        </p>
                        <div className="bg-card rounded-lg rounded-tl-none p-3 border shadow-sm">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {referralMessage.replace("{CODE}", "AM2X8K9P")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t(
                    "Preview shows how the message appears with sample code AM2X8K9P",
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Tiers & Notifications - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Tiers Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("Customer Tiers")}</CardTitle>
              <Button variant="outline" size="sm" className="h-8">
                <Edit2 className="w-3 h-3 mr-1.5" />
                {t("Modify")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {tierDistributionData.map((tier, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: tier.color }}
                  >
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("{count} members", { count: tier.value })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{tier.percentage}%</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Program Status & Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Notifications")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-2.5 border rounded-lg">
              <div>
                <p className="text-sm font-medium">{t("Program Active")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Enable/disable program")}
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-2.5 border rounded-lg">
              <div>
                <p className="text-sm font-medium">
                  {t("Customer Notifications")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Points activity alerts")}
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-2.5 border rounded-lg">
              <div>
                <p className="text-sm font-medium">
                  {t("Auto-approve Adjustments")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Skip approval flow")}
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-2.5 border rounded-lg">
              <div>
                <p className="text-sm font-medium">
                  {t("Email Notifications")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Send via email")}
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-2.5 border rounded-lg">
              <div>
                <p className="text-sm font-medium">
                  {t("WhatsApp Notifications")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Send via WhatsApp")}
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Points Expiration & Danger Zone - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Points Expiration Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("Points Expiration")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2.5 border rounded-lg">
              <div>
                <p className="text-sm font-medium">{t("Enable Expiration")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Points expire after period")}
                </p>
              </div>
              <Switch />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expiration-months" className="text-xs">
                {t("Expiration Period")}
              </Label>
              <Select defaultValue="12">
                <SelectTrigger id="expiration-months" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t("3 months")}</SelectItem>
                  <SelectItem value="6">{t("6 months")}</SelectItem>
                  <SelectItem value="12">{t("12 months")}</SelectItem>
                  <SelectItem value="24">{t("24 months")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button size="sm" className="w-full">
              {t("Save Changes")}
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              {t("Danger Zone")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-2.5 border-2 border-destructive/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-destructive">
                  {t("Reset Points")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Set all to zero")}
                </p>
              </div>
              <Button variant="destructive" size="sm" className="h-8">
                {t("Reset")}
              </Button>
            </div>

            <div className="flex items-center justify-between p-2.5 border-2 border-destructive/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-destructive">
                  {t("Delete Program")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Remove all data")}
                </p>
              </div>
              <Button variant="destructive" size="sm" className="h-8">
                {t("Delete")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
