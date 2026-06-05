"use client";

import { useState } from "react";

import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";

import { useBookDemoMutation } from "@/backend/bookdemo/bookdemo.query";
import { RateupStar } from "@/components/integrations/logos";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import styles from "@/styles/commonCssModules/homepagecss.module.css";

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DemoModal({ open, onClose }: DemoModalProps) {
  const { mutate, isPending } = useBookDemoMutation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    businessName: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }
    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business name is required";
    }
    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!isValidPhoneNumber(formData.phone)) {
      newErrors.phone = "Invalid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      Object.values(errors).forEach((error) => {
        if (error) toast.error(error);
      });
      return;
    }

    const payload = {
      name: formData.name.split(" ")[0].trim(),
      workEmail: formData.email.trim(),
      phone: formData.phone.trim(),
      businessName: formData.businessName.trim(),
      message: formData.message.trim(),
    };

    mutate(payload, {
      onSuccess: () => {
        toast.success("Demo request submitted successfully!");
        setFormData({
          name: "",
          email: "",
          businessName: "",
          phone: "",
          message: "",
        });
        onClose();
      },
      onError: (err: any) => {
        console.error("Demo booking failed:", err);
        toast.error("Failed to submit demo request. Please try again.");
      },
    });
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl rounded-xl border-0 p-0 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.42)] max-h-[92vh]">
        <div className="overflow-y-auto max-h-[92vh] px-7 pb-6 pt-7">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#072554]">
            <RateupStar className="h-8 w-8" />
          </div>

          <h2 className="text-center text-2xl font-black leading-none tracking-[-0.03em] text-[#021B49]">
            Book a Demo
          </h2>

          <p className="mx-auto mt-1 max-w-[340px] text-center text-xs leading-[1.6] text-slate-600">
            See how RateUp turns WhatsApp into your loyalty engine. We'll reach
            out to schedule a quick walkthrough.
          </p>

          <form className="mt-2 flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-bold">Name</label>

              <Input
                placeholder="Your full name"
                className="rounded-sm px-4 text-sm"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
              {errors.name && (
                <p className="text-red-500 text-xs">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Email</label>

              <Input
                placeholder="Email address"
                className="rounded-sm px-4 text-sm"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
              {errors.email && (
                <p className="text-red-500 text-xs">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Business Name</label>

              <Input
                placeholder="Your company"
                className="rounded-sm px-4 text-sm"
                value={formData.businessName}
                onChange={(e) =>
                  handleInputChange("businessName", e.target.value)
                }
              />
              {errors.businessName && (
                <p className="text-red-500 text-xs">{errors.businessName}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Phone</label>
              <PhoneInput
                id="demo-phone"
                defaultCountry="IN"
                international
                countryCallingCodeEditable={false}
                placeholder="Enter phone number"
                className="w-full"
                value={formData.phone}
                onChange={(value) => handleInputChange("phone", value ?? "")}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">
                Message
                <span className="ml-1 text-[12px] font-medium text-slate-400">
                  (Optional)
                </span>
              </label>

              <Textarea
                rows={3}
                placeholder="Tell us a bit about what you're looking for..."
                className="rounded-sm px-4 text-sm"
                value={formData.message}
                onChange={(e) => handleInputChange("message", e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className={` ${styles["btn"]} ${styles["btn-primary"]} ${styles["btn-sm"]}`}
            >
              {isPending ? "Booking..." : "Book My Demo"}
            </Button>

            <p className="text-center text-[11px] text-slate-400">
              No credit card required · We'll only use your details to schedule
              the demo.
            </p>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
