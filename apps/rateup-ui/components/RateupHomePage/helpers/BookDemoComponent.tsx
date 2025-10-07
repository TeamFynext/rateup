"use client";

import React from "react";

import { useForm } from "@mantine/form";
import {
  Building,
  Calendar,
  Mail,
  Phone,
  Target,
  User,
  Zap,
} from "lucide-react";

import { useBookDemoMutation } from "@/backend/bookdemo/bookdemo.query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function BookDemoComponent() {
  const { mutate, isPending, isSuccess, error, reset } = useBookDemoMutation();

  const fromData = useForm({
    initialValues: {
      firstname: "",
      lastname: "",
      phone: "",
      email: "",
      companyName: "",
      teamSize: "",
      preferredTime: "",
      useCase: "",
      additionalInfo: "",
    },
  });

  const timeSlots = [
    "9:00 AM - 9:30 AM",
    "10:00 AM - 10:30 AM",
    "11:00 AM - 11:30 AM",
    "2:00 PM - 2:30 PM",
    "3:00 PM - 3:30 PM",
    "4:00 PM - 4:30 PM",
  ];

  const teamSizes = [
    "1-10 employees",
    "11-50 employees",
    "51-200 employees",
    "201-500 employees",
    "500+ employees",
  ];

  const useCases = [
    "WhatsApp Business API Setup",
    "Multi-channel Customer Support",
    "Sales & Lead Generation",
    "Customer Loyalty Programs",
    "Automation & AI Implementation",
    "Team Collaboration",
    "Analytics & Reporting",
    "Other",
  ];

  const handleSubmit = (values: typeof fromData.values) => {
    console.log(values);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rateup-blue/5 via-white to-rateup-orange/5">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl mb-6">Book Your Personal Demo</h1>
            <p className="text-lg text-gray-600 mb-8">
              Get a personalized walkthrough of RateUp's customer engagement
              platform. See exactly how it can transform your business
              operations.
            </p>

            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-rateup-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-rateup-blue" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">30-Minute Session</h3>
                  <p className="text-sm text-gray-600">
                    Comprehensive platform walkthrough tailored to your needs
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-rateup-orange/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-rateup-orange" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">
                    Customized to Your Business
                  </h3>
                  <p className="text-sm text-gray-600">
                    See features relevant to your industry and use case
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Implementation Strategy</h3>
                  <p className="text-sm text-gray-600">
                    Get a roadmap for rolling out RateUp in your organization
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gradient-to-r from-rateup-blue/5 to-rateup-orange/5 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>What to expect:</strong> Live demo of WhatsApp Business
                API integration, team collaboration features, automation setup,
                and analytics dashboard.
              </p>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:col-span-3">
            <Card className="p-8 shadow-xl">
              <form
                className="space-y-6"
                onSubmit={fromData.onSubmit(handleSubmit)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div className="space-y-2">
                    <Label htmlFor="firstname">First Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="firstname"
                        type="text"
                        placeholder="John"
                        className="pl-10"
                        required
                        {...fromData.getInputProps("firstname")}
                      />
                    </div>
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <Label htmlFor="lastname">Last Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="lastname"
                        type="text"
                        placeholder="Doe"
                        className="pl-10"
                        required
                        {...fromData.getInputProps("lastname")}
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      className="pl-10"
                      required
                      {...fromData.getInputProps("email")}
                    />
                  </div>
                </div>

                {/* Phone + Company */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="pl-10"
                        {...fromData.getInputProps("phone")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="companyName"
                        type="text"
                        placeholder="Your Company"
                        className="pl-10"
                        required
                        {...fromData.getInputProps("companyName")}
                      />
                    </div>
                  </div>
                </div>

                {/* Team Size + Time Slot */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamSize">Team Size</Label>
                    <Select
                      value={fromData.values.teamSize}
                      onValueChange={(val) =>
                        fromData.setFieldValue("teamSize", val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team size" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamSizes.map((size, index) => (
                          <SelectItem key={index} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredTime">Preferred Time *</Label>
                    <Select
                      required
                      value={fromData.values.preferredTime}
                      onValueChange={(val) =>
                        fromData.setFieldValue("preferredTime", val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot, index) => (
                          <SelectItem key={index} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Use Case */}
                <div className="space-y-2 w-full">
                  <Label htmlFor="useCase">Primary Use Case *</Label>
                  <Select
                    required
                    value={fromData.values.useCase}
                    onValueChange={(val) =>
                      fromData.setFieldValue("useCase", val)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="What are you most interested in?" />
                    </SelectTrigger>
                    <SelectContent>
                      {useCases.map((useCase, index) => (
                        <SelectItem key={index} value={useCase}>
                          {useCase}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Additional Info */}
                <div className="space-y-2 w-full">
                  <Label htmlFor="additionalInfo">Additional Information</Label>
                  <Textarea
                    id="additionalInfo"
                    placeholder="Tell us about your current setup and what you'd like to see in the demo..."
                    rows={3}
                    {...fromData.getInputProps("additionalInfo")}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-rateup-blue text-white hover:shadow-lg transition-all"
                  disabled={isPending}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {isPending ? "Booking..." : "Book My Demo"}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By booking a demo, you agree to our Terms of Service and
                  Privacy Policy. You can unsubscribe at any time.
                </p>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
