import { useState } from "react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";

import { useBookDemoMutation } from "@/backend/bookdemo/bookdemo.query";
import { RateupStar } from "@/components/integrations/logos";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";

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

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
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
      onError: (err) => {
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
      {/* `sm:max-w-xl`, not `max-w-xl`: the base width has to stay `DialogContent`'s own
          `max-w-[calc(100%-2rem)]` so the dialog keeps its gutters on a phone, and the override
          has to land on `sm` to beat the component's `sm:max-w-md`. The height cap plus the
          scrolling body below keep it inside short viewports — `dvh` so mobile browser chrome
          cannot push the submit button out of reach. */}
      <DialogContent className="sm:max-w-xl max-h-[90dvh] grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl p-4 sm:p-6">
        <div className="min-h-0 overflow-y-auto">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <RateupStar className="h-6 w-6" />
          </div>

          <DialogTitle className="text-center text-xl font-black leading-none tracking-[-0.03em] text-[#021B49]">
            Book a Demo
          </DialogTitle>

          <DialogDescription className="mx-auto mt-1 max-w-95 text-center text-xs leading-normal text-slate-600">
            See how RateUp turns WhatsApp into your loyalty engine. We'll reach out to schedule a
            quick walkthrough.
          </DialogDescription>

          <form className="mt-3" onSubmit={handleSubmit}>
            <FieldGroup className="gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="demo-name" className="font-bold">
                    Name
                  </FieldLabel>
                  <Input
                    id="demo-name"
                    placeholder="Your full name"
                    className="rounded-sm px-3"
                    aria-invalid={!!errors.name}
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                  {errors.name && <FieldError>{errors.name}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.email}>
                  <FieldLabel htmlFor="demo-email" className="font-bold">
                    Email
                  </FieldLabel>
                  <Input
                    id="demo-email"
                    type="email"
                    placeholder="Email address"
                    className="rounded-sm px-3"
                    aria-invalid={!!errors.email}
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                  {errors.email && <FieldError>{errors.email}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.businessName}>
                  <FieldLabel htmlFor="demo-business" className="font-bold">
                    Business Name
                  </FieldLabel>
                  <Input
                    id="demo-business"
                    placeholder="Your company"
                    className="rounded-sm px-3"
                    aria-invalid={!!errors.businessName}
                    value={formData.businessName}
                    onChange={(e) => handleInputChange("businessName", e.target.value)}
                  />
                  {errors.businessName && <FieldError>{errors.businessName}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.phone}>
                  <FieldLabel htmlFor="demo-phone" className="font-bold">
                    Phone
                  </FieldLabel>
                  <PhoneInput
                    id="demo-phone"
                    defaultCountry="IN"
                    international
                    countryCallingCodeEditable={false}
                    placeholder="Enter phone number"
                    aria-invalid={!!errors.phone}
                    value={formData.phone}
                    onChange={(value) => handleInputChange("phone", value ?? "")}
                  />
                  {errors.phone && <FieldError>{errors.phone}</FieldError>}
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="demo-message" className="font-bold">
                  Message
                  <span className="ml-1 text-xs font-medium text-muted-foreground">(Optional)</span>
                </FieldLabel>
                <Textarea
                  id="demo-message"
                  rows={2}
                  placeholder="Tell us a bit about what you're looking for..."
                  className="rounded-sm px-3"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                />
              </Field>

              <Button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-[9px] px-[18px] py-[10px] rounded-[9px] border border-transparent cursor-pointer text-[14px] font-bold text-white  bg-[linear-gradient(180deg,#3d8bee,#2360c8)]  shadow-[0_10px_30px_rgba(45,111,214,0.45),inset_0_1px_0_rgba(255,255,255,0.25)]  transition-all  hover:-translate-y-[2px]  hover:shadow-[0_14px_38px_rgba(45,111,214,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]  active:scale-[0.97]"
              >
                {isPending ? "Booking..." : "Book My Demo"}
              </Button>

              <p className="-mt-1 text-center text-[11px] text-slate-400">
                No credit card required · We'll only use your details to schedule the demo.
              </p>
            </FieldGroup>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
