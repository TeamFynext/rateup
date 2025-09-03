"use client";

import React, { useState } from "react";

import {
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";

import "react-phone-number-input/style.css";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { useBookDemoMutation } from "@/backend/bookdemo/bookdemo.query";

export function BookDemoModal() {
  const [opened, setOpened] = useState(false);
  const { mutate, isPending, isSuccess, error, reset } = useBookDemoMutation();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    reason: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    mutate(formData, {
      onSuccess: () => {
        setFormData({
          name: "",
          phone: "",
          email: "",
          reason: "",
        });

        setTimeout(() => {
          setOpened(false);
          reset();
        }, 2000);
      },
    });
  };

  const isEmailValid = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isFormValid =
    formData.name.trim().length > 0 &&
    isValidPhoneNumber(formData.phone) &&
    isEmailValid(formData.email) &&
    formData.reason.trim().length > 0;

  return (
    <>
      <button
        onClick={() => {
          setOpened(true);
          reset();
        }}
        className="text-white px-6 cursor-pointer sm:px-7 py-2.5
                 text-base sm:text-lg font-semibold rounded-md bg-gradient-to-r from-[#00397b]
                  via-[#1c518e] to-[#3f5ba9] hover:opacity-90"
        aria-label="Book a Demo"
      >
        Book a Demo
      </button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          <span className="text-lg sm:text-xl font-semibold text-gray-800">
            Book a Demo
          </span>
        }
        centered
        radius="lg"
      >
        <Stack>
          {isSuccess && (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-700">
                Your demo request has been submitted successfully 🎉
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-red-700">
                {(error as any)?.response?.data?.message ||
                  "Something went wrong, please try again."}
              </p>
            </div>
          )}

          <TextInput
            label="Name"
            placeholder="Your full name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.currentTarget.value)}
            required
          />

          <div>
            <label className="text-sm font-medium mb-1 block">
              What is your phone number? <span className="text-red-500">*</span>
            </label>
            <PhoneInput
              defaultCountry="IN"
              international
              countryCallingCodeEditable={false}
              value={formData.phone}
              onChange={(value) => handleChange("phone", value || "")}
              placeholder="Enter phone number"
              className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004F98]"
            />
          </div>

          <TextInput
            label="Email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => handleChange("email", e.currentTarget.value)}
            required
          />

          <Textarea
            label="Reason to Contact"
            placeholder="What brings you here today? We're here to help with any inquiries, support, or feedback you might have."
            value={formData.reason}
            onChange={(e) => handleChange("reason", e.currentTarget.value)}
            autosize
            minRows={3}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isPending}
              loading={isPending}
            >
              Submit
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
