"use client";

import { Button, Card, Select, Text, Title } from "@mantine/core";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";

import "react-phone-number-input/style.css";

export default function OnboardingStep3({
  onBack,
  onFinish,
  data,
  setData,
  loading,
}: {
  onBack: () => void;
  onFinish: () => void;
  data: any;
  setData: (data: any) => void;
  loading: boolean;
}) {
  const isValid = data.role !== "" && isValidPhoneNumber(data.phone);

  return (
    <div className="max-w-xl mx-auto">
      <Card
        radius="lg"
        shadow="sm"
        styles={{
          root: {
            backgroundColor: "#FFFFFF",
            padding: "32px",
            border: "1px solid #E5E5E5",
          },
        }}
      >
        {/* Step indicator */}
        <div className="mb-6">
          <div className="h-1 bg-[#F5F5F5] rounded-full w-full">
            <div className="h-1 bg-[#004F98] rounded-full w-full" />
          </div>
          <Text size="sm" mt="xs" c="dimmed">
            Step 3 of 3
          </Text>
        </div>

        {/* Title */}
        <Title order={3} mb="sm" c="#004F98">
          Last step, let’s set up your profile
        </Title>
        <Text size="sm" c="dimmed" mb="lg">
          Complete your details so we can personalize your experience.
        </Text>

        {/* Role */}
        <Select
          label={<>What is your role at your organization?</>}
          placeholder="Choose one"
          required
          data={[
            "Founder",
            "Manager",
            "Marketer",
            "Support",
            "Developer",
            "Other",
          ]}
          value={data.role}
          onChange={(value) => setData({ ...data, role: value || "" })}
          styles={{
            input: { borderColor: "#E5E5E5" },
          }}
        />

        {/* Phone */}
        <div className="mt-4">
          <label className="text-sm font-medium mb-1 block">
            What is your phone number? <span className="text-red-500">*</span>
          </label>
          <PhoneInput
            defaultCountry="IN"
            international
            countryCallingCodeEditable={false}
            value={data.phone}
            onChange={(val) => setData({ ...data, phone: val || "" })}
            placeholder="Enter phone number"
            className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004F98]"
          />
          <Text size="xs" c="dimmed" mt={4} className="text-gray-500">
            🔒 We won’t share your phone number with anyone.
          </Text>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={onBack}
            className="w-full sm:w-auto"
            styles={{
              root: {
                borderColor: "#E5E5E5",
                color: "#004F98",
                "&:hover": { backgroundColor: "#F5F5F5" },
              },
            }}
          >
            ← Back
          </Button>
          <Button
            onClick={onFinish}
            disabled={!isValid || loading}
            className="w-full sm:w-auto"
            styles={{
              root: {
                backgroundColor: isValid ? "#004F98" : "#E5E5E5",
                color: "white",
                "&:hover": { backgroundColor: isValid ? "#003B73" : "#E5E5E5" },
              },
            }}
            loading={loading}
          >
            Get started →
          </Button>
        </div>
      </Card>
    </div>
  );
}
