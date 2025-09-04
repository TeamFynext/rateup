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
  const toggleReason = (value: string) => {
    const updatedReasons = data.reasons.includes(value)
      ? data.reasons.filter((r) => r !== value)
      : [...data.reasons, value];
    setData({ ...data, reasons: updatedReasons });
  };

  const isValid = data.reasons.length > 0 && data.storage !== "";

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

        {/* Reasons */}
        <div className="mb-6">
          <Text size="sm" fw={500} mb={8}>
            Why do you chat with customers?{" "}
            <span className="text-red-500">*</span>
          </Text>
          <div className="space-y-2">
            {[
              "Assist with online checkout",
              "Booking appointments",
              "Sending quotations",
              "Booking a free or trial class",
              "Customer support",
              "Receive payment",
              "Sending bulk broadcasts",
              "Others",
            ].map((item) => (
              <Checkbox
                key={item}
                label={item}
                checked={data.reasons.includes(item)}
                onChange={() => toggleReason(item)}
                styles={{
                  input: { borderColor: "#E5E5E5" },
                  label: { color: "#000" },
                }}
              />
            ))}
          </div>
        </div>

        {/* Storage */}
        <div>
          <Text size="sm" fw={500} mb={8}>
            How do you store customer data?{" "}
            <span className="text-red-500">*</span>
          </Text>
          <Radio.Group
            value={data.storage}
            onChange={(val) => setData({ ...data, storage: val })}
          >
            <div className="space-y-2">
              {[
                "HubSpot",
                "Salesforce",
                "Shopify",
                "Others",
                "We don't use any tools to store customer data",
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
            </div>
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
