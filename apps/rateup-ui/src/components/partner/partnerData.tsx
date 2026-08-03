import {
  IconArrowLeft,
  IconArrowRight,
  IconBuilding,
  IconCircleCheck,
  IconCpu,
  IconHeartHandshake,
  IconSend,
  IconShieldCheck,
  IconTarget,
  IconUserCircle,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod/v4";

import { usePartnerApplicationMutation } from "@/backend/partnerdata/partnerdata.query";
import { partnerApplicationSchema } from "@/components/RateupHomePage/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CountryDropdown } from "@/components/ui/country-dropdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/* ─────────────────────────── types ─────────────────────────── */

interface FormData {
  // step 1
  fullName: string;
  workEmail: string;
  phone: string;
  companyName: string;
  website: string;
  country: string;
  // step 2
  businessType: string;
  companySize: string;
  yearsInBusiness: string;
  // step 3
  whyPartner: string;
  services: string[];
  referralVolume: string;
  managesClients: string;
  // step 4
  apiExperience: string;
  canOnboard: string;
}

const INITIAL: FormData = {
  fullName: "",
  workEmail: "",
  phone: "",
  companyName: "",
  website: "",
  country: "India",
  businessType: "",
  companySize: "",
  yearsInBusiness: "",
  whyPartner: "",
  services: [],
  referralVolume: "",
  managesClients: "",
  apiExperience: "",
  canOnboard: "",
};

const SERVICES = [
  "WhatsApp Marketing",
  "CRM",
  "Automation",
  "Customer Support",
  "Social Media Marketing",
  "AI Chatbots",
  "Other",
];

const STEPS = [
  { label: "Basic info", icon: IconUserCircle },
  { label: "Business", icon: IconBuilding },
  { label: "Qualification", icon: IconTarget },
  { label: "Technical", icon: IconCpu },
];

/* ─────────────── validation utilities ─────────────── */

type ValidationErrors = Partial<Record<keyof FormData, string>>;

const validateStep = (step: number, data: FormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  try {
    switch (step) {
      case 0: // Step 1: Basic info
        partnerApplicationSchema
          .pick({
            fullName: true,
            workEmail: true,
            phone: true,
            companyName: true,
            website: true,
            country: true,
          })
          .parse(data);
        break;

      case 1: // Step 2: Business details
        partnerApplicationSchema
          .pick({
            businessType: true,
            companySize: true,
            yearsInBusiness: true,
          })
          .parse(data);
        break;

      case 2: // Step 3: Partnership qualification
        partnerApplicationSchema
          .pick({
            whyPartner: true,
            services: true,
            referralVolume: true,
            managesClients: true,
          })
          .parse(data);
        break;

      case 3: // Step 4: Technical capability
        partnerApplicationSchema
          .pick({
            apiExperience: true,
            canOnboard: true,
          })
          .parse(data);
        break;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        errors[path as keyof FormData] = issue.message;
      });
    }
  }

  return errors;
};

/* ─────────────────────── sub-components ──────────────────────── */

