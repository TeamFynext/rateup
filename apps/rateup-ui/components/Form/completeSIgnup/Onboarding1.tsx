"use client";

import { Button, Card, Select, Text, TextInput, Title } from "@mantine/core";
import { CountryDropdown } from "react-country-region-selector";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";

import "react-phone-number-input/style.css";

export default function OnboardingStep1({
  onNext,
  data,
  setData,
  userName,
}: {
  data: any;
  setData: (fn: (prev: any) => any) => void;
  onNext: () => void;
  userName: string;
}) {
  const isValid =
    data.orgName.trim() !== "" &&
    data.business_type.trim() !== "" &&
    data.role.trim() !== "" &&
    data.country.trim() !== "" &&
    isValidPhoneNumber(data.phone);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 md:px-8 lg:px-0">
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
            <div className="h-1 bg-[#004F98] rounded-full w-1/3" />
          </div>
          <Text size="sm" mt="xs" c="dimmed">
            Step 1 of 3
          </Text>
        </div>

        {/* Greeting */}
        <div className="mb-6 text-center md:text-left">
          <Title
            order={2}
            style={{
              color: "#004F98",
              fontWeight: 700,
              fontSize: "1.5rem",
              marginBottom: "0.5rem",
            }}
          >
            Welcome, <span className="text-black">{userName}</span> 👋
          </Title>
          <Text size="md" style={{ color: "#4B5563", fontSize: "1rem" }}>
            Let’s set up your workspace to get started.
          </Text>
        </div>

        {/* Business name */}
        <TextInput
          label="Business name"
          placeholder="Enter your business name"
          required
          value={data.orgName}
          onChange={(e) =>
            setData((prev) => ({ ...prev, orgName: e.currentTarget.value }))
          }
          styles={{ input: { borderColor: "#E5E5E5" } }}
        />

        {/* Industry */}
        <Select
          mt="md"
          label="Business Type"
          placeholder="Choose one"
          required
          data={[
            "E-Commerce/Retail",
            "SaaS/Technology",
            "Financial Services",
            "Healthcare",
            "Education",
            "Hospitality/Travel",
            "Professional Services",
            "Manufacturing",
            "Other",
          ]}
          value={data.business_type}
          onChange={(value) =>
            setData((prev) => ({ ...prev, business_type: value || "" }))
          }
          styles={{ input: { borderColor: "#E5E5E5" } }}
        />
        {/* Country */}
        <div className="mt-4">
          <label className="text-sm font-medium mb-1 block">
            Country <span className="text-red-500">*</span>
          </label>
          <CountryDropdown
            value={data.country}
            onChange={(val) =>
              setData((prev) => ({ ...prev, country: val || "" }))
            }
            className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004F98]"
          />
        </div>

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
        </div>

        {/* Role */}
        <Select
          mt="md"
          label="What is your role at your organization?"
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
          styles={{ input: { borderColor: "#E5E5E5" } }}
        />

        {/* Website */}
        <TextInput
          mt="md"
          label="Website"
          placeholder="Enter your website (optional)"
          value={data.website}
          onChange={(e) =>
            setData((prev) => ({ ...prev, website: e.currentTarget.value }))
          }
          styles={{ input: { borderColor: "#E5E5E5" } }}
        />

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mt-8">
          <Button
            onClick={onNext}
            disabled={!isValid}
            className="w-full sm:w-auto"
            styles={{
              root: {
                backgroundColor: isValid ? "#004F98" : "#E5E5E5",
                color: "white",
                "&:hover": {
                  backgroundColor: isValid ? "#003B73" : "#E5E5E5",
                },
              },
            }}
          >
            Next →
          </Button>
        </div>
      </Card>
    </div>
  );
}
