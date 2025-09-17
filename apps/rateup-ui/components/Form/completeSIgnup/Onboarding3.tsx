"use client";

import {
  Button,
  Card,
  Checkbox,
  Select,
  Text,
  Textarea,
  Title,
} from "@mantine/core";

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
  const toggleAutomation = (value: string) => {
    const updated = data.what_do_you_want_to_automate_first.includes(value)
      ? data.what_do_you_want_to_automate_first.filter(
          (r: string) => r !== value,
        )
      : [...data.what_do_you_want_to_automate_first, value];

    setData({ ...data, what_do_you_want_to_automate_first: updated });
  };

  const isValid =
    data.what_do_you_want_to_automate_first.length > 0 &&
    data.how_did_you_hear_about_rateup.trim() !== "";

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

        {/* Automation Needs */}
        <div className="mt-6 mb-6">
          <Text size="sm" fw={500} mb={8}>
            What do you want to automate first{" "}
            <span className="text-red-500">*</span>
          </Text>
          <div className="space-y-2">
            {[
              "Lead qualification and follow-up",
              "Customer support responses",
              "Order updates and tracking",
              "Collecting customer feedback/reviews",
              "Product recommendations",
            ].map((item) => (
              <Checkbox
                key={item}
                label={item}
                checked={data.what_do_you_want_to_automate_first.includes(item)}
                onChange={() => toggleAutomation(item)}
                styles={{
                  input: { borderColor: "#E5E5E5" },
                  label: { color: "#000" },
                }}
              />
            ))}
          </div>
        </div>

        {/* Source */}
        <Select
          label="How did you hear about RateUp?"
          placeholder="Choose one"
          required
          data={[
            "Google Search",
            "Social media",
            "Referral",
            "Advertisement",
            "Other",
          ]}
          value={data.how_did_you_hear_about_rateup}
          onChange={(value) =>
            setData({ ...data, how_did_you_hear_about_rateup: value || "" })
          }
          styles={{
            input: { borderColor: "#E5E5E5" },
          }}
        />

        {/* Extra Features */}
        <Textarea
          mt="md"
          label="Need help with onboarding, have a specific use case, or require custom features? Let us know below"
          placeholder="Write here (optional)"
          value={data.specific_feature_or_custom_feature}
          onChange={(e) =>
            setData({
              ...data,
              specific_feature_or_custom_feature: e.currentTarget.value,
            })
          }
          autosize
          minRows={3}
          styles={{
            input: { borderColor: "#E5E5E5" },
          }}
        />

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