function FieldGroup({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return <div className={cn("grid gap-4", className)}>{children}</div>;
}

function FormField({
  label,
  children,
  className,
  error,
}: Readonly<{
  label: string;
  children: React.ReactNode;
  className?: string;
  error?: string;
}>) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </FieldTitle>
      {children}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

function SectionHeading({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">
      {children}
    </p>
  );
}

/* ──────────────────────── step panels ────────────────────────── */

function Step1({
  data,
  set,
  errors,
}: Readonly<{
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
  errors: ValidationErrors;
}>) {
  return (
    <div className="space-y-5">
      <SectionHeading>Basic information</SectionHeading>
      <FieldGroup className="grid-cols-2">
        <FormField label="Full name" error={errors.fullName}>
          <Input
            placeholder="Jane Smith"
            value={data.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            className={errors.fullName ? "border-red-500" : ""}
          />
        </FormField>
        <FormField label="Work email" error={errors.workEmail}>
          <Input
            type="email"
            placeholder="jane@company.com"
            value={data.workEmail}
            onChange={(e) => set("workEmail", e.target.value)}
            className={errors.workEmail ? "border-red-500" : ""}
          />
        </FormField>
      </FieldGroup>
      <FieldGroup className="grid-cols-2">
        <FormField label="Phone number" error={errors.phone}>
          <Input
            type="tel"
            placeholder="+1 234 567 8900"
            value={data.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={errors.phone ? "border-red-500" : ""}
          />
        </FormField>
        <FormField label="Company name" error={errors.companyName}>
          <Input
            placeholder="Acme Agency"
            value={data.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            className={errors.companyName ? "border-red-500" : ""}
          />
        </FormField>
      </FieldGroup>
      <FieldGroup className="grid-cols-2">
        <FormField label="Company website" error={errors.website}>
          <Input
            type="url"
            placeholder="https://acme.com"
            value={data.website}
            onChange={(e) => set("website", e.target.value)}
            className={errors.website ? "border-red-500" : ""}
          />
        </FormField>
        <FormField label="Country / Region" error={errors.country}>
          <CountryDropdown
            placeholder="Select Country"
            defaultValue={data.country}
            onChange={(country) => {
              set("country", country.name);
            }}
          />
        </FormField>
      </FieldGroup>
    </div>
  );
}

function Step2({
  data,
  set,
  errors,
}: Readonly<{
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
  errors: ValidationErrors;
}>) {
  return (
    <div className="space-y-5">
      <SectionHeading>Business details</SectionHeading>
      <FormField label="Business type" error={errors.businessType}>
        <Select
          value={data.businessType}
          onValueChange={(v) => set("businessType", v ?? "")}
          items={[
            "Digital Agency",
            "Marketing Agency",
            "Consultant",
            "SaaS Reseller",
            "Freelancer",
            "System Integrator",
            "Other",
          ].map((t) => ({ value: t, label: t }))}
        >
          <SelectTrigger className={errors.businessType ? "border-red-500" : ""}>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {[
              "Digital Agency",
              "Marketing Agency",
              "Consultant",
              "SaaS Reseller",
              "Freelancer",
              "System Integrator",
              "Other",
            ].map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FieldGroup className="grid-cols-2">
        <FormField label="Company size" error={errors.companySize}>
          <Select
            value={data.companySize}
            onValueChange={(v) => set("companySize", v ?? "")}
            items={["Just me", "2–10", "11–50", "50+"].map((s) => ({ value: s, label: s }))}
          >
            <SelectTrigger className={errors.companySize ? "border-red-500" : ""}>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {["Just me", "2–10", "11–50", "50+"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Years in business" error={errors.yearsInBusiness}>
          <Select
            value={data.yearsInBusiness}
            onValueChange={(v) => set("yearsInBusiness", v ?? "")}
            items={["Less than 1 year", "1–3 years", "3–5 years", "5+ years"].map((y) => ({
              value: y,
              label: y,
            }))}
          >
            <SelectTrigger className={errors.yearsInBusiness ? "border-red-500" : ""}>
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {["Less than 1 year", "1–3 years", "3–5 years", "5+ years"].map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </FieldGroup>
    </div>
  );
}

function Step3({
  data,
  set,
  toggleService,
  errors,
}: Readonly<{
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
  toggleService: (s: string) => void;
  errors: ValidationErrors;
}>) {
  return (
    <FieldSet className="gap-5">
      <SectionHeading>Partnership qualification</SectionHeading>
      <FormField label="Why do you want to partner with RateUp?" error={errors.whyPartner}>
        <Textarea
          placeholder="Tell us about your goals and how you plan to refer clients..."
          className={cn("min-h-[90px] resize-none", errors.whyPartner ? "border-red-500" : "")}
          value={data.whyPartner}
          onChange={(e) => set("whyPartner", e.target.value)}
        />
      </FormField>

      <FormField label="Services you currently offer" error={errors.services}>
        <Field
          className={cn(
            "grid grid-cols-2 gap-2 mt-0.5",
            errors.services ? "border border-red-500 rounded p-2" : "",
          )}
        >
          {SERVICES.map((s) => (
            <FieldLegend
              variant="label"
              key={s}
              className={cn(
                "flex items-center gap-2.5 rounded-md border px-3 py-2.5 cursor-pointer text-sm transition-colors",
                data.services.includes(s)
                  ? "border-primary/50 bg-primary/5 text-primary"
                  : "border-border hover:border-primary/30 hover:bg-accent/50",
              )}
            >
              <Checkbox
                checked={data.services.includes(s)}
                onCheckedChange={() => toggleService(s)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="leading-none">{s}</span>
            </FieldLegend>
          ))}
        </Field>
      </FormField>

      <FieldGroup className="grid-cols-2">
        <FormField label="Clients you can refer per month" error={errors.referralVolume}>
          <Select
            value={data.referralVolume}
            onValueChange={(v) => set("referralVolume", v ?? "")}
            items={["1–5", "5–20", "20+"].map((r) => ({ value: r, label: r }))}
          >
            <SelectTrigger className={errors.referralVolume ? "border-red-500" : ""}>
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {["1–5", "5–20", "20+"].map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Do you manage business clients?" error={errors.managesClients}>
          <RadioGroup
            value={data.managesClients}
            onValueChange={(v) => set("managesClients", v ?? "")}
            className="flex gap-2 mt-0.5"
          >
            {["Yes", "No"].map((opt) => (
              <FieldTitle
                key={opt}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2.5 cursor-pointer text-sm transition-colors",
                  data.managesClients === opt
                    ? "border-primary/50 bg-primary/5 text-primary"
                    : "border-border hover:border-primary/30",
                )}
              >
                <RadioGroupItem value={opt} className="sr-only" />
                {opt}
              </FieldTitle>
            ))}
          </RadioGroup>
        </FormField>
      </FieldGroup>
    </FieldSet>
  );
}

function Step4({
  data,
  set,
  errors,
}: Readonly<{
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
  errors: ValidationErrors;
}>) {
  const apiOptions = ["Yes, extensively", "Yes, some experience", "No, but willing to learn", "No"];
  const onboardOptions = ["Yes", "No", "With training"];

  return (
    <div className="space-y-5">
      <SectionHeading>Technical &amp; sales capability</SectionHeading>

      <FormField
        label="Have you worked with WhatsApp APIs or customer engagement platforms?"
        error={errors.apiExperience}
      >
        <RadioGroup
          value={data.apiExperience}
          onValueChange={(v) => set("apiExperience", v ?? "")}
          className={cn(
            "grid grid-cols-2 gap-2 mt-0.5",
            errors.apiExperience ? "border border-red-500 rounded p-2" : "",
          )}
        >
          {apiOptions.map((opt) => (
            <FieldTitle
              key={opt}
              className={cn(
                "flex items-center gap-2.5 rounded-md border px-3 py-2.5 cursor-pointer text-sm transition-colors",
                data.apiExperience === opt
                  ? "border-primary/50 bg-primary/5 text-primary"
                  : "border-border hover:border-primary/30",
              )}
            >
              <RadioGroupItem value={opt} />
              <span className="leading-tight">{opt}</span>
            </FieldTitle>
          ))}
        </RadioGroup>
      </FormField>

      <FormField
        label="Can your team provide onboarding and support to clients?"
        error={errors.canOnboard}
      >
        <RadioGroup
          value={data.canOnboard}
          onValueChange={(v) => set("canOnboard", v ?? "")}
          className={cn(
            "flex gap-2 mt-0.5",
            errors.canOnboard ? "border border-red-500 rounded p-2" : "",
          )}
        >
          {onboardOptions.map((opt) => (
            <FieldTitle
              key={opt}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2.5 cursor-pointer text-sm transition-colors",
                data.canOnboard === opt
                  ? "border-primary/50 bg-primary/5 text-primary"
                  : "border-border hover:border-primary/30",
              )}
            >
              <RadioGroupItem value={opt} className="sr-only" />
              {opt}
            </FieldTitle>
          ))}
        </RadioGroup>
      </FormField>

      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mt-2">
        <IconShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your information is confidential and will only be used to process your partner
          application. We'll respond within 3–5 business days.
        </p>
      </div>
    </div>
  );
}

function SuccessScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <IconCircleCheck className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-1">Application submitted!</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Thanks for applying to become a RateUp partner. Your dedicated partner manager will be in
          touch within 3–5 business days.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        {["No joining fees", "Free demo account", "Recurring commissions"].map((t) => (
          <Badge key={t} variant="secondary" className="gap-1 text-xs">
            <IconCircleCheck className="h-3 w-3 text-primary" />
            {t}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────── main modal ───────────────────────── */

interface PartnerApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PartnerApplyModal({ open, onOpenChange }: Readonly<PartnerApplyModalProps>) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [data, setData] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const partnerMutation = usePartnerApplicationMutation();

  function set(key: keyof FormData, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function toggleService(s: string) {
    setData((prev) => ({
      ...prev,
      services: prev.services.includes(s)
        ? prev.services.filter((x) => x !== s)
        : [...prev.services, s],
    }));
    if (errors.services) {
      setErrors((prev) => ({ ...prev, services: undefined }));
    }
  }

  async function next() {
    const stepErrors = validateStep(step, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      toast.error("Please fix the errors above");
      return;
    }

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      setErrors({});
    } else {
      try {
        await partnerMutation.mutateAsync(data);
        setSubmitted(true);
        toast.success("Application submitted successfully!");
      } catch (error) {
        console.error("Submission error:", error);
        toast.error("Failed to submit application. Please try again.");
      }
    }
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
    setErrors({});
  }

  function handleClose(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setTimeout(() => {
        setStep(0);
        setSubmitted(false);
        setData(INITIAL);
        setErrors({});
      }, 300);
    }
  }

  const progressValue = submitted ? 100 : ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[600px] p-0 gap-0 overflow-hidden">
        {/* ── header ── */}
        <div className="relative bg-gradient-to-br from-[#0f1729] via-[#1a2642] to-[#0f1729] px-6 pt-6 pb-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-lg font-semibold">
              <IconHeartHandshake className="h-5 w-5 text-[#FF9500]" />
              Partner Application
            </DialogTitle>
            <p className="text-sm text-white/60 mt-1">
              Join 500+ partners earning recurring commissions with RateUp
            </p>
          </DialogHeader>

          {/* step tabs */}
          {!submitted && (
            <div className="flex gap-1 mt-5">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === step;
                const isDone = i < step;
                return (
                  <div
                    key={s.label}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 py-1.5 rounded text-[11px] font-medium transition-colors",
                      isActive && "bg-white/15 text-white",
                      isDone && "text-white/50",
                      !isActive && !isDone && "text-white/30",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── progress bar ── */}
        <Progress value={progressValue} className="h-0.5 rounded-none" />

        {/* ── body ── */}
        <div className="px-6 py-5 max-h-[420px] overflow-y-auto">
          {submitted ? (
            <SuccessScreen />
          ) : step === 0 ? (
            <Step1 data={data} set={set} errors={errors} />
          ) : step === 1 ? (
            <Step2 data={data} set={set} errors={errors} />
          ) : step === 2 ? (
            <Step3 data={data} set={set} toggleService={toggleService} errors={errors} />
          ) : (
            <Step4 data={data} set={set} errors={errors} />
          )}
        </div>

        {/* ── footer ── */}
        {!submitted && (
          <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-4">
            <span className="text-xs text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </span>
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={back}
                  disabled={partnerMutation.isPending}
                >
                  <IconArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back
                </Button>
              )}
              <Button
                size="sm"
                className="bg-[#2E5BFF] hover:bg-[#1a3db8] text-white border-0"
                onClick={next}
                disabled={partnerMutation.isPending}
              >
                {partnerMutation.isPending ? (
                  <>
                    <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    Submitting...
                  </>
                ) : step === STEPS.length - 1 ? (
                  <>
                    <IconSend className="mr-1.5 h-3.5 w-3.5" />
                    Submit application
                  </>
                ) : (
                  <>
                    Continue
                    <IconArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
