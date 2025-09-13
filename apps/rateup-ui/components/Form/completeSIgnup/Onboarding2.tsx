"use client";

import { Button, Card, Checkbox, Radio, Text, Title } from "@mantine/core";

export default function OnboardingStep2({
  onNext,
  onBack,
  data,
  setData,
}: {
  onNext: () => void;
  onBack: () => void;
  data: any;
  setData: (data: any) => void;
}) {
  const isValid =
    data.team_size &&
    data.which_platforms_do_you_actively_use &&
    data.do_you_currently_use_any_tools_for_engagement &&
    data.interest_in_whatsapp_loyality_or_web_surveys;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6">
      <Card
        radius="lg"
        shadow="sm"
        styles={{
          root: {
            backgroundColor: "#FFFFFF",
            padding: "24px",
            border: "1px solid #E5E5E5",
          },
        }}
      >
        {/* Step indicator */}
        <div className="mb-6">
          <div className="h-1 bg-[#F5F5F5] rounded-full w-full">
            <div className="h-1 bg-[#004F98] rounded-full w-2/3" />
          </div>
          <Text size="sm" mt="xs" c="dimmed">
            Step 2 of 3
          </Text>
        </div>

        {/* Title + subtitle */}
        <Title order={3} mb="sm" className="text-[#004F98] text-lg sm:text-xl">
          Let’s create the best experience for you
        </Title>
        <Text size="sm" c="dimmed" mb="lg" className="text-gray-600">
          Choose the options that best describe your business needs.
        </Text>

        {/* Team Size */}
        <div className="mt-6">
          <Text size="sm" fw={500} mb={8}>
            Team Size <span className="text-red-500">*</span>
          </Text>
          <Radio.Group
            value={data.team_size}
            onChange={(val) => setData({ ...data, team_size: val })}
          >
            {[
              "Just me (1 Person)",
              "Small Team (2-10 people)",
              "Larger Team (10+ people)",
            ].map((size) => (
              <Radio
                key={size}
                value={size}
                label={size}
                styles={{
                  radio: { borderColor: "#E5E5E5" },
                  label: { color: "#000" },
                }}
              />
            ))}
          </Radio.Group>
        </div>

        {/* Platforms */}
        <div className="mt-6">
          <Text size="sm" fw={500} mb={8}>
            Which platforms do you actively use?{" "}
            <span className="text-red-500">*</span>
          </Text>
          <Radio.Group
            value={data.which_platforms_do_you_actively_use}
            onChange={(val) =>
              setData({ ...data, which_platforms_do_you_actively_use: val })
            }
          >
            {[
              "WhatsApp Business",
              "Instagram Business/Creator Account",
              "Facebook Page",
              "None yet, but planning to start",
            ].map((item) => (
              <Radio
                key={item}
                value={item}
                label={item}
                styles={{
                  radio: { borderColor: "#E5E5E5" },
                  label: { color: "#000" },
                }}
              />
            ))}
          </Radio.Group>
        </div>

        {/* Engagement Tools */}
        <div className="mt-6">
          <Text size="sm" fw={500} mb={8}>
            Do you currently use any tools for engagement?{" "}
            <span className="text-red-500">*</span>
          </Text>
          <Radio.Group
            value={data.do_you_currently_use_any_tools_for_engagement}
            onChange={(val) =>
              setData({
                ...data,
                do_you_currently_use_any_tools_for_engagement: val,
              })
            }
          >
            {[
              "WhatsApp Business App",
              "CRM (Zoho, HubSpot, Salesforce, etc.)",
              "Loyality App",
              "Others",
              "None",
            ].map((item) => (
              <Radio
                key={item}
                value={item}
                label={item}
                styles={{
                  radio: { borderColor: "#E5E5E5" },
                  label: { color: "#000" },
                }}
              />
            ))}
          </Radio.Group>
        </div>

        {/* Loyalty/Survey Interest */}
        <div>
          <Text size="sm" fw={500} mb={8}>
            Are you interested in WhatsApp Loyalty, Web Survey Programs for your
            Business <span className="text-red-500">*</span>
          </Text>
          <Radio.Group
            value={data.interest_in_whatsapp_loyality_or_web_surveys}
            onChange={(val) =>
              setData({
                ...data,
                interest_in_whatsapp_loyality_or_web_surveys: val,
              })
            }
          >
            {["Yes", "No"].map((item) => (
              <Radio
                key={item}
                value={item}
                label={item}
                styles={{
                  radio: { borderColor: "#E5E5E5" },
                  label: { color: "#000" },
                }}
              />
            ))}
          </Radio.Group>
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
            onClick={onNext}
            disabled={!isValid}
            className="w-full sm:w-auto"
            styles={{
              root: {
                backgroundColor: isValid ? "#004F98" : "#E5E5E5",
                color: "white",
                "&:hover": { backgroundColor: isValid ? "#003B73" : "#E5E5E5" },
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
